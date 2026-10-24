import path from 'node:path';

import { collectAssetKeyErrors } from '../lint/asset-keys';
import { collectLocalImportGraph } from '../lint/graph';
import { collectAssets } from './assets';

export function validateProjectAssetKeys(cwd: string, entryPath: string): string[] {
  const available = new Set(collectAssets(cwd).map((asset) => asset.key));
  const graph = collectLocalImportGraph(path.resolve(cwd), entryPath);
  const errors = [...graph.errors];
  for (const { source } of graph.files) {
    errors.push(...collectAssetKeyErrors(source, graph.root, available));
  }
  return errors;
}
