import type { NeoManifest } from '@neotap.app/neo-engine';

export type Target = 'h5' | 'wechat' | 'douyin';

export interface BuildOptions {
  cwd: string;
  target: Target;
  outDir?: string;
  /**
   * H5 only. Public base path used for emitted HTML/JS chunk URLs and the `assets/` directory.
   * Defaults to `'./'`, which keeps the output portable across root and subpath hosting.
   * Normalized by `normalizeH5Base` (trimmed, non-empty, trailing slash added).
   * Ignored by the minigame targets (`wechat` / `douyin`).
   */
  base?: string;
}

export interface BuildResult {
  target: Target;
  outDir: string;
}

export interface TargetBuildOptions {
  cwd: string;
  manifest: NeoManifest;
  outDir: string;
  /** H5 only. See {@link BuildOptions.base}. */
  base?: string;
}
