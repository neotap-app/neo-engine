# 游戏上下文

```ts
interface GameContext {
  mode: GameMode;
  manifest: NeoManifest | null;
  canvas: ICanvas;
  storage: IStorage;
  audio: IAudio;
  input: IInput;
  lifecycle: ILifecycle;
  load: IResource;
  system: ISystem;
  screen: IScreen;
}

interface GameContext2D extends GameContext {
  mode: '2d';
  game: Phaser.Game;
}

interface GameContext3D extends GameContext {
  mode: '3d';
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
}
```

| 字段 | 说明 |
| --- | --- |
| `mode` | `'2d'` / `'3d'` |
| `manifest` | 引导方注入的 `NeoManifest`；未注入为 `null` |
| `canvas` | 当前渲染使用的 `ICanvas` |
| `storage` | 本地存储，见 [IStorage](../capabilities/storage.md) |
| `audio` | 音频，见 [IAudio](../capabilities/audio.md) |
| `input` | 输入，见 [IInput](../capabilities/input.md) |
| `lifecycle` | 前后台生命周期，见 [ILifecycle](../capabilities/lifecycle.md) |
| `load` | 资源加载（`IResource`），见 [IResource](../capabilities/resource.md) |
| `system` | 平台 / 运行时 / 设备信息，见 [ISystem](../capabilities/system.md) |
| `screen` | 屏幕与方向信息，见 [IScreen](../capabilities/screen.md) |
| `game` | 仅 2D，`Phaser.Game` |
| `renderer` / `scene` / `camera` | 仅 3D |

`load` 就是 `CapabilityBundle.resource`，见 [能力总览](../capabilities/README.md)。
