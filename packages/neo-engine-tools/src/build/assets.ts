import fs from 'node:fs';
import path from 'node:path';

import { ASSET_DIR } from '@neotap.app/neo-engine';

export function copyAssets(cwd: string, outAbs: string): void {
  const source = path.join(cwd, ASSET_DIR);
  if (!fs.existsSync(source)) {
    return;
  }
  const dest = path.join(outAbs, ASSET_DIR);
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(source, dest, { recursive: true });
}
