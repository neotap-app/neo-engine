# 游戏实例

```ts
type GameMode = '2d' | '3d';

interface NeoGameInstance2D {
  mode: '2d';
  config: Phaser.Types.Core.GameConfig;
  create?: (ctx: GameContext2D) => void | Promise<void>;
  destroy?: (ctx: GameContext2D) => void | Promise<void>;
}

interface NeoGameInstance3D {
  mode: '3d';
  create: (ctx: GameContext3D) => void | Promise<void>;
  destroy?: (ctx: GameContext3D) => void | Promise<void>;
}

type NeoGameInstance = NeoGameInstance2D | NeoGameInstance3D;
```

- 入口文件 `export default` 一个 `NeoGameInstance`。
- `2d`：`config` 传给 `Phaser.Game`；`create` 在 Phaser 实例创建后调用，可省略。
- `3d`：`create` 必填；runtime 创建 `WebGLRenderer`、`Scene`、`PerspectiveCamera` 后调用，并自动启动渲染循环。
- `destroy` 在 `runtime.unmount()` 时调用，异常会被吞掉，异步结果不会被等待。

上下文定义见 [游戏上下文](./context.md)。
