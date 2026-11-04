import type { FrameCancel, FrameRequest } from '../../types/game-context/types';
import type { MinigameAPI, MinigameCanvas, MinigameImage, MinigameSystemInfo } from './api';

export interface MinigameAdapter {
  canvas: MinigameCanvas;
  requestFrame: FrameRequest;
  cancelFrame: FrameCancel;
  install(): void;
}

interface ShimElement {
  addEventListener(): void;
  removeEventListener(): void;
  style: Record<string, unknown>;
}

interface ShimAudio {
  src: string;
  loop: boolean;
  volume: number;
  currentTime: number;
  paused: boolean;
  duration: number;
  play(): Promise<void>;
  pause(): void;
  addEventListener(): void;
  removeEventListener(): void;
}

function createShimElement(): ShimElement {
  return {
    addEventListener() {},
    removeEventListener() {},
    style: {},
  };
}

function createImageFactory(api: MinigameAPI): (() => MinigameImage) | null {
  if (typeof api.createImage === 'function') {
    return () => api.createImage!();
  }
  const globalCreateImage = (globalThis as Record<string, unknown>).createImage;
  if (typeof globalCreateImage === 'function') {
    return () => (globalCreateImage as () => MinigameImage)();
  }
  return null;
}

function createImageConstructor(factory: (() => MinigameImage) | null): new () => MinigameImage {
  return function ImageConstructor(): MinigameImage {
    if (factory) {
      return factory();
    }
    return { src: '', width: 0, height: 0 };
  } as unknown as new () => MinigameImage;
}

function createAudioInstance(): ShimAudio {
  return {
    src: '',
    loop: false,
    volume: 1,
    currentTime: 0,
    paused: true,
    duration: 0,
    play: () => Promise.resolve(),
    pause() {},
    addEventListener() {},
    removeEventListener() {},
  };
}

function createAudioConstructor(): new () => ShimAudio {
  return function AudioConstructor(): ShimAudio {
    return createAudioInstance();
  } as unknown as new () => ShimAudio;
}

function readSystemInfo(api: MinigameAPI): MinigameSystemInfo {
  try {
    return api.getSystemInfoSync?.() ?? {};
  } catch {
    return {};
  }
}

export function createMinigameAdapter(api: MinigameAPI): MinigameAdapter {
  const canvas = api.createCanvas();
  const imageFactory = createImageFactory(api);
  const system = readSystemInfo(api);

  const windowWidth = system.windowWidth ?? system.screenWidth ?? 0;
  const windowHeight = system.windowHeight ?? system.screenHeight ?? 0;

  const globalScope = globalThis as Record<string, unknown>;
  const hostRequestFrame = typeof globalScope.requestAnimationFrame === 'function'
    ? (globalScope.requestAnimationFrame as (callback: () => void) => number).bind(globalThis)
    : null;
  const hostCancelFrame = typeof globalScope.cancelAnimationFrame === 'function'
    ? (globalScope.cancelAnimationFrame as (handle: number) => void).bind(globalThis)
    : null;

  const requestFrame: FrameRequest = (callback) => {
    if (hostRequestFrame) {
      return hostRequestFrame(callback);
    }
    return setTimeout(callback, 16);
  };

  const cancelFrame: FrameCancel = (handle) => {
    if (hostCancelFrame) {
      hostCancelFrame(handle);
      return;
    }
    clearTimeout(handle);
  };

  const documentShim = {
    createElement(tag: string): unknown {
      if (tag === 'canvas') {
        return api.createCanvas();
      }
      if (tag === 'img' || tag === 'image') {
        return imageFactory ? imageFactory() : createShimElement();
      }
      if (tag === 'audio') {
        return createAudioInstance();
      }
      return createShimElement();
    },
    createElementNS(_namespace: string, tag: string): unknown {
      return documentShim.createElement(tag);
    },
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
    removeEventListener() {},
    hidden: false,
    visibilityState: 'visible',
    readyState: 'complete',
    body: { appendChild() {}, removeChild() {} },
    documentElement: { appendChild() {}, removeChild() {}, style: {} },
    styleSheets: [],
  };

  const localStorageShim = {
    getItem(key: string): string | null {
      const value = api.getStorageSync(key);
      return typeof value === 'string' ? value : null;
    },
    setItem(key: string, value: string): void {
      api.setStorageSync(key, value);
    },
    removeItem(key: string): void {
      api.removeStorageSync(key);
    },
    clear(): void {
      const getStorageInfoSync = api.getStorageInfoSync;
      if (typeof getStorageInfoSync !== 'function') {
        return;
      }
      try {
        const info = getStorageInfoSync.call(api);
        if (!Array.isArray(info?.keys)) {
          return;
        }
        info.keys.filter((key) => key.startsWith('neo:')).forEach((key) => api.removeStorageSync(key));
      } catch {
        // Leave storage untouched when keys cannot be enumerated.
      }
    },
    key(_index: number): string | null {
      return null;
    },
    get length(): number {
      return 0;
    },
  };

  const navigatorShim = {
    userAgent: [system.platform, system.system, 'miniGame'].filter(Boolean).join(' '),
    platform: system.platform ?? '',
    language: system.language ?? 'zh-CN',
  };

  const screenShim = {
    width: system.screenWidth ?? windowWidth,
    height: system.screenHeight ?? windowHeight,
    orientation: {
      type: windowWidth > windowHeight ? 'landscape-primary' : 'portrait-primary',
      addEventListener() {},
      removeEventListener() {},
    },
  };

  const windowShim: Record<string, unknown> = {
    document: documentShim,
    localStorage: localStorageShim,
    navigator: navigatorShim,
    location: { href: '', protocol: '', host: '', pathname: '' },
    screen: screenShim,
    devicePixelRatio: system.pixelRatio ?? 1,
    innerWidth: windowWidth,
    innerHeight: windowHeight,
    requestAnimationFrame: requestFrame,
    cancelAnimationFrame: cancelFrame,
    addEventListener() {},
    removeEventListener() {},
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    matchMedia() {
      return {
        matches: false,
        media: '',
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
      };
    },
    performance: { now: () => Date.now() },
    Image: createImageConstructor(imageFactory),
    Audio: createAudioConstructor(),
  };

  let installed = false;

  const assignGlobal = (key: string, value: unknown): void => {
    try {
      (globalThis as Record<string, unknown>)[key] = value;
    } catch {
      // Some hosts expose read-only globals.
    }
  };

  const adapt = (): void => {
    if (installed) {
      return;
    }
    installed = true;
    assignGlobal('window', windowShim);
    assignGlobal('document', documentShim);
    assignGlobal('navigator', navigatorShim);
    assignGlobal('localStorage', localStorageShim);
    assignGlobal('canvas', canvas);
    assignGlobal('Image', windowShim.Image);
    assignGlobal('Audio', windowShim.Audio);
    if (typeof globalScope.requestAnimationFrame !== 'function') {
      assignGlobal('requestAnimationFrame', requestFrame);
    }
    if (typeof globalScope.cancelAnimationFrame !== 'function') {
      assignGlobal('cancelAnimationFrame', cancelFrame);
    }
    if (typeof globalScope.performance !== 'object' || globalScope.performance === null) {
      assignGlobal('performance', windowShim.performance);
    }
  };

  return {
    canvas,
    requestFrame,
    cancelFrame,
    install: adapt,
  };
}
