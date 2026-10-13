import type Phaser from 'phaser';
import type * as THREE from 'three';

import type { IAudio } from './game-context/audio';
import type { IStorage } from './game-context/storage';
import type { IResource } from './game-context/resource';

export type GameMode = '2d' | '3d';

export interface GameContext {
  mode: GameMode;
  canvas: HTMLCanvasElement;
  storage: IStorage;
  audio: IAudio;
  load: IResource;
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
