import { ASSET_DIR, assetPath } from '@neotap.app/neo-engine';
import ts from 'typescript';

import { toRelative } from './graph';

const ASSET_CALL_NAMES = new Set(['loadText', 'loadBinary', 'loadImage', 'resolve', 'load']);
const MAX_SUGGESTIONS = 10;

export function collectAssetKeyErrors(
  source: ts.SourceFile,
  root: string,
  available: ReadonlySet<string>,
): string[] {
  const errors: string[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const callee = unwrapParentheses(node.expression);
      const name = callName(callee);
      if (name !== null && ASSET_CALL_NAMES.has(name) && !isPromiseResolve(callee) && node.arguments.length > 0) {
        const argument = unwrapParentheses(node.arguments[0]);
        if (ts.isStringLiteral(argument)) {
          const key = toAssetKey(argument.text);
          if (key === null || !available.has(key)) {
            const { line, character } = source.getLineAndCharacterOfPosition(argument.getStart(source));
            errors.push(
              `${toRelative(root, source.fileName)}:${line + 1}:${character + 1} ` +
                `unknown asset key "${argument.text}" via ${name}(); ${describeAvailable(available)}`,
            );
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(source);
  return errors;
}

function unwrapParentheses(node: ts.Expression): ts.Expression {
  let current = node;
  while (ts.isParenthesizedExpression(current)) {
    current = current.expression;
  }
  return current;
}

function callName(callee: ts.Expression): string | null {
  if (ts.isIdentifier(callee)) {
    return callee.text;
  }
  if (ts.isPropertyAccessExpression(callee)) {
    return callee.name.text;
  }
  if (ts.isElementAccessExpression(callee) && ts.isStringLiteral(callee.argumentExpression)) {
    return callee.argumentExpression.text;
  }
  return null;
}

function isPromiseResolve(callee: ts.Expression): boolean {
  if (!ts.isPropertyAccessExpression(callee) && !ts.isElementAccessExpression(callee)) {
    return false;
  }
  let target: ts.Expression = callee.expression;
  while (ts.isPropertyAccessExpression(target)) {
    if (target.name.text === 'Promise') {
      return true;
    }
    target = target.expression;
  }
  return ts.isIdentifier(target) && target.text === 'Promise';
}

function toAssetKey(raw: string): string | null {
  const resolved = assetPath(raw);
  if (resolved === null) {
    return null;
  }
  return resolved.slice(ASSET_DIR.length + 1);
}

function describeAvailable(available: ReadonlySet<string>): string {
  const keys = [...available].sort();
  if (keys.length === 0) {
    return 'no assets found under assets/';
  }
  const shown = keys.slice(0, MAX_SUGGESTIONS).map((key) => `"${key}"`).join(', ');
  const suffix = keys.length > MAX_SUGGESTIONS ? `, ... (+${keys.length - MAX_SUGGESTIONS} more)` : '';
  return `available keys: ${shown}${suffix}`;
}
