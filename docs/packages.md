# 包与导出

## `@neotap.app/neo-engine`

纯客户端 SDK，公共入口只有包根导出：

```ts
import {
  createRuntime,
  createH5Capabilities,
  createWechatCapabilities,
  createDouyinCapabilities,
  NeoManifest,
} from '@neotap.app/neo-engine';
```

顶层导出分组：

| 分组 | 导出 |
| --- | --- |
| manifest | `NeoManifest`、`NeoManifestData`、`ParsedEngineRuntime`、`ManifestParseError`、`NEO_ENGINE_RUNTIME_PREFIX`、`DEFAULT_ENTRY` |
| 游戏入口 | `GameMode`、`NeoGameInstance`、`NeoGameInstance2D`、`NeoGameInstance3D`、`GameContext`、`GameContext2D`、`GameContext3D` |
| runtime | `createRuntime`、`NeoRuntime`、`RuntimeOptions`、`MountPoint`、`FrameRequest`、`FrameCancel` |
| 跨端契约 | `ICanvas`、`CanvasHost`、`Capability`、`CapabilityBindings`、`CapabilityBundle` |
| 能力接口 | `IStorage`、`IAudio`、`IInput`、`ILifecycle`、`IResource`、`ISystem`、`IScreen` |
| 能力数据类型 | `StorageValue`、`AudioPlayOptions`、`AudioHandle`、`PointerEventData`、`WheelEventData`、`KeyEventData`、`ResourceSource`、`IImage`、`Orientation`、`SafeArea`、`ScreenInfo`、`PlatformName`、`RuntimeInfo`、`DeviceInfo`、`EnvironmentInfo` |
| no-op 降级 | `createNoopStorage`、`createNoopAudio`、`createNoopInput`、`createNoopLifecycle`、`createNoopResource`、`createNoopSystem`、`createNoopScreen` |
| H5 | `createH5Capabilities`、`H5Capabilities`、`H5CapabilityOptions` |
| 小游戏通用 | `createMinigameCapabilities`、`createMinigameRuntimeEnvironment`、`detectMinigame`、`detectMinigameAPI`、`MinigameCapabilities`、`MinigameAPI`、`MinigameAdapter`、`createMinigameAdapter`、`MinigameCapabilityOptions`、`MinigameStorageOptions` |
| 微信 | `getWechatAPI`、`createWechatCapabilities`、`createWechatRuntimeEnvironment`、`WechatCapabilities` |
| 抖音 | `getDouyinAPI`、`createDouyinCapabilities`、`createDouyinRuntimeEnvironment`、`DouyinCapabilities` |

小游戏 API 还导出以下结构类型：`MinigameStorage`、`MinigameInnerAudio`、`MinigameTouch`、`MinigameTouchEvent`、`MinigameCanvas`、`MinigameFileSystemManager`、`MinigameImage`、`MinigameRequestOptions`、`MinigameSafeArea`、`MinigameSystemInfo`。

详见 [MinigameAPI](./platforms/minigame/api.md)。

## `@neotap.app/neo-engine-tools`

Node 侧构建工具与 CLI，导出子路径：

| 子路径 | 说明 |
| --- | --- |
| `@neotap.app/neo-engine-tools/build` | 无头构建接口 `buildProject` 及资产/路径工具 |
| `@neotap.app/neo-engine-tools/cli` | `runCLI`、`startDevServer`、`startPreviewServer` |
| `bin: neo` | 命令行入口 |

`./build` 导出：`buildProject`、`Target`、`BuildOptions`、`BuildResult`、`TargetBuildOptions`、`normalizeH5Base`、`DEFAULT_H5_BASE`、`copyAssets`。

详见 [构建工具总览](./tools/README.md)。
