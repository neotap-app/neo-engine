import fs from 'node:fs';
import path from 'node:path';

import { NeoManifest } from '@neotap.app/neo-engine';
import ts from 'typescript';

import { readManifest } from '../build/common';

export interface LintResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

const FORBIDDEN_GLOBALS = new Set([
  'window',
  'document',
  'localStorage',
  'navigator',
  'wx',
  'tt',
  'Proxy',
]);

const RESOLVE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.json'];
const LINT_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']);
const EXCLUDED_TOP_LEVEL_DIRS = new Set(['node_modules', 'dist', 'out', '.neo-build', '.neo-dev']);

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

  const root = path.resolve(cwd);
  const entry = manifest.effectiveEntry;
  const entryPath = path.join(root, entry);
  if (!fs.existsSync(entryPath)) {
    errors.push(`entry not found: ${entry} (expected at ${entryPath})`);
    return { ok: false, errors, warnings };
  }

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
      errors.push(`${toRelative(root, file)}: cannot read file (${err instanceof Error ? err.message : String(err)})`);
      continue;
    }

    const source = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      scriptKindFor(file),
    );

    collectForbiddenUsage(source, root, errors);

    for (const specifier of collectLocalSpecifiers(source)) {
      const resolved = resolveLocalImport(file, specifier);
      if (!resolved || isExcluded(resolved, root) || visited.has(resolved)) {
        continue;
      }
      if (LINT_EXTENSIONS.has(path.extname(resolved).toLowerCase())) {
        queue.push(resolved);
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

function collectForbiddenUsage(source: ts.SourceFile, root: string, errors: string[]): void {
  const report = (node: ts.Node, message: string) => {
    const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source));
    errors.push(`${toRelative(root, source.fileName)}:${line + 1}:${character + 1} ${message}`);
  };

  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && isGlobalReference(node)) {
      if (node.text === 'eval') {
        report(node, 'forbidden dynamic code execution: eval');
      } else if (FORBIDDEN_GLOBALS.has(node.text)) {
        report(node, `forbidden global "${node.text}" (use platform capabilities / RAL instead)`);
      }
    }

    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'Function') {
      report(node.expression, 'forbidden dynamic code execution: Function()');
    }

    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'Function') {
      report(node.expression, 'forbidden dynamic code execution: new Function()');
    }

    ts.forEachChild(node, visit);
  };

  visit(source);
}

function isGlobalReference(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (!parent) {
    return true;
  }

  if (ts.isPropertyAccessExpression(parent) && parent.name === node) {
    return false;
  }
  if (ts.isPropertyAssignment(parent) && parent.name === node) {
    return false;
  }
  if (ts.isPropertyDeclaration(parent) && parent.name === node) {
    return false;
  }
  if (ts.isPropertySignature(parent) && parent.name === node) {
    return false;
  }
  if (ts.isMethodDeclaration(parent) && parent.name === node) {
    return false;
  }
  if (ts.isMethodSignature(parent) && parent.name === node) {
    return false;
  }
  if (ts.isGetAccessorDeclaration(parent) && parent.name === node) {
    return false;
  }
  if (ts.isSetAccessorDeclaration(parent) && parent.name === node) {
    return false;
  }
  if (ts.isEnumMember(parent) && parent.name === node) {
    return false;
  }
  if (ts.isQualifiedName(parent) && parent.right === node) {
    return false;
  }
  if (ts.isImportSpecifier(parent) || ts.isImportClause(parent) || ts.isNamespaceImport(parent)) {
    return false;
  }
  if (ts.isExportSpecifier(parent)) {
    return false;
  }
  if (ts.isVariableDeclaration(parent) && parent.name === node) {
    return false;
  }
  if (ts.isParameter(parent) && parent.name === node) {
    return false;
  }
  if (ts.isBindingElement(parent) && parent.propertyName === node) {
    return false;
  }
  if (ts.isFunctionDeclaration(parent) && parent.name === node) {
    return false;
  }
  if (ts.isClassDeclaration(parent) && parent.name === node) {
    return false;
  }
  if (ts.isLabeledStatement(parent) && parent.label === node) {
    return false;
  }
  if ((ts.isBreakStatement(parent) || ts.isContinueStatement(parent)) && parent.label === node) {
    return false;
  }
  if (ts.isJsxAttribute(parent) && parent.name === node) {
    return false;
  }

  return true;
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

function toRelative(root: string, file: string): string {
  return path.relative(root, file).replace(/\\/g, '/');
}
