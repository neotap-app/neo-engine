import fs from 'node:fs';
import path from 'node:path';

import { NeoManifest } from '@neotap.app/neo-engine';
import ts from 'typescript';

import { collectAssets } from '../build/assets';
import { readManifest } from '../build/common';
import { collectAssetKeyErrors } from './asset-keys';
import { collectLocalImportGraph, toRelative } from './graph';

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

  const graph = collectLocalImportGraph(root, entryPath);
  errors.push(...graph.errors);

  const available = new Set(collectAssets(cwd).map((asset) => asset.key));
  for (const { source } of graph.files) {
    collectForbiddenUsage(source, root, errors);
    errors.push(...collectAssetKeyErrors(source, root, available));
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
