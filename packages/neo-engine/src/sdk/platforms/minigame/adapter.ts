import type { MinigameAPI, MinigameCanvas } from './api';

export interface MinigameAdapter {
  canvas: MinigameCanvas;
  install(): void;
}

function createElement(tag: string): unknown {
  if (tag === 'canvas') {
    const canvas = document.createElement('canvas');
    return canvas;
  }
  if (tag === 'img' || tag === 'image') {
    const image = document.createElement('img');
    return image;
  }
  return { addEventListener() {}, removeEventListener() {}, style: {} };
}

function createElementNS(_ns: string, tag: string): unknown {
  return createElement(tag);
}

function noop(): void {}

function createAdapterCanvas(api: MinigameAPI): MinigameCanvas {
  const canvas = api.createCanvas();
  return canvas;
}

export function createMinigameAdapter(api: MinigameAPI): MinigameAdapter {
  const canvas = createAdapterCanvas(api);

  const documentShim = {
    createElement,
    createElementNS,
    createElementById: () => null,
    getElementById: () => null,
    addEventListener: noop,
    removeEventListener: noop,
    hidden: false,
    body: { appendChild: noop },
    documentElement: { appendChild: noop, style: {} },
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
      api.clearStorageSync();
    },
    key(_index: number): string | null {
      return null;
    },
    get length(): number {
      return 0;
    },
  };

  const windowShim: Record<string, unknown> = {
    document: documentShim,
    localStorage: localStorageShim,
    navigator: { userAgent: '', platform: '', language: 'zh-CN' },
    location: { href: '', protocol: '', host: '', pathname: '' },
    devicePixelRatio: 1,
    innerWidth: api.getSystemInfoSync?.()?.windowWidth ?? 0,
    innerHeight: api.getSystemInfoSync?.()?.windowHeight ?? 0,
    requestAnimationFrame,
    cancelAnimationFrame,
    addEventListener: noop,
    removeEventListener: noop,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Image: createElement('img')?.constructor ?? function Image() {},
    Audio: createElement('img')?.constructor ?? function Audio() {},
  };

  const adapt = (): void => {
    const g = globalThis as Record<string, unknown>;
    g.window = windowShim;
    g.document = documentShim;
    g.navigator = windowShim.navigator;
    g.localStorage = localStorageShim;
    g.canvas = canvas;
    g.Image = windowShim.Image;
    g.Audio = windowShim.Audio;
  };

  return {
    canvas,
    install: adapt,
  };
}
