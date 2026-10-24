import path from 'node:path';

import { validateProjectAssetKeys } from './asset-keys';
import { writeAssetManifest, writeAssetTypes } from './assets';
import { normalizeH5Base } from './base';
import { readManifest, resolveEntry } from './common';
import { buildDouyin } from './platforms/douyin';
import { buildH5 } from './platforms/h5';
import { buildWechat } from './platforms/wechat';
import type { BuildOptions, BuildResult } from './types';

export * from './asset-keys';
export * from './assets';
export * from './base';
export * from './types';

export async function buildProject(options: BuildOptions): Promise<BuildResult> {
  const outDir = options.outDir ?? 'dist';
  const manifest = readManifest(options.cwd);
  const assetErrors = validateProjectAssetKeys(options.cwd, resolveEntry(manifest, options.cwd));
  if (assetErrors.length > 0) {
    throw new Error(`asset key validation failed:\n${assetErrors.map((error) => `  ${error}`).join('\n')}`);
  }

  switch (options.target) {
    case 'h5':
      await buildH5({ cwd: options.cwd, manifest, outDir, base: normalizeH5Base(options.base) });
      break;
    case 'wechat':
      await buildWechat({ cwd: options.cwd, manifest, outDir });
      break;
    case 'douyin':
      await buildDouyin({ cwd: options.cwd, manifest, outDir });
      break;
  }

  writeAssetManifest(options.cwd, path.resolve(options.cwd, outDir));
  writeAssetTypes(options.cwd);

  return { target: options.target, outDir };
}
