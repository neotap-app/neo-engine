import path from 'node:path';

import { buildProject } from '../build';
import type { Target } from '../build';

export interface ParsedBuildOptions {
  target: Target;
  outDir: string;
}

export function parseBuildArgs(argv: string[]): ParsedBuildOptions {
  let target: Target = 'h5';
  let outDir = 'dist';

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--target=')) {
      target = parseTarget(arg.slice('--target='.length));
    } else if (arg === '--target') {
      const value = argv[i + 1];
      if (value === undefined) {
        throw new Error('--target requires a value (h5 | wechat | douyin)');
      }
      target = parseTarget(value);
      i++;
    } else if (arg.startsWith('--outDir=')) {
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
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  return { target, outDir };
}

function parseTarget(value: string): Target {
  if (value === 'h5' || value === 'wechat' || value === 'douyin') {
    return value;
  }
  throw new Error(`unknown target: ${value} (expected h5 | wechat | douyin)`);
}

export async function buildProjectCLI(cwd: string, argv: string[]): Promise<void> {
  const args = parseBuildArgs(argv);
  await buildProject({
    cwd: path.resolve(cwd),
    target: args.target,
    outDir: args.outDir,
  });
}
