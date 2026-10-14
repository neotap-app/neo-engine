import type Phaser from 'phaser';
import type * as THREE from 'three';

import type { CapabilityBundle } from '../types/game-context';
import type { GameContext2D, GameContext3D, NeoGameInstance } from '../types/game';
import type { NeoManifest } from '../manifest';

export interface MountPoint {
  element: HTMLElement;
}

export interface RuntimeOptions {
  mount: MountPoint;
  capabilities: CapabilityBundle;
  manifest?: NeoManifest | null;
  canvas?: HTMLCanvasElement;
  loadInstance: () => Promise<NeoGameInstance>;
}

export interface NeoRuntime {
  mount(options: RuntimeOptions): Promise<void>;
  unmount(): void;
}

function createCanvas(mount: MountPoint): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  mount.element.appendChild(canvas);
  return canvas;
}

async function mount2D(
  instance: Extract<NeoGameInstance, { mode: '2d' }>,
  ctx: GameContext2D,
): Promise<void> {
  const { default: Phaser } = await import('phaser');
  const declared = instance.config.type ?? Phaser.AUTO;
  const deviceFeatures = (Phaser as unknown as { Device?: { features?: { webGL?: boolean } } }).Device?.features;
  const type = declared === Phaser.AUTO
    ? (deviceFeatures?.webGL ? Phaser.WEBGL : Phaser.CANVAS)
    : declared;
  const game = new Phaser.Game({
    ...instance.config,
    type,
    canvas: ctx.canvas,
  });
  ctx.game = game;
  await instance.create?.(ctx);
}

async function mount3D(
  instance: Extract<NeoGameInstance, { mode: '3d' }>,
  ctx: GameContext3D,
): Promise<void> {
  const { WebGLRenderer, PerspectiveCamera, Scene } = await import('three');
  const renderer = new WebGLRenderer({
    canvas: ctx.canvas,
    antialias: true,
  });
  const scene = new Scene();
  const camera = new PerspectiveCamera(75, ctx.canvas.width / ctx.canvas.height, 0.1, 1000);
  ctx.renderer = renderer;
  ctx.scene = scene;
  ctx.camera = camera;

  const animate = () => {
    if (!ctx.renderer || !ctx.scene || !ctx.camera) {
      return;
    }
    ctx.renderer.render(ctx.scene, ctx.camera);
    requestAnimationFrame(animate);
  };
  animate();

  await instance.create(ctx);
}

export function createRuntime(): NeoRuntime {
  let instance: NeoGameInstance | null = null;
  let ctx: GameContext2D | GameContext3D | null = null;
  let mounted = false;

  return {
    async mount(options) {
      if (mounted) {
        throw new Error('runtime already mounted');
      }
      mounted = true;

      const canvas = options.canvas ?? createCanvas(options.mount);
      const base = {
        canvas,
        storage: options.capabilities.storage,
        audio: options.capabilities.audio,
        load: options.capabilities.resource,
        system: options.capabilities.system,
        screen: options.capabilities.screen,
      };

      const mod = await options.loadInstance();
      instance = mod;

      if (instance.mode === '2d') {
        ctx = { ...base, mode: '2d' as const, game: null as unknown as Phaser.Game };
        await mount2D(instance, ctx);
      } else {
        ctx = {
          ...base,
          mode: '3d' as const,
          renderer: null as unknown as THREE.WebGLRenderer,
          scene: null as unknown as THREE.Scene,
          camera: null as unknown as THREE.PerspectiveCamera,
        };
        await mount3D(instance, ctx);
      }
    },
    unmount() {
      if (!mounted || !instance || !ctx) {
        return;
      }
      if (instance.destroy) {
        if (instance.mode === '2d') {
          void instance.destroy(ctx as GameContext2D);
        } else {
          void instance.destroy(ctx as GameContext3D);
        }
      }
      if (instance.mode === '2d') {
        const ctx2d = ctx as GameContext2D;
        if (ctx2d.game) {
          ctx2d.game.destroy(true);
        }
      }
      ctx.canvas.remove();
      mounted = false;
      instance = null;
      ctx = null;
    },
  };
}
