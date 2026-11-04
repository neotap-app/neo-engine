# MinigameAPI 与结构类型

`MinigameAPI` 是微信/抖音 API 的最小公共抽象。

## MinigameAPI

```ts
interface MinigameAPI {
  createCanvas(): MinigameCanvas;
  createImage?(): MinigameImage;
  getFileSystemManager?(): MinigameFileSystemManager;
  request?(options: MinigameRequestOptions): unknown;
  getStorageSync(key: string): unknown;
  setStorageSync(key: string, value: unknown): void;
  removeStorageSync(key: string): void;
  clearStorageSync(): void;
  getStorageInfoSync?(): { keys: string[] };
  createInnerAudioContext(): MinigameInnerAudio;
  onTouchStart(callback: (event: MinigameTouchEvent) => void): void;
  offTouchStart?(callback: (event: MinigameTouchEvent) => void): void;
  onTouchMove(callback: (event: MinigameTouchEvent) => void): void;
  offTouchMove?(callback: (event: MinigameTouchEvent) => void): void;
  onTouchEnd(callback: (event: MinigameTouchEvent) => void): void;
  offTouchEnd?(callback: (event: MinigameTouchEvent) => void): void;
  onTouchCancel?(callback: (event: MinigameTouchEvent) => void): void;
  offTouchCancel?(callback: (event: MinigameTouchEvent) => void): void;
  onShow?(callback: () => void): void;
  offShow?(callback: () => void): void;
  onHide?(callback: () => void): void;
  offHide?(callback: () => void): void;
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
```

## 结构类型

```ts
interface MinigameCanvas {
  width: number;
  height: number;
  getContext(type: string, attributes?: Record<string, unknown>): unknown;
  addEventListener?(type: string, listener: () => void): void;
  removeEventListener?(type: string, listener: () => void): void;
}

interface MinigameImage {
  src: string;
  width?: number;
  height?: number;
  onload?: () => void;
  onerror?: (error: unknown) => void;
}

interface MinigameTouch {
  clientX: number;
  clientY: number;
  identifier?: number;
}

interface MinigameTouchEvent {
  touches: MinigameTouch[];
  changedTouches: MinigameTouch[];
}

interface MinigameInnerAudio {
  src: string;
  loop: boolean;
  volume: number;
  duration?: number;
  playbackRate?: number;
  startTime?: number;
  seek?(time: number): void;
  play(): void;
  pause(): void;
  stop(): void;
  destroy(): void;
  onEnded(callback: () => void): void;
  offEnded?(): void;
  onError?(callback: (error: unknown) => void): void;
  offError?(): void;
  onCanplay?(callback: () => void): void;
  offCanplay?(): void;
}

interface MinigameStorage {
  getStorageSync(key: string): unknown;
  setStorageSync(key: string, value: unknown): void;
  removeStorageSync(key: string): void;
  clearStorageSync(): void;
  getStorageInfoSync?(): { keys: string[] };
}

interface MinigameFileSystemManager {
  readFileSync(filePath: string, encoding?: string): string | ArrayBuffer;
}

interface MinigameRequestOptions {
  url: string;
  method?: string;
  dataType?: string;
  responseType?: 'text' | 'arraybuffer';
  success?: (res: { statusCode?: number; data: unknown }) => void;
  fail?: (error: unknown) => void;
}

interface MinigameSafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface MinigameSystemInfo {
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
```

## 自动检测

```ts
function detectMinigameAPI(): { api: MinigameAPI; namespace: 'wechat' | 'douyin' } | null;
function detectMinigame(): { api: MinigameAPI; namespace: 'wechat' | 'douyin' } | null;
```

按全局 `wx` / `tt` 自动识别；`detectMinigame()` 是 `detectMinigameAPI()` 的便捷封装。
