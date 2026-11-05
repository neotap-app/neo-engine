import fs from 'node:fs';
import path from 'node:path';

import { NeoManifest } from '@neotap.app/neo-engine';
import ts from 'typescript';

import { readManifest } from '../build/common';
import { collectLocalImportGraph, toRelative } from './graph';

export interface LintResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

const FORBIDDEN_GLOBALS = new Set([
  'window',
  'document',
  'navigator',
  'location',
  'history',
  'screen',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'Worker',
  'SharedWorker',
  'FileReader',
  'Blob',
  'File',
  'URL',
  'Image',
  'Audio',
  'AudioContext',
  'webkitAudioContext',
  'HTMLElement',
  'HTMLCanvasElement',
  'HTMLImageElement',
  'HTMLAudioElement',
  'HTMLVideoElement',
  'CanvasRenderingContext2D',
  'OffscreenCanvas',
  'createImageBitmap',
  'CustomEvent',
  'DOMParser',
  'XMLSerializer',
  'ResizeObserver',
  'IntersectionObserver',
  'MutationObserver',
  'requestIdleCallback',
  'getComputedStyle',
  'matchMedia',
  'performance',
  'alert',
  'confirm',
  'prompt',
  'process',
  'Buffer',
  'require',
  'module',
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

  for (const { source } of graph.files) {
    collectForbiddenUsage(source, root, errors);
  }

  return { ok: errors.length === 0, errors, warnings };
}

interface ForbiddenScope {
  readonly names: Set<string>;
  readonly parent: ForbiddenScope | null;
  readonly functionScope: boolean;
}

interface PendingReference {
  readonly node: ts.Identifier;
  readonly scope: ForbiddenScope;
}

type FunctionScopeNode =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration
  | ts.ConstructorDeclaration
  | ts.GetAccessorDeclaration
  | ts.SetAccessorDeclaration;

function createForbiddenScope(parent: ForbiddenScope | null, functionScope: boolean): ForbiddenScope {
  return { names: new Set<string>(), parent, functionScope };
}

function nearestFunctionScope(scope: ForbiddenScope): ForbiddenScope {
  let current = scope;
  while (!current.functionScope && current.parent) {
    current = current.parent;
  }
  return current;
}

function declareBindingName(name: ts.BindingName, scope: ForbiddenScope): void {
  if (ts.isIdentifier(name)) {
    scope.names.add(name.text);
    return;
  }
  for (const element of name.elements) {
    if (ts.isBindingElement(element)) {
      declareBindingName(element.name, scope);
    }
  }
}

function isFunctionScopeNode(node: ts.Node): node is FunctionScopeNode {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  );
}

