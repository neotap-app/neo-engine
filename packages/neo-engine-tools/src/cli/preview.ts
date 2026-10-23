import path from 'node:path';

import { startPreviewServer } from '../preview';
import { parseServeArgs } from './serve-args';

export interface PreviewCLIOptions {
  port?: number;
  host?: string;
  outDir: string;
}

export function parsePreviewArgs(argv: string[]): PreviewCLIOptions {
  const serve: string[] = [];
  let outDir = 'dist';

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--outDir=')) {
      const value = arg.slice('--outDir='.length);
      if (value === '') {
        throw new Error('--outDir requires a value');
      }
      outDir = value;
    } else if (arg === '--outDir' || arg === '-o') {
      const value = argv[i + 1];
      if (value === undefined) {
        throw new Error('--outDir requires a value');
      }
      outDir = value;
      i++;
    } else {
      serve.push(arg);
    }
  }

  const { port, host } = parseServeArgs(serve, { port: 4173 });
  return { port, host, outDir };
}

export async function previewProjectCLI(cwd: string, argv: string[]): Promise<void> {
  const args = parsePreviewArgs(argv);
  const handle = await startPreviewServer({
    cwd: path.resolve(cwd),
    outDir: args.outDir,
    port: args.port,
    host: args.host,
  });

  process.stdout.write(`neo preview listening at ${handle.url}\n`);

  let closing = false;
  const shutdown = async () => {
    if (closing) {
      return;
    }
    closing = true;
    try {
      await handle.close();
    } finally {
      process.exit(0);
    }
  };

  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
  process.once('SIGBREAK', () => void shutdown());
  process.once('SIGHUP', () => void shutdown());
}
