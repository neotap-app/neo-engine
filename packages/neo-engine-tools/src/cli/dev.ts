import path from 'node:path';

import { startDevServer } from '../dev';
import { parseServeArgs } from './serve-args';

export async function devProjectCLI(cwd: string, argv: string[]): Promise<void> {
  const args = parseServeArgs(argv);
  const handle = await startDevServer({
    cwd: path.resolve(cwd),
    port: args.port,
    host: args.host,
  });

  process.stdout.write(`neo dev listening at ${handle.url}\n`);

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
  process.once('exit', () => handle.dispose());
}
