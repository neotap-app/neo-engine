import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { ASSET_DIR } from '@neotap.app/neo-engine';

export const ASSET_MANIFEST_FILE = 'assets-manifest.json';
export const NEO_DIR = '.neo';
const ASSET_TYPES_FILE = 'assets.d.ts';

export interface AssetEntry {
  key: string;
  size: number;
  hash: string;
}

export interface AssetManifest {
  version: 1;
  assets: AssetEntry[];
}

export function collectAssets(cwd: string): AssetEntry[] {
  const source = path.join(cwd, ASSET_DIR);
  if (!fs.existsSync(source)) {
    return [];
  }
  const entries: AssetEntry[] = [];
  walkAssets(source, source, entries);
  entries.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return entries;
}

export function writeAssetManifest(cwd: string, outAbs: string): AssetManifest {
  const manifest = buildManifest(cwd);
  fs.mkdirSync(outAbs, { recursive: true });
  fs.writeFileSync(path.join(outAbs, ASSET_MANIFEST_FILE), serializeManifest(manifest));
  return manifest;
}

export function writeAssetTypes(cwd: string): AssetManifest {
  const manifest = buildManifest(cwd);
  const dir = path.join(cwd, NEO_DIR);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, ASSET_MANIFEST_FILE), serializeManifest(manifest));
  fs.writeFileSync(path.join(dir, ASSET_TYPES_FILE), renderAssetTypes(manifest.assets));
  return manifest;
}

export function copyAssets(cwd: string, outAbs: string): void {
  const source = path.join(cwd, ASSET_DIR);
  if (!fs.existsSync(source)) {
    return;
  }
  const dest = path.join(outAbs, ASSET_DIR);
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(source, dest, { recursive: true });
}

function buildManifest(cwd: string): AssetManifest {
  return { version: 1, assets: collectAssets(cwd) };
}

function walkAssets(dir: string, root: string, entries: AssetEntry[]): void {
  for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      walkAssets(abs, root, entries);
    } else if (dirent.isFile()) {
      const content = fs.readFileSync(abs);
      entries.push({
        key: toPosix(path.relative(root, abs)),
        size: content.byteLength,
        hash: createHash('sha256').update(content).digest('hex'),
      });
    }
  }
}

function serializeManifest(manifest: AssetManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

function renderAssetTypes(assets: AssetEntry[]): string {
  if (assets.length === 0) {
    return 'export type NeoAssetKey = never;\n';
  }
  const union = assets.map((asset) => `  | ${toTypeScriptString(asset.key)}`).join('\n');
  return `export type NeoAssetKey =\n${union};\n`;
}

function toTypeScriptString(value: string): string {
  return `'${value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')}'`;
}

function toPosix(value: string): string {
  return value.split(path.sep).join('/');
}
