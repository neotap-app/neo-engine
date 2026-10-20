import type { IStorage } from '../../types/game-context/storage';
import type { IAudio, AudioPlayOptions } from '../../types/game-context/audio';
import type { IInput, PointerEventData } from '../../types/game-context/input';
import type { ILifecycle } from '../../types/game-context/lifecycle';
import {
  assetPath,
  joinAssetUrl,
  type IResource,
  type ResourceSource,
} from '../../types/game-context/resource';
import type { IScreen, Orientation, SafeArea, ScreenInfo } from '../../types/game-context/screen';
import type { DeviceInfo, EnvironmentInfo, ISystem, PlatformName } from '../../types/game-context/system';
import type { MinigameAPI, MinigameImage, MinigameInnerAudio, MinigameSystemInfo, MinigameTouchEvent } from './api';

export interface MinigameCapabilityOptions {
  platform?: PlatformName;
  resource?: {
    baseUrl?: string;
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

  const pathFor = (key: string): string | null => assetPath(key);

  const loadText = async (key: string): Promise<string> => {
    const filePath = pathFor(key);
    if (!filePath) {
      throw new Error(`invalid resource key: ${key}`);
    }
    const fileSystem = api.getFileSystemManager?.();
    if (fileSystem) {
      try {
        const data = fileSystem.readFileSync(filePath, 'utf8');
        if (typeof data === 'string') {
          return data;
        }
      } catch {}
    }
    if (baseUrl) {
      const data = await requestData(api, joinAssetUrl(baseUrl, filePath), 'text');
      if (typeof data === 'string') {
        return data;
      }
    }
    throw new Error(`failed to load text asset ${key}: local read unavailable`);
  };

  const loadBinary = async (key: string): Promise<ArrayBuffer> => {
    const filePath = pathFor(key);
    if (!filePath) {
      throw new Error(`invalid resource key: ${key}`);
    }
    const fileSystem = api.getFileSystemManager?.();
    if (fileSystem) {
      try {
        return toArrayBuffer(fileSystem.readFileSync(filePath));
      } catch {}
    }
    if (baseUrl) {
      const data = await requestData(api, joinAssetUrl(baseUrl, filePath), 'arraybuffer');
      return toArrayBuffer(data);
    }
    throw new Error(`failed to load binary asset ${key}: local read unavailable`);
  };

  const loadImage = (key: string): Promise<HTMLImageElement> => {
    const filePath = pathFor(key);
    if (!filePath) {
      return Promise.reject(new Error(`invalid resource key: ${key}`));
    }
    const remoteSrc = baseUrl ? joinAssetUrl(baseUrl, filePath) : null;
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const createImage = getImageFactory(api);
      if (!createImage) {
        reject(new Error(`image loading not supported for ${key}`));
        return;
      }
      const attempt = (src: string, fallback: string | null): void => {
        const image = createImage();
        image.onload = () => resolve(image as unknown as HTMLImageElement);
        image.onerror = () => {
          if (fallback) {
            attempt(fallback, null);
          } else {
            reject(new Error(`failed to load image ${key}`));
          }
        };
        image.src = src;
      };
      attempt(filePath, remoteSrc);
    });
  };

  return {
    name: 'resource',
    available: true,
    resolve(key): ResourceSource | null {
      const filePath = pathFor(key);
      return filePath ? { kind: 'local', path: filePath } : null;
    },
    async load<T>(key: string): Promise<T> {
      return JSON.parse(await loadText(key)) as T;
    },
    loadText,
    loadBinary,
    loadImage,
  };
}

function getImageFactory(api: MinigameAPI): (() => MinigameImage) | null {
  if (typeof api.createImage === 'function') {
    return () => api.createImage!();
  }
  const globalCreate = (globalThis as Record<string, unknown>).createImage;
  if (typeof globalCreate === 'function') {
    return () => (globalCreate as () => MinigameImage)();
  }
  return null;
}

