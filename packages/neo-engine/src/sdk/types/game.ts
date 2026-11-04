import type Phaser from 'phaser';
import type * as THREE from 'three';

import type { NeoManifest } from '../manifest';
import type { IAudio } from './game-context/audio';
import type { IInput } from './game-context/input';
import type { ILifecycle } from './game-context/lifecycle';
import type { IScreen } from './game-context/screen';
import type { IStorage } from './game-context/storage';
import type { IResource } from './game-context/resource';
import type { ISystem } from './game-context/system';
import type { ICanvas } from './game-context/types';

export type GameMode = '2d' | '3d';

export interface GameContext {
  mode: GameMode;
  manifest: NeoManifest | null;
  canvas: ICanvas;
  storage: IStorage;
  audio: IAudio;
  input: IInput;
  lifecycle: ILifecycle;
  load: IResource;
  system: ISystem;
  screen: IScreen;
}

export interface GameContext2D extends GameContext {
  mode: '2d';
  game: Phaser.Game;
}

export interface GameContext3D extends GameContext {
  mode: '3d';
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
}

export interface NeoGameInstance2D {
  mode: '2d';
  config: Phaser.Types.Core.GameConfig;
  create?: (ctx: GameContext2D) => void | Promise<void>;
  destroy?: (ctx: GameContext2D) => void | Promise<void>;
}

export interface NeoGameInstance3D {
  mode: '3d';
  create: (ctx: GameContext3D) => void | Promise<void>;
  destroy?: (ctx: GameContext3D) => void | Promise<void>;
}

export type NeoGameInstance = NeoGameInstance2D | NeoGameInstance3D;
