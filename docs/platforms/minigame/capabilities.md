# 小游戏能力工厂

```ts
interface MinigameCapabilityOptions {
  platform?: PlatformName;
  manifest?: NeoManifest | null;
  storage?: MinigameStorageOptions;
  resource?: { baseUrl?: string };
}

interface MinigameStorageOptions {
  prefix?: string;
  namespace?: string;
}

function createMinigameCapabilities(
  api: MinigameAPI,
  options?: MinigameCapabilityOptions,
): MinigameCapabilities;

interface MinigameCapabilities extends CapabilityBundle {
  storage: IStorage;
  audio: IAudio;
  input: IInput;
  lifecycle: ILifecycle;
  resource: IResource;
  system: ISystem;
  screen: IScreen;
}
```

## 能力行为

| 能力 | 说明 |
| --- | --- |
| storage | 同命名空间规则；`clear()` 依赖 `getStorageInfoSync().keys`，拿不到时不清空 |
| audio | `createInnerAudioContext`；`preload` 10s 超时 resolve `0`；`unlock` 直接 resolve |
| input | 仅触摸；`pointercancel` 仅在平台提供 `onTouchCancel` 时可用；键盘/滚轮为空操作 |
| lifecycle | 平台提供 `onShow` + `onHide` 时 `available` 为 `true` |
| resource | 先读包内 `assets/**`（`readFileSync`）；配置 `baseUrl` 时回退 `request`；图片走 `createImage` / 全局 `createImage` |
| system | 读取 `getSystemInfoSync` / `getDeviceInfo` / `getAppBaseInfo` / `getSDKVersion` |
| screen | 方向以 `windowWidth` / `windowHeight` 判定；支持时可用 `setDeviceOrientation` 主动改方向 |

- `platform` 缺省时取 `detectMinigameAPI()?.namespace ?? 'wechat'`。
- `storage.namespace` 缺省取 `manifest.name`，再缺省为 `game`。
- 资源 key 与 H5 一致，见 [资源 key](../../assets/keys.md)。

接口语义见 [平台能力](../../capabilities/README.md)。
