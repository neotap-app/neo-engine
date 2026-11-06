# @neotap.app/neo-engine

Client runtime SDK for **Neo Engine**, a lightweight cross-platform game engine built on **Phaser 3 (2D)** and **Three.js (3D)**.

Neo Engine 的客户端运行时 SDK，基于 Phaser 3（2D）与 Three.js（3D），平台无关，可用于 H5、微信小游戏与抖音小游戏。

## Features / 特性

- **Unified runtime / 统一运行时**：`createRuntime` 负责 canvas、2D / 3D 引擎实例、能力绑定与生命周期清理。
- **Platform capabilities (RAL) / 平台能力**：存储、音频、输入、前后台生命周期、资源加载、系统信息、屏幕信息。
- **Cross-platform / 跨端**：H5、微信小游戏、抖音小游戏；小游戏产物由 `@neotap.app/neo-engine-tools` 构建。
- **Platform-agnostic game code / 平台无关游戏代码**：游戏脚本只依赖 `ctx` 暴露的能力，不直接访问 `window` / `wx` / `tt`。

## Installation / 安装

```bash
pnpm add @neotap.app/neo-engine
# or: npm install @neotap.app/neo-engine
```

环境要求：Node.js `^20.19.0 || >=22.12.0`。

## Usage / 使用

游戏入口（通常是 Neo 工程的 `src/index.ts`）：

```ts
import Phaser from 'phaser';
import type { NeoGameInstance2D } from '@neotap.app/neo-engine';

class MainScene extends Phaser.Scene {
  constructor() {
    super('main');
  }

  create() {
    this.add.text(20, 20, 'Hello Neo Engine', { fontSize: '32px', color: '#fff' });
  }
}

const game: NeoGameInstance2D = {
  mode: '2d',
  config: {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#1a1a2e',
    scene: [MainScene],
  },
  async create(ctx) {
    ctx.storage.set('visited', '1');
    ctx.input.onPointerDown((event) => {
      console.log(event.x, event.y);
    });
    await ctx.audio.unlock();
  },
};

export default game;
```

宿主或生成的引导代码挂载运行时：

```ts
import { createRuntime, createH5Capabilities } from '@neotap.app/neo-engine';

const runtime = createRuntime();
await runtime.mount({
  capabilities: createH5Capabilities(),
  mount: { element: document.getElementById('app')! },
  loadInstance: () => import('./src/index').then((module) => module.default),
});

// runtime.unmount();
```

## Documentation / 文档

- [Get Started](https://github.com/neotap-app/neo-engine/blob/main/docs/get-started.md)
- [包与导出](https://github.com/neotap-app/neo-engine/blob/main/docs/packages.md)
- [完整 API 文档](https://github.com/neotap-app/neo-engine/blob/main/docs/README.md)

## License / 许可证

[Apache License 2.0](https://github.com/neotap-app/neo-engine/blob/main/LICENSE)
