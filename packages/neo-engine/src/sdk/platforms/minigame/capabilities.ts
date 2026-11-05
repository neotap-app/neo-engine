import type { NeoManifest } from '../../manifest';
import type { IStorage } from '../../types/game-context/storage';
import type { AudioHandle, AudioPlayOptions, IAudio } from '../../types/game-context/audio';
import type { IInput, PointerEventData } from '../../types/game-context/input';
import type { ILifecycle } from '../../types/game-context/lifecycle';
import {
  assetPath,
  joinAssetUrl,
  type IImage,
  type IResource,
  type ResourceSource,
} from '../../types/game-context/resource';
import type { IScreen, Orientation, SafeArea, ScreenInfo } from '../../types/game-context/screen';
import type { DeviceInfo, EnvironmentInfo, ISystem, PlatformName } from '../../types/game-context/system';
import type { MinigameAPI, MinigameImage, MinigameInnerAudio, MinigameSystemInfo, MinigameTouchEvent } from './api';

export interface MinigameCapabilityOptions {
  platform?: PlatformName;
  manifest?: NeoManifest | null;
  storage?: MinigameStorageOptions;
  resource?: {
    baseUrl?: string;
  };
}

export interface MinigameStorageOptions {
  prefix?: string;
  namespace?: string;
}

export function createMinigameStorage(
  api: MinigameAPI,
  options: MinigameStorageOptions = {},
): IStorage {
  const prefix = options.prefix ?? 'neo:';
  const namespace = `${prefix}${encodeURIComponent(options.namespace ?? 'game')}:`;

  const namespacedKeys = (): string[] | null => {
    const getStorageInfoSync = api.getStorageInfoSync;
    if (typeof getStorageInfoSync !== 'function') {
      return null;
    }
    try {
      const info = getStorageInfoSync.call(api);
      return Array.isArray(info?.keys) ? info.keys : null;
    } catch {
      return null;
    }
  };

  return {
    name: 'storage',
    available: true,
    dispose: () => undefined,
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
      const keys = namespacedKeys();
      if (!keys) {
        return;
      }
      keys.filter((key) => key.startsWith(namespace)).forEach((key) => api.removeStorageSync(key));
    },
  };
}

const PRELOAD_TIMEOUT_MS = 10000;

function clampVolume(volume: number): number {
  if (!Number.isFinite(volume)) {
    return 1;
  }
  return Math.min(1, Math.max(0, volume));
}

function readDuration(ctx: MinigameInnerAudio, fallback?: number): number {
  const duration = ctx.duration;
  if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
    return duration;
  }
  return fallback ?? 0;
}

