import { normalizeH5Base } from './base';
import { readManifest } from './common';
import { buildDouyin } from './platforms/douyin';
import { buildH5 } from './platforms/h5';
import { buildWechat } from './platforms/wechat';
import type { BuildOptions, BuildResult } from './types';

export * from './base';
export * from './types';

export async function buildProject(options: BuildOptions): Promise<BuildResult> {
  const outDir = options.outDir ?? 'dist';
  const manifest = readManifest(options.cwd);

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

  return { target: options.target, outDir };
}
