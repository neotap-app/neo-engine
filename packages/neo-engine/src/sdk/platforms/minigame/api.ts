export interface MinigameStorage {
  getStorageSync(key: string): unknown;
  setStorageSync(key: string, value: unknown): void;
  removeStorageSync(key: string): void;
  clearStorageSync(): void;
}

export interface MinigameInnerAudio {
  src: string;
  loop: boolean;
  volume: number;
  play(): void;
  pause(): void;
  stop(): void;
  destroy(): void;
  onEnded(callback: () => void): void;
}

export interface MinigameTouch {
  clientX: number;
  clientY: number;
}

export interface MinigameTouchEvent {
  touches: MinigameTouch[];
  changedTouches: MinigameTouch[];
}

export interface MinigameCanvas {
  width: number;
  height: number;
  getContext(type: string, attributes?: Record<string, unknown>): unknown;
  addEventListener?(type: string, listener: () => void): void;
  removeEventListener?(type: string, listener: () => void): void;
}

export interface MinigameFileSystemManager {
  readFileSync(filePath: string, encoding?: string): string | ArrayBuffer;
}

export interface MinigameImage {
  src: string;
  width?: number;
  height?: number;
  onload?: () => void;
  onerror?: (error: unknown) => void;
}

export interface MinigameRequestOptions {
  url: string;
  method?: string;
  dataType?: string;
  responseType?: 'text' | 'arraybuffer';
  success?: (res: { statusCode?: number; data: unknown }) => void;
  fail?: (error: unknown) => void;
}

export interface MinigameSafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface MinigameSystemInfo {
  brand?: string;
  model?: string;
  system?: string;
  platform?: string;
  language?: string;
  version?: string;
  SDKVersion?: string;
  pixelRatio?: number;
  screenWidth?: number;
  screenHeight?: number;
  windowWidth?: number;
  windowHeight?: number;
  statusBarHeight?: number;
  safeArea?: MinigameSafeArea;
}

export interface MinigameAPI {
  createCanvas(): MinigameCanvas;
  createImage?(): MinigameImage;
  getFileSystemManager?(): MinigameFileSystemManager;
  request?(options: MinigameRequestOptions): unknown;
  getStorageSync(key: string): unknown;
  setStorageSync(key: string, value: unknown): void;
  removeStorageSync(key: string): void;
  clearStorageSync(): void;
  createInnerAudioContext(): MinigameInnerAudio;
  onTouchStart(callback: (event: MinigameTouchEvent) => void): void;
  onTouchMove(callback: (event: MinigameTouchEvent) => void): void;
  onTouchEnd(callback: (event: MinigameTouchEvent) => void): void;
  onShow?(callback: () => void): void;
  onHide?(callback: () => void): void;
  getSystemInfoSync?(): MinigameSystemInfo;
  getDeviceInfo?(): Partial<MinigameSystemInfo>;
  getAppBaseInfo?(): Partial<MinigameSystemInfo>;
  getSDKVersion?(): string;
  setDeviceOrientation?(options: {
    value: 'portrait' | 'landscape';
    success?: () => void;
    fail?: () => void;
  }): void;
  onDeviceOrientationChange?(callback: (res: { deviceOrientation?: 'portrait' | 'landscape' }) => void): void;
  offDeviceOrientationChange?(callback: (res: { deviceOrientation?: 'portrait' | 'landscape' }) => void): void;
}

export function detectMinigameAPI(): { api: MinigameAPI; namespace: 'wechat' | 'douyin' } | null {
  if (typeof globalThis !== 'undefined') {
    const g = globalThis as Record<string, unknown>;
    if (typeof g.wx !== 'undefined') {
      return { api: g.wx as MinigameAPI, namespace: 'wechat' };
    }
    if (typeof g.tt !== 'undefined') {
      return { api: g.tt as MinigameAPI, namespace: 'douyin' };
    }
  }
  return null;
}
