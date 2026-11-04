import type Phaser from 'phaser';
import type * as THREE from 'three';

import type { CapabilityBundle } from '../types/game-context';
import type {
  CanvasHost,
  CapabilityBindings,
  FrameCancel,
  FrameRequest,
  ICanvas,
} from '../types/game-context/types';
import type { GameContext2D, GameContext3D, NeoGameInstance } from '../types/game';
import type { NeoManifest } from '../manifest';

export type { FrameCancel, FrameRequest } from '../types/game-context/types';

export interface MountPoint {
  element: CanvasHost;
}

export interface RuntimeOptions {
  mount?: MountPoint;
  capabilities: CapabilityBundle;
  manifest?: NeoManifest | null;
  canvas?: ICanvas;
  createCanvas?: () => ICanvas;
  requestFrame?: FrameRequest;
  cancelFrame?: FrameCancel;
  loadInstance: () => Promise<NeoGameInstance>;
  onError?: (error: unknown) => void;
}

export interface NeoRuntime {
  mount(options: RuntimeOptions): Promise<void>;
  unmount(): void;
}

function createDomCanvas(): ICanvas {
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    return document.createElement('canvas') as unknown as ICanvas;
  }
  throw new Error('runtime requires a canvas: pass "canvas" or "createCanvas" outside a DOM environment');
}

interface ResolvedCanvas {
  canvas: ICanvas;
  owned: boolean;
}

function resolveCanvas(options: RuntimeOptions): ResolvedCanvas {
  if (options.canvas) {
    return { canvas: options.canvas, owned: false };
  }
  if (!options.mount) {
    throw new Error('runtime requires "mount" when the canvas is created by the runtime');
  }
  const canvas = options.createCanvas ? options.createCanvas() : createDomCanvas();
  options.mount.element.appendChild(canvas);
  return { canvas, owned: true };
}

const defaultRequestFrame: FrameRequest = (callback) => {
  if (typeof requestAnimationFrame === 'function') {
    return requestAnimationFrame(() => callback());
  }
  return setTimeout(callback, 16);
};

const defaultCancelFrame: FrameCancel = (handle) => {
  if (typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(handle);
    return;
  }
  clearTimeout(handle);
};

function bindCapabilities(
  capabilities: CapabilityBundle,
  canvas: ICanvas,
  game?: unknown,
): void {
  const bindings: CapabilityBindings = { canvas, game };
  for (const capability of Object.values(capabilities)) {
    if (typeof capability.bind === 'function') {
      try {
        capability.bind(bindings);
      } catch {
        // A broken capability must not abort the mount.
      }
    }
  }
}

function disposeCapabilities(capabilities: CapabilityBundle): void {
  for (const capability of Object.values(capabilities)) {
    if (typeof capability.dispose === 'function') {
      try {
        capability.dispose();
      } catch {
        // Continue disposing the remaining capabilities.
      }
    }
  }
}

function removeCanvas(canvas: ICanvas | null): void {
  if (!canvas) {
    return;
  }
  try {
    if (typeof canvas.remove === 'function') {
      canvas.remove();
      return;
    }
    const parent = (canvas as { parentNode?: { removeChild?: (node: unknown) => unknown } | null }).parentNode;
    parent?.removeChild?.(canvas);
  } catch {
    // The host may already have detached the canvas.
  }
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
    canvas: ctx.canvas as unknown as HTMLCanvasElement,
  });
  ctx.game = game;
  await instance.create?.(ctx);
}

async function prepare3D(ctx: GameContext3D): Promise<void> {
  const { WebGLRenderer, PerspectiveCamera, Scene } = await import('three');
  const renderer = new WebGLRenderer({
    canvas: ctx.canvas as unknown as HTMLCanvasElement,
    antialias: true,
  });
  const scene = new Scene();
  const camera = new PerspectiveCamera(75, ctx.canvas.width / ctx.canvas.height, 0.1, 1000);
  ctx.renderer = renderer;
  ctx.scene = scene;
  ctx.camera = camera;
}

