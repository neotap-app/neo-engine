import fs from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

export interface ProjectSource {
  file: string;
  source: ts.SourceFile;
}

export interface LocalImportGraph {
  root: string;
  files: ProjectSource[];
  errors: string[];
}

const RESOLVE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.json'];
const LINT_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']);
const EXCLUDED_TOP_LEVEL_DIRS = new Set(['node_modules', 'dist', 'out', '.neo-build', '.neo-dev', '.neo']);

export function collectLocalImportGraph(root: string, entryPath: string): LocalImportGraph {
  const resolvedRoot = path.resolve(root);
  const files: ProjectSource[] = [];
  const errors: string[] = [];
  const visited = new Set<string>();
  const queue = [entryPath];

  while (queue.length > 0) {
    const file = queue.shift() as string;
    if (visited.has(file)) {
      continue;
    }
    visited.add(file);

    let text: string;
    try {
      text = fs.readFileSync(file, 'utf-8');
    } catch (err) {
      errors.push(`${toRelative(resolvedRoot, file)}: cannot read file (${err instanceof Error ? err.message : String(err)})`);
      continue;
    }

    const source = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      scriptKindFor(file),
    );
    files.push({ file, source });

    for (const specifier of collectLocalSpecifiers(source)) {
      const resolved = resolveLocalImport(file, specifier);
      if (!resolved || isExcluded(resolved, resolvedRoot) || visited.has(resolved)) {
        continue;
      }
      if (LINT_EXTENSIONS.has(path.extname(resolved).toLowerCase())) {
        queue.push(resolved);
      }
    }
  }

  return { root: resolvedRoot, files, errors };
}

function collectLocalSpecifiers(source: ts.SourceFile): string[] {
  const specifiers: string[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      if (!clause?.isTypeOnly && ts.isStringLiteralLike(node.moduleSpecifier)) {
        specifiers.push(node.moduleSpecifier.text);
      }
    } else if (ts.isExportDeclaration(node)) {
      if (!node.isTypeOnly && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
        specifiers.push(node.moduleSpecifier.text);
      }
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0 &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      specifiers.push((node.arguments[0] as ts.StringLiteralLike).text);
    }

    ts.forEachChild(node, visit);
  };

  visit(source);
  return specifiers;
}

function resolveLocalImport(fromFile: string, specifier: string): string | null {
  let base: string;
  if (specifier.startsWith('.')) {
    base = path.resolve(path.dirname(fromFile), specifier);
  } else if (path.isAbsolute(specifier)) {
    base = specifier;
  } else {
    return null;
  }

  const candidates: string[] = [base];
  const ext = path.extname(base);
  if (ext) {
    const stem = base.slice(0, -ext.length);
    for (const replacement of ['.ts', '.tsx', '.mts', '.cts']) {
      candidates.push(stem + replacement);
    }
  }
  for (const candidateExt of RESOLVE_EXTENSIONS) {
    candidates.push(base + candidateExt);
    candidates.push(path.join(base, `index${candidateExt}`));
  }

  for (const candidate of candidates) {
    try {
      if (fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

function isExcluded(file: string, root: string): boolean {
  const relative = path.relative(root, file);
  const segments = relative.split(path.sep);
  if (segments.includes('node_modules')) {
    return true;
  }
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return false;
  }
  return EXCLUDED_TOP_LEVEL_DIRS.has(segments[0]);
}

function scriptKindFor(file: string): ts.ScriptKind {
  switch (path.extname(file).toLowerCase()) {
    case '.tsx':
      return ts.ScriptKind.TSX;
    case '.jsx':
      return ts.ScriptKind.JSX;
    case '.js':
    case '.mjs':
    case '.cjs':
      return ts.ScriptKind.JS;
    default:
      return ts.ScriptKind.TS;
  }
}

export function toRelative(root: string, file: string): string {
  return path.relative(root, file).replace(/\\/g, '/');
}
