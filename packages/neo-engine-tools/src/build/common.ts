import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { NeoManifest, NEO_ENGINE_RUNTIME_PREFIX } from '@neotap.app/neo-engine';

export const MANIFEST_FILE = 'package.neo.json';
export const DEFAULT_ENTRY = 'src/index.ts';

const ENGINE_PACKAGE = '@neotap.app/neo-engine';

let installedEngineVersion: string | null = null;

export function readInstalledEngineVersion(): string {
  if (installedEngineVersion !== null) {
    return installedEngineVersion;
  }
  const requireFromHere = createRequire(
    typeof __filename === 'string' ? __filename : import.meta.url,
  );
  const pkg = requireFromHere(`${ENGINE_PACKAGE}/package.json`) as { version?: unknown };
  if (typeof pkg.version !== 'string' || pkg.version.length === 0) {
    throw new Error(`cannot determine installed version of ${ENGINE_PACKAGE} from its package.json`);
  }
  installedEngineVersion = pkg.version;
  return installedEngineVersion;
}

export function assertEngineVersion(manifest: NeoManifest, manifestPath: string): void {
  const runtime = manifest.runtime;
  if (!runtime) {
    throw new Error(
      `${manifestPath}: manifest.engine must start with "${NEO_ENGINE_RUNTIME_PREFIX}", got "${manifest.engine}"`,
    );
  }
  const installed = readInstalledEngineVersion();
  if (runtime.version !== installed) {
    throw new Error(
      `engine version mismatch in ${manifestPath}: manifest declares "${manifest.engine}" ` +
        `but installed ${ENGINE_PACKAGE} is "${installed}". ` +
        `Set "engine" to "${NEO_ENGINE_RUNTIME_PREFIX}${installed}".`,
    );
  }
}

export function readManifest(cwd: string): NeoManifest {
  const manifestPath = path.join(cwd, MANIFEST_FILE);
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`missing ${MANIFEST_FILE} in ${cwd}`);
  }
  const manifest = NeoManifest.parse(fs.readFileSync(manifestPath, 'utf-8'));
  assertEngineVersion(manifest, manifestPath);
  return manifest;
}

export function resolveEntry(manifest: NeoManifest, cwd: string): string {
  return path.resolve(cwd, manifest.effectiveEntry);
}

export interface TempDir {
  dir: string;
  dispose(): void;
}

export function createTempDir(cwd: string, name: string): TempDir {
  const base = path.join(cwd, name);
  fs.mkdirSync(base, { recursive: true });
  pruneStaleTempDirs(base);

  const dir = path.join(base, `${process.pid}-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return {
    dir,
    dispose() {
      fs.rmSync(dir, { recursive: true, force: true });
      try {
        fs.rmdirSync(base);
      } catch {
        // Another build is still using the same temp root.
      }
    },
  };
}

export function prepareOutputDir(cwd: string, outDir: string): string {
  const cwdAbs = path.resolve(cwd);
  const outAbs = path.resolve(cwd, outDir);
  const relative = path.relative(outAbs, cwdAbs);
  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    throw new Error(`refusing to clean output directory ${outAbs}: it contains the project root`);
  }
  fs.rmSync(outAbs, { recursive: true, force: true });
  fs.mkdirSync(outAbs, { recursive: true });
  return outAbs;
}

function pruneStaleTempDirs(base: string): void {
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
    const pid = Number(entry.name.split('-')[0]);
    if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) {
      continue;
    }
    if (!isProcessAlive(pid)) {
      fs.rmSync(path.join(base, entry.name), { recursive: true, force: true });
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