function isDeclared(scope: ForbiddenScope, name: string): boolean {
  let current: ForbiddenScope | null = scope;
  while (current) {
    if (current.names.has(name)) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function isFunctionCallOrNew(node: ts.Node): boolean {
  const parent = node.parent;
  return (
    !!parent &&
    (ts.isCallExpression(parent) || ts.isNewExpression(parent)) &&
    parent.expression === node
  );
}

function collectForbiddenUsage(source: ts.SourceFile, root: string, errors: string[]): void {
  const report = (node: ts.Node, message: string) => {
    const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source));
    errors.push(`${toRelative(root, source.fileName)}:${line + 1}:${character + 1} ${message}`);
  };

  const references: PendingReference[] = [];
  const rootScope = createForbiddenScope(null, true);

  function visitFunction(node: FunctionScopeNode, scope: ForbiddenScope): void {
    const functionScope = createForbiddenScope(scope, true);

    if (ts.isFunctionDeclaration(node)) {
      if (node.name) {
        scope.names.add(node.name.text);
      }
    } else if (ts.isFunctionExpression(node) && node.name) {
      functionScope.names.add(node.name.text);
    }

    for (const typeParameter of node.typeParameters ?? []) {
      functionScope.names.add(typeParameter.name.text);
      visit(typeParameter, functionScope);
    }

    for (const parameter of node.parameters) {
      declareBindingName(parameter.name, functionScope);
      visit(parameter, functionScope);
    }

    const name = 'name' in node ? node.name : undefined;
    if (name && ts.isComputedPropertyName(name)) {
      visit(name, functionScope);
    }

    if (node.body) {
      visit(node.body, functionScope);
    }
  }

  function visit(node: ts.Node, scope: ForbiddenScope): void {
    if (ts.isIdentifier(node) && isGlobalReference(node)) {
      references.push({ node, scope });
    }

    if (isFunctionScopeNode(node)) {
      visitFunction(node, scope);
      return;
    }

    if (ts.isBlock(node)) {
      const blockScope = createForbiddenScope(scope, false);
      for (const statement of node.statements) {
        visit(statement, blockScope);
      }
      return;
    }

    if (ts.isForStatement(node) || ts.isForInStatement(node) || ts.isForOfStatement(node)) {
      const loopScope = createForbiddenScope(scope, false);
      ts.forEachChild(node, (child) => visit(child, loopScope));
      return;
    }

    if (ts.isCatchClause(node)) {
      const catchScope = createForbiddenScope(scope, false);
      if (node.variableDeclaration) {
        declareBindingName(node.variableDeclaration.name, catchScope);
        visit(node.variableDeclaration, catchScope);
      }
      visit(node.block, catchScope);
      return;
    }

    if (ts.isVariableDeclarationList(node)) {
      const blockScoped = (node.flags & ts.NodeFlags.BlockScoped) !== 0;
      const target = blockScoped ? scope : nearestFunctionScope(scope);
      for (const declaration of node.declarations) {
        declareBindingName(declaration.name, target);
      }
      ts.forEachChild(node, (child) => visit(child, scope));
      return;
    }

    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      const classScope = ts.isClassExpression(node) ? createForbiddenScope(scope, false) : scope;
      if (node.name) {
        classScope.names.add(node.name.text);
      }
      ts.forEachChild(node, (child) => visit(child, classScope));
      return;
    }

    if (ts.isEnumDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
      scope.names.add(node.name.text);
      ts.forEachChild(node, (child) => visit(child, scope));
      return;
    }

    if (ts.isTypeParameterDeclaration(node)) {
      scope.names.add(node.name.text);
      ts.forEachChild(node, (child) => visit(child, scope));
      return;
    }

    if (ts.isModuleDeclaration(node)) {
      if (ts.isIdentifier(node.name)) {
        scope.names.add(node.name.text);
      }
      const moduleScope = createForbiddenScope(scope, false);
      if (node.body) {
        visit(node.body, moduleScope);
      }
      return;
    }

    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      if (clause) {
        if (clause.name) {
          scope.names.add(clause.name.text);
        }
        const bindings = clause.namedBindings;
        if (bindings) {
          if (ts.isNamespaceImport(bindings)) {
            scope.names.add(bindings.name.text);
          } else {
            for (const element of bindings.elements) {
              scope.names.add(element.name.text);
            }
          }
        }
      }
      return;
    }

    if (ts.isImportEqualsDeclaration(node)) {
      scope.names.add(node.name.text);
      return;
    }

    ts.forEachChild(node, (child) => visit(child, scope));
  }

  for (const statement of source.statements) {
    visit(statement, rootScope);
  }

  for (const { node, scope } of references) {
    if (isDeclared(scope, node.text)) {
      continue;
    }
    if (node.text === 'eval') {
      report(node, 'forbidden dynamic code execution: eval');
      continue;
    }
    if (node.text === 'Function' && isFunctionCallOrNew(node)) {
      report(
        node,
        ts.isNewExpression(node.parent)
          ? 'forbidden dynamic code execution: new Function()'
          : 'forbidden dynamic code execution: Function()',
      );
      continue;
    }
    if (FORBIDDEN_GLOBALS.has(node.text)) {
      report(node, `forbidden global "${node.text}" (use platform capabilities / RAL instead)`);
    }
  }
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
  if (ts.isBindingElement(parent) && (parent.propertyName === node || parent.name === node)) {
    return false;
  }
  if (ts.isFunctionDeclaration(parent) && parent.name === node) {
    return false;
  }
  if (ts.isClassDeclaration(parent) && parent.name === node) {
    return false;
  }
  if (ts.isTypeParameterDeclaration(parent) && parent.name === node) {
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