export function createMinigameAudio(
  api: MinigameAPI,
  options: { resource?: IResource } = {},
): IAudio {
  const resource = options.resource;
  const active = new Set<MinigameInnerAudio>();
  const byKey = new Map<string, Set<MinigameInnerAudio>>();
  const contextKeys = new Map<MinigameInnerAudio, string>();
  const instanceVolumes = new Map<MinigameInnerAudio, number>();
  const defaultVolumes = new Map<string, number>();
  const durations = new Map<string, number>();
  const playing = new Set<MinigameInnerAudio>();

  let masterVolume = 1;
  let muted = false;

  const sourceFor = (key: string): string => {
    const source = resource?.resolve(key);
    if (source) {
      return source.kind === 'remote' ? source.url : source.path;
    }
    return key;
  };

  const effectiveVolume = (volume: number): number =>
    muted ? 0 : clampVolume(volume * masterVolume);

  const applyMasterVolume = () => {
    active.forEach((ctx) => {
      ctx.volume = effectiveVolume(instanceVolumes.get(ctx) ?? 1);
    });
  };

  const detach = (ctx: MinigameInnerAudio): void => {
    const key = contextKeys.get(ctx);
    if (key !== undefined) {
      const set = byKey.get(key);
      if (set) {
        set.delete(ctx);
        if (set.size === 0) {
          byKey.delete(key);
        }
      }
      contextKeys.delete(ctx);
    }
    active.delete(ctx);
    instanceVolumes.delete(ctx);
    playing.delete(ctx);
    ctx.offEnded?.();
    ctx.offError?.();
    try {
      ctx.stop();
    } catch {
      // Ignore contexts that are already released.
    }
    try {
      ctx.destroy();
    } catch {
      // Ignore contexts that are already released.
    }
  };

  return {
    name: 'audio',
    available: true,
    dispose() {
      Array.from(active).forEach(detach);
      active.clear();
      byKey.clear();
      contextKeys.clear();
      instanceVolumes.clear();
      defaultVolumes.clear();
      durations.clear();
      playing.clear();
    },
    preload(key: string): Promise<number> {
      return new Promise<number>((resolve, reject) => {
        const ctx = api.createInnerAudioContext();
        let settled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;

        const finish = (callback: () => void) => {
          if (settled) {
            return;
          }
          settled = true;
          if (timer !== undefined) {
            clearTimeout(timer);
          }
          ctx.offCanplay?.();
          ctx.offError?.();
          try {
            ctx.destroy();
          } catch {
            // Ignore contexts that are already released.
          }
          callback();
        };

        const handleCanplay = () => {
          const duration = readDuration(ctx);
          durations.set(key, duration);
          finish(() => resolve(duration));
        };
        const handleError = (error: unknown) => {
          finish(() => reject(error instanceof Error ? error : new Error(describeError(error))));
        };

        ctx.onCanplay?.(handleCanplay);
        ctx.onError?.(handleError);
        ctx.src = sourceFor(key);
        timer = setTimeout(() => finish(() => resolve(0)), PRELOAD_TIMEOUT_MS);
      });
    },
    play(key: string, playOptions: AudioPlayOptions = {}): AudioHandle {
      const ctx = api.createInnerAudioContext();
      const instanceVolume = clampVolume(
        playOptions.volume ?? defaultVolumes.get(key) ?? 1,
      );
      let reported = false;

      const reportError = (error: unknown): void => {
        if (reported) {
          return;
        }
        reported = true;
        playOptions.onError?.(error);
      };

      ctx.onEnded(() => {
        detach(ctx);
        playOptions.onEnded?.();
      });
      if (ctx.onError) {
        ctx.onError((error) => {
          reportError(error);
          detach(ctx);
        });
      }

      ctx.src = sourceFor(key);
      ctx.loop = playOptions.loop ?? false;
      if (playOptions.playbackRate !== undefined) {
        ctx.playbackRate = playOptions.playbackRate;
      }
      if (playOptions.startTime !== undefined) {
        ctx.startTime = playOptions.startTime;
      }
      instanceVolumes.set(ctx, instanceVolume);
      ctx.volume = effectiveVolume(instanceVolume);

      active.add(ctx);
      contextKeys.set(ctx, key);
      let set = byKey.get(key);
      if (!set) {
        set = new Set();
        byKey.set(key, set);
      }
      set.add(ctx);

      try {
        ctx.play();
        playing.add(ctx);
      } catch (error) {
        reportError(error);
      }

      return {
        key,
        get duration() {
          return readDuration(ctx, durations.get(key));
        },
        get playing() {
          return playing.has(ctx);
        },
        pause() {
          try {
            ctx.pause();
          } catch {
            // Ignore contexts that are already released.
          }
          playing.delete(ctx);
        },
        resume() {
          try {
            ctx.play();
            playing.add(ctx);
          } catch (error) {
            reportError(error);
          }
        },
        stop() {
          detach(ctx);
        },
        setVolume(volume: number) {
          const next = clampVolume(volume);
          instanceVolumes.set(ctx, next);
          ctx.volume = effectiveVolume(next);
        },
      };
    },
    pause(key: string) {
      byKey.get(key)?.forEach((ctx) => {
        try {
          ctx.pause();
        } catch {
          // Ignore contexts that are already released.
        }
        playing.delete(ctx);
      });
    },
    resume(key: string) {
      byKey.get(key)?.forEach((ctx) => {
        try {
          ctx.play();
          playing.add(ctx);
        } catch {
          // Ignore contexts that are already released.
        }
      });
    },
    stop(key: string) {
      Array.from(byKey.get(key) ?? []).forEach(detach);
    },
    setVolume(key: string, volume: number) {
      const next = clampVolume(volume);
      defaultVolumes.set(key, next);
      byKey.get(key)?.forEach((ctx) => {
        instanceVolumes.set(ctx, next);
        ctx.volume = effectiveVolume(next);
      });
    },
    setMasterVolume(volume: number) {
      masterVolume = clampVolume(volume);
      applyMasterVolume();
    },
    setMuted(value: boolean) {
      muted = value;
      applyMasterVolume();
    },
    unlock(): Promise<void> {
      return Promise.resolve();
    },
  };
}

