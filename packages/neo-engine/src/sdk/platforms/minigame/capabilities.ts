import type { IStorage } from '../../types/game-context/storage';
import type { IAudio, AudioPlayOptions } from '../../types/game-context/audio';
import type { IInput, PointerEventData } from '../../types/game-context/input';
import type { ILifecycle } from '../../types/game-context/lifecycle';
import type { IResource, ResourceSource } from '../../types/game-context/resource';
import type { MinigameAPI, MinigameInnerAudio, MinigameTouchEvent } from './api';

export interface MinigameCapabilityOptions {
  resource?: {
    baseUrl?: string;
    manifest?: Record<string, string>;
  };
}

export function createMinigameStorage(api: MinigameAPI, prefix = 'neo:'): IStorage {
  const namespace = `${prefix}${'game'}:`;
  return {
    name: 'storage',
    available: true,
    get(key) {
      const value = api.getStorageSync(`${namespace}${key}`);
      return typeof value === 'string' ? value : null;
    },
    set(key, value) {
      api.setStorageSync(`${namespace}${key}`, value);
    },
    remove(key) {
      api.removeStorageSync(`${namespace}${key}`);
    },
    clear() {
      api.clearStorageSync();
    },
  };
}

export function createMinigameAudio(api: MinigameAPI): IAudio {
  const contexts = new Map<string, MinigameInnerAudio>();

  const ensureContext = (key: string): MinigameInnerAudio => {
    let ctx = contexts.get(key);
    if (!ctx) {
      ctx = api.createInnerAudioContext();
      contexts.set(key, ctx);
    }
    return ctx;
  };

  return {
    name: 'audio',
    available: true,
    play(key, options: AudioPlayOptions = {}) {
      const ctx = ensureContext(key);
      ctx.src = key;
      ctx.loop = options.loop ?? false;
      if (options.volume !== undefined) {
        ctx.volume = options.volume;
      }
      ctx.play();
    },
    pause(key) {
      const ctx = contexts.get(key);
      if (ctx) {
        ctx.pause();
      }
    },
    stop(key) {
      const ctx = contexts.get(key);
      if (ctx) {
        ctx.stop();
      }
    },
    setVolume(key, volume) {
      const ctx = contexts.get(key);
      if (ctx) {
        ctx.volume = volume;
      }
    },
  };
}

function toPointer(event: MinigameTouchEvent): PointerEventData | null {
  const touch = event.touches[0] ?? event.changedTouches[0];
  if (!touch) {
    return null;
  }
  return { x: touch.clientX, y: touch.clientY };
}

export function createMinigameInput(api: MinigameAPI): IInput {
  const listeners: Record<string, Array<(event: PointerEventData) => void>> = {
    down: [],
    move: [],
    up: [],
  };

  const emit = (type: keyof typeof listeners) => (event: MinigameTouchEvent) => {
    const data = toPointer(event);
    if (!data) {
      return;
    }
    listeners[type].forEach((fn) => fn(data));
  };

  api.onTouchStart(emit('down'));
  api.onTouchMove(emit('move'));
  api.onTouchEnd(emit('up'));

  return {
    name: 'input',
    available: true,
    onPointerDown(listener) {
      listeners.down.push(listener);
    },
    onPointerMove(listener) {
      listeners.move.push(listener);
    },
    onPointerUp(listener) {
      listeners.up.push(listener);
    },
  };
}

export function createMinigameLifecycle(api: MinigameAPI): ILifecycle {
  const showListeners: Array<() => void> = [];
  const hideListeners: Array<() => void> = [];

  api.onShow?.(() => showListeners.forEach((fn) => fn()));
  api.onHide?.(() => hideListeners.forEach((fn) => fn()));

  return {
    name: 'lifecycle',
    available: Boolean(api.onShow && api.onHide),
    onShow(listener) {
      showListeners.push(listener);
    },
    onHide(listener) {
      hideListeners.push(listener);
    },
  };
}

export function createMinigameResource(api: MinigameAPI, options: MinigameCapabilityOptions = {}): IResource {
  const baseUrl = options.resource?.baseUrl ?? '';
  const manifest = options.resource?.manifest ?? {};

  return {
    name: 'resource',
    available: true,
    resolve(key): ResourceSource | null {
      const mapped = manifest[key] ?? key;
      return { kind: 'remote', url: `${baseUrl}${mapped}` };
    },
    async load<T>(key: string): Promise<T> {
      const source = this.resolve(key);
      if (!source || source.kind !== 'remote') {
        throw new Error(`cannot load resource: ${key}`);
      }
      return new Promise<T>((resolve, reject) => {
        apiRequest(api, source.url)
          .then((text) => resolve(JSON.parse(text) as T))
          .catch(reject);
      });
    },
  };
}

function apiRequest(api: MinigameAPI, url: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const request = (api as unknown as {
      request?: (options: {
        url: string;
        success: (res: { data: unknown }) => void;
        fail: (err: unknown) => void;
      }) => void;
    }).request;
    if (typeof request !== 'function') {
      reject(new Error('network request not supported'));
      return;
    }
    request({
      url,
      success: (res) => resolve(String(res.data)),
      fail: reject,
    });
  });
}