export function createRuntime(): NeoRuntime {
  let instance: NeoGameInstance | null = null;
  let ctx: GameContext2D | GameContext3D | null = null;
  let canvas: ICanvas | null = null;
  let canvasOwned = false;
  let capabilities: CapabilityBundle | null = null;
  let mounted = false;
  let cleaningUp = false;
  let loopRunning = false;
  let rafId: number | null = null;
  let requestFrame: FrameRequest = defaultRequestFrame;
  let cancelFrame: FrameCancel = defaultCancelFrame;
  let showHandler: (() => void) | null = null;
  let hideHandler: (() => void) | null = null;

  const startLoop = () => {
    if (loopRunning || !ctx || ctx.mode !== '3d') {
      return;
    }
    loopRunning = true;
    const tick = () => {
      if (!loopRunning) {
        return;
      }
      if (!ctx || ctx.mode !== '3d' || !ctx.renderer || !ctx.scene || !ctx.camera) {
        loopRunning = false;
        return;
      }
      ctx.renderer.render(ctx.scene, ctx.camera);
      rafId = requestFrame(tick);
    };
    rafId = requestFrame(tick);
  };

  const stopLoop = () => {
    loopRunning = false;
    if (rafId !== null) {
      cancelFrame(rafId);
      rafId = null;
    }
  };

  const pause = () => {
    if (!ctx) {
      return;
    }
    if (ctx.mode === '2d') {
      try {
        ctx.game?.loop?.pause();
      } catch {
        // The game may already be destroyed.
      }
    } else {
      stopLoop();
    }
  };

  const resume = () => {
    if (!ctx) {
      return;
    }
    if (ctx.mode === '2d') {
      try {
        ctx.game?.loop?.resume();
      } catch {
        // The game may already be destroyed.
      }
    } else {
      startLoop();
    }
  };

  const unsubscribe = () => {
    const lifecycle = capabilities?.lifecycle;
    if (lifecycle) {
      if (showHandler) {
        try {
          lifecycle.offShow(showHandler);
        } catch {
          // Ignore lifecycle implementations that cannot unsubscribe.
        }
      }
      if (hideHandler) {
        try {
          lifecycle.offHide(hideHandler);
        } catch {
          // Ignore lifecycle implementations that cannot unsubscribe.
        }
      }
    }
    showHandler = null;
    hideHandler = null;
  };

  const subscribe = () => {
    const lifecycle = capabilities?.lifecycle;
    if (!lifecycle) {
      return;
    }
    showHandler = resume;
    hideHandler = pause;
    lifecycle.onShow(showHandler);
    lifecycle.onHide(hideHandler);
  };

  const cleanup = () => {
    if (cleaningUp) {
      return;
    }
    cleaningUp = true;
    try {
      stopLoop();
      unsubscribe();

      if (capabilities) {
        disposeCapabilities(capabilities);
      }

      if (instance && instance.destroy && ctx) {
        try {
          const result = instance.mode === '2d'
            ? instance.destroy(ctx as GameContext2D)
            : instance.destroy(ctx as GameContext3D);
          if (result && typeof (result as Promise<void>).then === 'function') {
            (result as Promise<void>).catch(() => undefined);
          }
        } catch {
          // Host destroy hooks are best-effort.
        }
      }

      if (ctx?.mode === '2d') {
        try {
          ctx.game?.destroy(true);
        } catch {
          // Phaser may have already destroyed the game.
        }
      }

      if (ctx?.mode === '3d') {
        const renderer = ctx.renderer;
        if (renderer) {
          try {
            renderer.dispose();
          } catch {
            // Ignore partial renderer state.
          }
          try {
            renderer.forceContextLoss?.();
          } catch {
            // Some environments do not support forced context loss.
          }
        }
      }

      if (canvasOwned) {
        removeCanvas(canvas);
      }
    } finally {
      mounted = false;
      instance = null;
      ctx = null;
      canvas = null;
      canvasOwned = false;
      capabilities = null;
      cleaningUp = false;
    }
  };

  return {
    async mount(options) {
      if (mounted) {
        throw new Error('runtime already mounted');
      }
      mounted = true;
      capabilities = options.capabilities;
      requestFrame = options.requestFrame ?? defaultRequestFrame;
      cancelFrame = options.cancelFrame ?? defaultCancelFrame;

      try {
        const resolved = resolveCanvas(options);
        const canvasElement = resolved.canvas;
        canvas = canvasElement;
        canvasOwned = resolved.owned;
        const base = {
          canvas: canvasElement,
          manifest: options.manifest ?? null,
          storage: options.capabilities.storage,
          audio: options.capabilities.audio,
          input: options.capabilities.input,
          lifecycle: options.capabilities.lifecycle,
          load: options.capabilities.resource,
          system: options.capabilities.system,
          screen: options.capabilities.screen,
        };

        const mod = await options.loadInstance();
        instance = mod;

        if (mod.mode === '2d') {
          const context: GameContext2D = {
            ...base,
            mode: '2d',
            game: null as unknown as Phaser.Game,
          };
          ctx = context;
          await mount2D(mod, context);
          bindCapabilities(options.capabilities, canvasElement, context.game);
        } else {
          const context: GameContext3D = {
            ...base,
            mode: '3d',
            renderer: null as unknown as THREE.WebGLRenderer,
            scene: null as unknown as THREE.Scene,
            camera: null as unknown as THREE.PerspectiveCamera,
          };
          ctx = context;
          await prepare3D(context);
          bindCapabilities(options.capabilities, canvasElement);
          startLoop();
          await mod.create(context);
        }

        subscribe();
      } catch (error) {
        cleanup();
        if (options.onError) {
          try {
            options.onError(error);
          } catch {
            // An error reporter must not mask the original failure.
          }
        }
        throw error;
      }
    },
    unmount() {
      if (!mounted && !instance && !ctx && !canvas) {
        return;
      }
      cleanup();
    },
  };
}