type MinigamePointerType = 'down' | 'move' | 'up' | 'cancel';
type MinigamePointerListener = (event: PointerEventData) => void;

function toPointers(event: MinigameTouchEvent): PointerEventData[] {
  const touches = event.changedTouches.length > 0 ? event.changedTouches : event.touches;
  return touches.map((touch, index) => ({
    x: touch.clientX,
    y: touch.clientY,
    pointerId: touch.identifier ?? index,
    pointerType: 'touch',
    isPrimary: index === 0,
    inside: true,
  }));
}

export function createMinigameInput(api: MinigameAPI): IInput {
  const listeners: Record<MinigamePointerType, MinigamePointerListener[]> = {
    down: [],
    move: [],
    up: [],
    cancel: [],
  };

  const emit = (type: MinigamePointerType) => (event: MinigameTouchEvent) => {
    const pointers = toPointers(event);
    if (pointers.length === 0) {
      return;
    }
    listeners[type].slice().forEach((fn) => {
      pointers.forEach((data) => fn(data));
    });
  };

  const handlers = {
    down: emit('down'),
    move: emit('move'),
    up: emit('up'),
    cancel: emit('cancel'),
  };

  let downAttached = false;
  let moveAttached = false;
  let upAttached = false;
  let cancelAttached = false;

  const attach = () => {
    if (!downAttached) {
      api.onTouchStart(handlers.down);
      downAttached = true;
    }
    if (!moveAttached) {
      api.onTouchMove(handlers.move);
      moveAttached = true;
    }
    if (!upAttached) {
      api.onTouchEnd(handlers.up);
      upAttached = true;
    }
    if (!cancelAttached && api.onTouchCancel) {
      api.onTouchCancel(handlers.cancel);
      cancelAttached = true;
    }
  };

  attach();

  return {
    name: 'input',
    available: true,
    bind() {
      attach();
    },
    dispose() {
      if (downAttached && api.offTouchStart) {
        api.offTouchStart(handlers.down);
        downAttached = false;
      }
      if (moveAttached && api.offTouchMove) {
        api.offTouchMove(handlers.move);
        moveAttached = false;
      }
      if (upAttached && api.offTouchEnd) {
        api.offTouchEnd(handlers.up);
        upAttached = false;
      }
      if (cancelAttached && api.offTouchCancel) {
        api.offTouchCancel(handlers.cancel);
        cancelAttached = false;
      }
      listeners.down.length = 0;
      listeners.move.length = 0;
      listeners.up.length = 0;
      listeners.cancel.length = 0;
    },
    onPointerDown(listener) {
      listeners.down.push(listener);
    },
    offPointerDown(listener) {
      const index = listeners.down.indexOf(listener);
      if (index >= 0) {
        listeners.down.splice(index, 1);
      }
    },
    onPointerMove(listener) {
      listeners.move.push(listener);
    },
    offPointerMove(listener) {
      const index = listeners.move.indexOf(listener);
      if (index >= 0) {
        listeners.move.splice(index, 1);
      }
    },
    onPointerUp(listener) {
      listeners.up.push(listener);
    },
    offPointerUp(listener) {
      const index = listeners.up.indexOf(listener);
      if (index >= 0) {
        listeners.up.splice(index, 1);
      }
    },
    onPointerCancel(listener) {
      if (!api.onTouchCancel) {
        return;
      }
      listeners.cancel.push(listener);
    },
    offPointerCancel(listener) {
      const index = listeners.cancel.indexOf(listener);
      if (index >= 0) {
        listeners.cancel.splice(index, 1);
      }
    },
    onWheel() {
      return;
    },
    offWheel() {
      return;
    },
    onKeyDown() {
      return;
    },
    offKeyDown() {
      return;
    },
    onKeyUp() {
      return;
    },
    offKeyUp() {
      return;
    },
  };
}

