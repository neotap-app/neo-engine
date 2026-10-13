import type { NeoManifest } from '@getneotap/neo-engine';

export type Target = 'h5' | 'wechat' | 'douyin';

export interface BuildOptions {
  cwd: string;
  target: Target;
  outDir?: string;
}

export interface BuildResult {
  target: Target;
  outDir: string;
}

export interface TargetBuildOptions {
  cwd: string;
  manifest: NeoManifest;
  outDir: string;
}
