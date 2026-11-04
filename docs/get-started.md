# Get Started

Neo Engine 的工程约定：根目录放 `package.neo.json`，入口固定为 `src/index.ts`，资产放 `assets/`。

```text
my-game/
  package.neo.json
  src/
    index.ts
  assets/
    textures/logo.png
    audio/bgm.mp3
```

## 1. 声明 manifest

```json
{
  "name": "my-game",
  "version": "1.0.0",
  "engine": "neo-engine@0.1.0",
  "entry": "src/index.ts"
}
```

`engine` 必须与已安装的 `@neotap.app/neo-engine` 版本完全一致（不匹配时构建与 lint 直接报错）。

## 2. 写一个 2D 游戏入口

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
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  },
  async create(ctx) {
    // 平台能力统一从 ctx 获取，禁止直接访问 window / wx / tt
    ctx.storage.set('visited', '1');

    const image = await ctx.load.loadImage('textures/logo.png');
    void image;

    ctx.input.onPointerDown((event) => {
      console.log(event.x, event.y);
    });

    await ctx.audio.unlock();
    ctx.audio.play('audio/bgm.mp3', { loop: true, volume: 0.6 });
  },
};

export default game;
```

3D 游戏把 `mode` 改为 `'3d'`，并提供 `create(ctx)`；`ctx` 中会注入 `renderer`、`scene`、`camera`，其余能力字段与 2D 一致。

## 3. 开发与构建

在工程目录执行：

```bash
neo dev                              # 本地开发服务器（默认 5173）
neo build --target h5                # 构建 H5，输出到 dist/
neo preview                          # 预览 H5 产物（默认 4173）
neo build --target wechat            # 构建微信小游戏
neo build --target douyin            # 构建抖音小游戏
neo lint                             # 静态校验
```

H5 部署到子路径或 CDN 时使用 `--base`：

```bash
neo build --target h5 --base /games/my-game/
```

## 4. 几条硬约束

- 游戏脚本只依赖 `ctx` 暴露的能力接口，不直接用浏览器 / 小游戏全局。
- `ctx.load.*` 的 key 是相对 `assets/` 的路径，如 `textures/logo.png`；构建期会校验代码里的字面量 key。
- 2D 与 3D 互不混合渲染，一个入口只选一种 `mode`。
- 音频建议在首次用户手势里调用 `await ctx.audio.unlock()`。

完整 API 见 [README.md](./README.md)。
