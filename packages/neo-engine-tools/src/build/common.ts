import fs from 'node:fs';
import path from 'node:path';

import { NeoManifest } from '@neotap.app/neo-engine';

export const MANIFEST_FILE = 'package.neo.json';
export const DEFAULT_ENTRY = 'src/index.ts';

export function readManifest(cwd: string): NeoManifest {
  const manifestPath = path.join(cwd, MANIFEST_FILE);
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`missing ${MANIFEST_FILE} in ${cwd}`);
  }
  return NeoManifest.parse(fs.readFileSync(manifestPath, 'utf-8'));
}

export function resolveEntry(manifest: NeoManifest, cwd: string): string {
  return path.resolve(cwd, manifest.effectiveEntry);
}

export interface TempDir {
  dir: string;
  dispose(): void;
}

export function createTempDir(cwd: string, name: string): TempDir {
  const dir = path.join(cwd, `${name}-${process.pid}-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return {
    dir,
    dispose() {
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}