export function createMinigameLifecycle(api: MinigameAPI): ILifecycle {
  const showListeners: Array<() => void> = [];
  const hideListeners: Array<() => void> = [];

  const onShow = () => showListeners.forEach((fn) => fn());
  const onHide = () => hideListeners.forEach((fn) => fn());

  let showAttached = false;
  let hideAttached = false;

  const attach = () => {
    if (!showAttached && api.onShow) {
      api.onShow(onShow);
      showAttached = true;
    }
    if (!hideAttached && api.onHide) {
      api.onHide(onHide);
      hideAttached = true;
    }
  };

  attach();

  return {
    name: 'lifecycle',
    available: Boolean(api.onShow && api.onHide),
    bind() {
      attach();
    },
    dispose() {
      if (showAttached && api.offShow) {
        api.offShow(onShow);
        showAttached = false;
      }
      if (hideAttached && api.offHide) {
        api.offHide(onHide);
        hideAttached = false;
      }
      showListeners.length = 0;
      hideListeners.length = 0;
    },
    onShow(listener) {
      showListeners.push(listener);
    },
    offShow(listener) {
      const index = showListeners.indexOf(listener);
      if (index >= 0) {
        showListeners.splice(index, 1);
      }
    },
    onHide(listener) {
      hideListeners.push(listener);
    },
    offHide(listener) {
      const index = hideListeners.indexOf(listener);
      if (index >= 0) {
        hideListeners.splice(index, 1);
      }
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

  const loadImage = (key: string): Promise<IImage> => {
    const filePath = pathFor(key);
    if (!filePath) {
      return Promise.reject(new Error(`invalid resource key: ${key}`));
    }
    const remoteSrc = baseUrl ? joinAssetUrl(baseUrl, filePath) : null;
    return new Promise<IImage>((resolve, reject) => {
      const createImage = getImageFactory(api);
      if (!createImage) {
        reject(new Error(`image loading not supported for ${key}`));
        return;
      }
      const attempt = (src: string, fallback: string | null): void => {
        const image = createImage();
        image.onload = () =>
          resolve({
            key,
            source: image,
            width: image.width ?? 0,
            height: image.height ?? 0,
          });
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
    dispose: () => undefined,
    resolve(key): ResourceSource | null {
      const filePath = pathFor(key);
      return filePath ? { kind: 'local', path: filePath } : null;
    },
    resolveAsset: pathFor,
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
    dispose: () => undefined,
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

  let attached = false;

  const attach = () => {
    if (attached || !api.onDeviceOrientationChange) {
      return;
    }
    api.onDeviceOrientationChange(handleDeviceOrientationChange);
    attached = true;
  };

  attach();

  return {
    name: 'screen',
    available: true,
    bind() {
      attach();
    },
    dispose() {
      if (attached && api.offDeviceOrientationChange) {
        api.offDeviceOrientationChange(handleDeviceOrientationChange);
        attached = false;
      }
      listeners.clear();
    },
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
