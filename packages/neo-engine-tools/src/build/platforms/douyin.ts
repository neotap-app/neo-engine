import { buildMinigame } from './minigame';
import type { TargetBuildOptions } from '../types';

export async function buildDouyin(options: TargetBuildOptions): Promise<void> {
  await buildMinigame(
    options,
    {
      namespace: 'tt',
      projectConfig: {
        compileType: 'game',
        libVersion: 'latest',
        setting: {
          es6: true,
          minifyJS: true,
        },
      },
    },
    {
      deviceOrientation: 'portrait',
      showStatusBar: false,
      networkTimeout: {
        request: 10000,
      },
    },
  );
}
