import fs from 'node:fs';
import path from 'node:path';

import { build } from 'vite';

import { copyAssets } from '../assets';
import { normalizeH5Base } from '../base';
import { neoErrorHandlerSource } from '../bootstrap';
import { createTempDir, resolveEntry } from '../common';
import { createThreeStub, detectGameMode } from '../mode';
import type { TargetBuildOptions } from '../types';

const BOOTSTRAP_DIR = '.neo-build';
const BOOTSTRAP_HTML = 'index.html';
const BOOTSTRAP_TS = 'h5-bootstrap.ts';

export async function buildH5(options: TargetBuildOptions): Promise<void> {
  const { cwd, manifest, outDir } = options;
  const base = normalizeH5Base(options.base);
  const entryAbs = resolveEntry(manifest, cwd);
  const outAbs = path.resolve(cwd, outDir);
  const mode = detectGameMode(cwd, entryAbs);
  const temp = createTempDir(cwd, BOOTSTRAP_DIR);

  const html = [
    `<!doctype html>`,
    `<html lang="zh-CN">`,
    `<head>`,
    `  <meta charset="UTF-8" />`,
    `  <meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
    `  <title>${escapeHtml(manifest.name)}</title>`,
    `  <style>html,body{margin:0;padding:0;height:100%;overflow:hidden;background:#000}#game{width:100%;height:100%}</style>`,
    `</head>`,
    `<body>`,
    `  <div id="game"></div>`,
    `  <script type="module" src="./h5-bootstrap.ts"></script>`,
    `</body>`,
    `</html>`,
    ``,
  ].join('\n');

  const manifestLiteral = JSON.stringify(manifest.toJSON());

  const bootstrap = [
    `import { createH5Capabilities, createRuntime, NeoManifest } from '@neotap.app/neo-engine';`,
    `import entry from ${JSON.stringify(entryAbs)};`,
    ``,
    `const manifest = NeoManifest.fromObject(${manifestLiteral});`,
    ``,
    `const mount = document.getElementById('game');`,
    `if (!mount) {`,
    `  throw new Error('missing #game mount element');`,
    `}`,
    ``,
    ...neoErrorHandlerSource({ mountExpression: 'mount' }),
    ``,
    `const runtime = createRuntime();`,
    `const capabilities = createH5Capabilities({`,
    `  manifest,`,
    `  resource: { baseUrl: import.meta.env.BASE_URL },`,
    `});`,
    ``,
    `runtime.mount({`,
    `  mount: { element: mount },`,
    `  createCanvas: function () { return document.createElement('canvas'); },`,
    `  capabilities,`,
    `  manifest,`,
    `  loadInstance: async () => entry,`,
    `}).catch(reportNeoError);`,
    ``,
  ].join('\n');

  try {
    const threeAlias = mode === '2d' ? createThreeStub(temp.dir) : null;
    fs.writeFileSync(path.join(temp.dir, BOOTSTRAP_HTML), html);
    fs.writeFileSync(path.join(temp.dir, BOOTSTRAP_TS), bootstrap);

    await build({
      root: temp.dir,
      base,
      logLevel: 'warn',
      resolve: threeAlias
        ? { alias: [{ find: /^three$/, replacement: threeAlias }] }
        : undefined,
      build: {
        outDir: outAbs,
        emptyOutDir: true,
      },
    });
    copyAssets(cwd, outAbs);
  } finally {
    temp.dispose();
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
