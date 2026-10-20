export interface ServeArgs {
  port: number;
  host: string;
}

export const DEFAULT_PORT = 5173;
export const DEFAULT_HOST = 'localhost';

export function parseServeArgs(argv: string[], defaults: Partial<ServeArgs> = {}): ServeArgs {
  let port = defaults.port ?? DEFAULT_PORT;
  let host = defaults.host ?? DEFAULT_HOST;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--port=')) {
      port = parsePort(arg.slice('--port='.length));
    } else if (arg === '--port' || arg === '-p') {
      const value = argv[i + 1];
      if (value === undefined) {
        throw new Error('--port requires a value');
      }
      port = parsePort(value);
      i++;
    } else if (arg.startsWith('--host=')) {
      host = parseHost(arg.slice('--host='.length));
    } else if (arg === '--host') {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('-')) {
        host = '0.0.0.0';
      } else {
        host = parseHost(value);
        i++;
      }
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  return { port, host };
}

function parsePort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`invalid port: ${value} (expected an integer between 1 and 65535)`);
  }
  return port;
}

function parseHost(value: string): string {
  if (value === '') {
    throw new Error('--host requires a value');
  }
  return value;
}
