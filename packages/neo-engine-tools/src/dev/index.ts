import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { createServer } from 'vite';
import type { ViteDevServer } from 'vite';

import { readManifest, resolveEntry } from '../build/common';

const DEV_DIR = '.neo-dev';
const BOOTSTRAP_HTML = 'index.html';
const BOOTSTRAP_TS = 'dev-bootstrap.ts';

export interface DevServerOptions {
  cwd: string;
  port?: number;
  host?: string;
}

export interface DevServerHandle {
  url: string;
  server: ViteDevServer;
  close(): Promise<void>;
  dispose(): void;
}

export async function startDevServer(options: DevServerOptions): Promise<DevServerHandle> {
  const cwd = path.resolve(options.cwd);
  const manifest = readManifest(cwd);
  const entryAbs = resolveEntry(manifest, cwd);
  if (!fs.existsSync(entryAbs)) {
    throw new Error(`entry not found: ${manifest.effectiveEntry} (expected at ${entryAbs})`);
  }

  const dir = path.join(cwd, DEV_DIR, `${process.pid}-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  pruneStaleDevDirs(cwd, dir);
  const dispose = () => disposeDevDir(dir);

  const entrySpecifier = toImportSpecifier(entryAbs);

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
    `  <script type="module" src="./${BOOTSTRAP_TS}"></script>`,
    `</body>`,
    `</html>`,
    ``,
  ].join('\n');

  const bootstrap = [
    `import { createH5Capabilities, createRuntime } from '@neotap.app/neo-engine';`,
    `import entry from ${JSON.stringify(entrySpecifier)};`,
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

  fs.writeFileSync(path.join(dir, BOOTSTRAP_HTML), html);
  fs.writeFileSync(path.join(dir, BOOTSTRAP_TS), bootstrap);

  const sdkEntry = resolveSdkEntry();
  const allowed = new Set<string>([cwd, ...findWorkspaceRoots(cwd)]);
  if (sdkEntry) {
    for (const root of findWorkspaceRoots(path.dirname(sdkEntry))) {
      allowed.add(root);
    }
  }

  const server = await createServer({
    root: dir,
    configFile: false,
    logLevel: 'warn',
    server: {
      host: options.host ?? 'localhost',
      port: options.port ?? 5173,
      strictPort: false,
      fs: {
        allow: [...allowed],
      },
    },
    resolve: {
      alias: sdkEntry ? { '@neotap.app/neo-engine': sdkEntry } : {},
    },
  });

  try {
    await server.listen();
  } catch (err) {
    dispose();
    await server.close();
    throw err;
  }

  watchProjectSources(server, cwd, entryAbs);

  const url = server.resolvedUrls?.local[0] ?? `http://${options.host ?? 'localhost'}:${options.port ?? 5173}/`;

  return {
    url,
    server,
    async close() {
      try {
        await server.close();
      } finally {
        dispose();
      }
    },
    dispose,
  };
}

function watchProjectSources(server: ViteDevServer, cwd: string, entryAbs: string): void {
  const roots = new Set<string>([path.dirname(entryAbs)]);
  const srcDir = path.join(cwd, 'src');
  if (fs.existsSync(srcDir)) {
    roots.add(srcDir);
  }
  for (const root of roots) {
    server.watcher.add(root);
  }
}

function resolveSdkEntry(): string | undefined {
  const anchor = process.argv[1] ?? path.join(process.cwd(), '__neo_dev_resolve__.js');
  try {
    const requireFromAnchor = createRequire(path.resolve(anchor));
    const pkgPath = requireFromAnchor.resolve('@neotap.app/neo-engine/package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
      exports?: Record<string, string | { import?: string; default?: string }>;
      module?: string;
      main?: string;
    };
    const entry = pkg.exports?.['.'];
    const relative = typeof entry === 'string' ? entry : entry?.import ?? entry?.default;
    if (relative) {
      return path.resolve(path.dirname(pkgPath), relative);
    }
    if (pkg.module ?? pkg.main) {
      return path.resolve(path.dirname(pkgPath), (pkg.module ?? pkg.main) as string);
    }
  } catch {
    // Fall back to resolution from the game project.
  }
  return undefined;
}

function findWorkspaceRoots(start: string): string[] {
  const roots: string[] = [];
  let current = path.resolve(start);
  while (true) {
    if (
      fs.existsSync(path.join(current, 'pnpm-workspace.yaml')) ||
      fs.existsSync(path.join(current, 'lerna.json')) ||
      fs.existsSync(path.join(current, 'rush.json'))
    ) {
      roots.push(current);
      break;
    }
    const packageJson = path.join(current, 'package.json');
    if (fs.existsSync(packageJson)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf-8')) as { workspaces?: unknown };
        if (pkg.workspaces !== undefined) {
          roots.push(current);
          break;
        }
      } catch {
        // Ignore malformed package.json and keep walking up.
      }
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return roots;
}

function pruneStaleDevDirs(cwd: string, keepDir: string): void {
  const base = path.join(cwd, DEV_DIR);
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(base, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const full = path.join(base, entry.name);
    if (full === keepDir) {
      continue;
    }
    const pid = Number(entry.name.split('-')[0]);
    if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) {
      continue;
    }
    if (!isProcessAlive(pid)) {
      fs.rmSync(full, { recursive: true, force: true });
    }
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function disposeDevDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
  try {
    fs.rmdirSync(path.dirname(dir));
  } catch {
    // Parent still contains other active dev sessions.
  }
}

function toImportSpecifier(file: string): string {
  return file.replace(/\\/g, '/');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
