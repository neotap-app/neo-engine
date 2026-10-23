import fs from 'node:fs';
import path from 'node:path';

import { build } from 'vite';

import { normalizeH5Base } from '../base';
import { createTempDir, resolveEntry } from '../common';
import type { TargetBuildOptions } from '../types';

const BOOTSTRAP_DIR = '.neo-build';
const BOOTSTRAP_HTML = 'index.html';
const BOOTSTRAP_TS = 'h5-bootstrap.ts';

export async function buildH5(options: TargetBuildOptions): Promise<void> {
  const { cwd, manifest, outDir } = options;
  const base = normalizeH5Base(options.base);
  const entryAbs = resolveEntry(manifest, cwd);
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

  const bootstrap = [
    `import { createH5Capabilities, createRuntime } from '@neotap.app/neo-engine';`,
    `import entry from ${JSON.stringify(entryAbs)};`,
    ``,
    `const mount = document.getElementById('game');`,
    `if (!mount) {`,
    `  throw new Error('missing #game mount element');`,
    `}`,
    ``,
    `const runtime = createRuntime();`,
    `const capabilities = createH5Capabilities();`,
    ``,
    `void runtime.mount({`,
    `  mount: { element: mount },`,
    `  capabilities,`,
    `  loadInstance: async () => entry,`,
    `});`,
    ``,
  ].join('\n');

  fs.writeFileSync(path.join(temp.dir, BOOTSTRAP_HTML), html);
  fs.writeFileSync(path.join(temp.dir, BOOTSTRAP_TS), bootstrap);

  try {
    await build({
      root: temp.dir,
      base,
      logLevel: 'warn',
      build: {
        outDir: path.resolve(cwd, outDir),
        emptyOutDir: true,
      },
    });
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
