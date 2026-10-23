import fs from 'node:fs';
import path from 'node:path';

import { build } from 'vite';

import { copyAssets } from '../assets';
import { createTempDir, resolveEntry } from '../common';
import type { TargetBuildOptions } from '../types';

export interface MinigameTargetInfo {
  namespace: 'wx' | 'tt';
  projectConfig: {
    appid?: string;
    compileType: string;
    libVersion: string;
    setting: Record<string, unknown>;
  };
}

export interface MinigameGameConfig {
  deviceOrientation: string;
  showStatusBar: boolean;
  networkTimeout?: Record<string, number>;
  subpackages?: Array<{ name: string; root: string }>;
}

const BOOTSTRAP_DIR = '.neo-build';
const ADAPTER_ENTRY = 'adapter.ts';
const GAME_ENTRY = 'game.ts';

export async function buildMinigame(
  options: TargetBuildOptions,
  info: MinigameTargetInfo,
  gameConfig: MinigameGameConfig,
): Promise<void> {
  const { cwd, manifest, outDir } = options;
  const entryAbs = resolveEntry(manifest, cwd);
  const outAbs = path.resolve(cwd, outDir);
  const temp = createTempDir(cwd, BOOTSTRAP_DIR);

  const adapterEntry = path.join(temp.dir, ADAPTER_ENTRY);
  fs.writeFileSync(
    adapterEntry,
    [
      `import { createMinigameRuntimeEnvironment } from '@neotap.app/neo-engine';`,
      `import type { MinigameAPI } from '@neotap.app/neo-engine';`,
      ``,
      `export function installMinigame(api: MinigameAPI) {`,
      `  return createMinigameRuntimeEnvironment(api);`,
      `}`,
      ``,
    ].join('\n'),
  );

  const gameEntry = path.join(temp.dir, GAME_ENTRY);
  fs.writeFileSync(
    gameEntry,
    [
      `import { createRuntime, NeoManifest } from '@neotap.app/neo-engine';`,
      `export { createRuntime, NeoManifest };`,
      `export { default } from ${JSON.stringify(entryAbs)};`,
      ``,
    ].join('\n'),
  );

  try {
    await build({
      root: temp.dir,
      logLevel: 'warn',
      build: {
        outDir: path.join(outAbs, 'neotap-runtime'),
        lib: {
          entry: adapterEntry,
          formats: ['cjs'],
          fileName: () => 'adapter.js',
        },
      },
    });

    await build({
      root: temp.dir,
      logLevel: 'warn',
      build: {
        outDir: outAbs,
        emptyOutDir: false,
        lib: {
          entry: gameEntry,
          formats: ['cjs'],
          fileName: () => 'game-core.js',
        },
      },
    });

    const manifestLiteral = JSON.stringify(manifest.toJSON());

    const gameJs = [
      `// Neo Engine minigame entry (${info.namespace})`,
      `// Install DOM shim adapter BEFORE any engine/game code evaluates`,
      `var runtime = require('./neotap-runtime/adapter.js');`,
      `var detected = (typeof ${info.namespace} !== 'undefined') ? ${info.namespace} : null;`,
      `if (!detected) {`,
      `  throw new Error('${info.namespace} runtime not found');`,
      `}`,
      `var env = runtime.installMinigame(detected);`,
      `var core = require('./game-core.js');`,
      ``,
      `var manifest = core.NeoManifest.fromObject(${manifestLiteral});`,
      `var rt = core.createRuntime();`,
      `rt.mount({`,
      `  mount: { element: env.canvas },`,
      `  capabilities: env.capabilities,`,
      `  canvas: env.canvas,`,
      `  manifest: manifest,`,
      `  loadInstance: function () { return Promise.resolve(core.default || core); },`,
      `}).catch(function (err) {`,
      `  console.error('[neo-engine] mount failed', err);`,
      `});`,
      ``,
    ].join('\n');
    fs.writeFileSync(path.join(outAbs, 'game.js'), gameJs);

    fs.writeFileSync(path.join(outAbs, 'game.json'), JSON.stringify(gameConfig, null, 2));
    fs.writeFileSync(
      path.join(outAbs, 'project.config.json'),
      JSON.stringify(
        {
          appid: info.projectConfig.appid ?? '',
          compileType: info.projectConfig.compileType,
          libVersion: info.projectConfig.libVersion,
          setting: info.projectConfig.setting,
          condition: {},
        },
        null,
        2,
      ),
    );

    copyAssets(cwd, outAbs);
  } finally {
    temp.dispose();
  }
}
