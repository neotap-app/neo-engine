import fs from 'node:fs';
import path from 'node:path';

import { preview } from 'vite';
import type { PreviewServer } from 'vite';

export interface PreviewServerOptions {
  cwd: string;
  outDir?: string;
  port?: number;
  host?: string;
}

export interface PreviewServerHandle {
  url: string;
  server: PreviewServer;
  close(): Promise<void>;
}

export async function startPreviewServer(options: PreviewServerOptions): Promise<PreviewServerHandle> {
  const cwd = path.resolve(options.cwd);
  const outDir = options.outDir ?? 'dist';
  const outAbs = path.resolve(cwd, outDir);
  const indexPath = path.join(outAbs, 'index.html');

  if (!fs.existsSync(indexPath)) {
    throw new Error(
      `H5 build output not found: ${indexPath} (run "neo build --target h5 --outDir ${outDir}" first)`,
    );
  }

  const server = await preview({
    root: cwd,
    configFile: false,
    logLevel: 'warn',
    build: {
      outDir: outAbs,
    },
    preview: {
      host: options.host ?? 'localhost',
      port: options.port ?? 4173,
      strictPort: false,
    },
  });

  const url = server.resolvedUrls?.local[0] ?? `http://${options.host ?? 'localhost'}:${options.port ?? 4173}/`;

  return {
    url,
    server,
    async close() {
      await server.close();
    },
  };
}
