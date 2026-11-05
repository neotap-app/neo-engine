import fs from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

import { collectLocalImportGraph } from '../lint/graph';

export type GameMode = '2d' | '3d';

const THREE_STUB_FILE = 'neo-3d-engine.stub.ts';

export function detectGameMode(cwd: string, entryPath: string): GameMode {
  const graph = collectLocalImportGraph(cwd, entryPath);
  let saw2d = false;
  let saw3d = false;

  for (const { source } of graph.files) {
    for (const mode of collectModeLiterals(source)) {
      if (mode === '3d') {
        saw3d = true;
      } else {
        saw2d = true;
      }
    }
  }

  return saw3d ? '3d' : saw2d ? '2d' : '3d';
}

export function createThreeStub(tempDir: string): string {
  const file = path.join(tempDir, THREE_STUB_FILE);
  fs.writeFileSync(
    file,
    [
      `const MESSAGE = 'three.js is not bundled in 2D builds; use mode: "3d" to enable 3D';`,
      ``,
      `export class WebGLRenderer {`,
      `  constructor() {`,
      `    throw new Error(MESSAGE);`,
      `  }`,
      `}`,
      ``,
      `export class Scene {`,
      `  constructor() {`,
      `    throw new Error(MESSAGE);`,
      `  }`,
      `}`,
      ``,
      `export class PerspectiveCamera {`,
      `  constructor() {`,
      `    throw new Error(MESSAGE);`,
      `  }`,
      `}`,
      ``,
    ].join('\n'),
  );
  return file;
}

function collectModeLiterals(source: ts.SourceFile): GameMode[] {
  const modes: GameMode[] = [];

  const visit = (node: ts.Node): void => {
    if (
      (ts.isPropertyAssignment(node) || ts.isPropertyDeclaration(node)) &&
      node.initializer &&
      ts.isStringLiteralLike(node.initializer) &&
      isModeName(node.name)
    ) {
      const value = node.initializer.text;
      if (value === '2d' || value === '3d') {
        modes.push(value);
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
  return modes;
}

function isModeName(name: ts.PropertyName): boolean {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name)) {
    return name.text === 'mode';
  }
  return false;
}
