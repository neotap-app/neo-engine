import fs from 'node:fs';
import path from 'node:path';

import type { NeoManifest } from '@getneotap/neo-engine';

import { readManifest } from '../build/common';

export interface LintResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export async function lintProject(cwd: string): Promise<LintResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  let manifest: NeoManifest;
  try {
    manifest = readManifest(cwd);
  } catch (err) {
    return {
      ok: false,
      errors: [err instanceof Error ? err.message : String(err)],
      warnings,
    };
  }

  const entry = manifest.effectiveEntry;
  const entryPath = path.join(cwd, entry);
  if (!fs.existsSync(entryPath)) {
    errors.push(`entry not found: ${entry} (expected at ${entryPath})`);
  }

  return { ok: errors.length === 0, errors, warnings };
}