function requestData(
  api: MinigameAPI,
  url: string,
  responseType: 'text' | 'arraybuffer',
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const request = api.request;
    if (typeof request !== 'function') {
      reject(new Error('network request not supported'));
      return;
    }
    request({
      url,
      method: 'GET',
      dataType: responseType === 'text' ? 'text' : undefined,
      responseType,
      success: (res) => {
        if (typeof res.statusCode === 'number' && res.statusCode >= 400) {
          reject(new Error(`request failed: ${res.statusCode}`));
          return;
        }
        resolve(res.data);
      },
      fail: (err) => reject(new Error(`request failed: ${describeError(err)}`)),
    });
  });
}

function toArrayBuffer(data: unknown): ArrayBuffer {
  if (data instanceof ArrayBuffer) {
    return data;
  }
  if (ArrayBuffer.isView(data)) {
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  }
  throw new Error('asset data is not binary');
}

function describeError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'object' && err !== null && 'errMsg' in err) {
    return String((err as { errMsg: unknown }).errMsg);
  }
  return String(err);
}

export function createMinigameSystem(api: MinigameAPI, platform: PlatformName): ISystem {
  return {
    name: 'system',
    available: Boolean(api.getSystemInfoSync),
    getEnvironmentInfo(): EnvironmentInfo {
      const sys = api.getSystemInfoSync?.() ?? {};
      const device = api.getDeviceInfo?.() ?? {};
      const base = api.getAppBaseInfo?.() ?? {};
      const runtimeVersion = api.getSDKVersion?.() ?? base.SDKVersion ?? sys.SDKVersion ?? '';
      const deviceInfo: DeviceInfo = {
        brand: device.brand ?? sys.brand,
        model: device.model ?? sys.model,
        system: device.system ?? sys.system,
        pixelRatio: sys.pixelRatio ?? 1,
        screenWidth: sys.screenWidth ?? 0,
        screenHeight: sys.screenHeight ?? 0,
        windowWidth: sys.windowWidth ?? 0,
        windowHeight: sys.windowHeight ?? 0,
      };
      return {
        platform,
        runtime: {
          name: platform,
          version: runtimeVersion,
          language: base.language ?? sys.language,
          platform: base.platform ?? sys.platform,
        },
        device: deviceInfo,
      };
    },
  };
}

function readSystemInfo(api: MinigameAPI): MinigameSystemInfo {
  return api.getSystemInfoSync?.() ?? {};
}

function toSafeArea(sys: MinigameSystemInfo): SafeArea | undefined {
  if (!sys.safeArea) {
    return undefined;
  }
  return {
    top: sys.safeArea.top,
    right: sys.safeArea.right,
    bottom: sys.safeArea.bottom,
    left: sys.safeArea.left,
  };
}

export function createMinigameScreen(api: MinigameAPI): IScreen {
  const listeners = new Set<(orientation: Orientation) => void>();

  const getOrientation = (): Orientation => {
    const { windowWidth: w, windowHeight: h } = readSystemInfo(api);
    if (typeof w === 'number' && typeof h === 'number' && w > 0 && h > 0) {
      return h >= w ? 'portrait' : 'landscape';
    }
    return 'portrait';
  };

  const handleDeviceOrientationChange = () => {
    const orientation = getOrientation();
    listeners.forEach((fn) => fn(orientation));
  };

  api.onDeviceOrientationChange?.(handleDeviceOrientationChange);

  return {
    name: 'screen',
    available: true,
    getInfo(): ScreenInfo {
      const sys = readSystemInfo(api);
      return {
        width: sys.screenWidth ?? 0,
        height: sys.screenHeight ?? 0,
        pixelRatio: sys.pixelRatio ?? 1,
        orientation: getOrientation(),
        statusBarHeight: sys.statusBarHeight,
        safeArea: toSafeArea(sys),
      };
    },
    getOrientation,
    canChangeOrientation() {
      return typeof api.setDeviceOrientation === 'function';
    },
    requestOrientation(orientation: Orientation): Promise<boolean> {
      return new Promise<boolean>((resolve) => {
        const setDeviceOrientation = api.setDeviceOrientation;
        if (typeof setDeviceOrientation !== 'function') {
          resolve(false);
          return;
        }
        setDeviceOrientation({
          value: orientation,
          success: () => resolve(true),
          fail: () => resolve(false),
        });
      });
    },
    onOrientationChange(listener) {
      listeners.add(listener);
    },
    offOrientationChange(listener) {
      listeners.delete(listener);
    },
  };
}
