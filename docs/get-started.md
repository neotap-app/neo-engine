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

## 0. 前置条件与安装

- Node.js：`^20.19.0 || >=22.12.0`（Vite 8 / rolldown 的最低要求）
- pnpm：`10.12.3`

```bash
corepack enable
corepack prepare pnpm@10.12.3 --activate
```

### 当前 monorepo / workspace

游戏工程位于本仓库或通过 pnpm workspace 关联时，依赖直接使用 `workspace:*`：

```json
{
  "dependencies": {
    "@neotap.app/neo-engine": "workspace:*"
  },
  "devDependencies": {
    "@neotap.app/neo-engine-tools": "workspace:*"
  }
}
```

在仓库根执行 `pnpm install`（会自动构建两个包）或 `pnpm build`，随后在游戏工程中运行 `pnpm exec neo ...`（或把 `neo` 写进 `package.json` scripts）。

### 从 npm 安装

```bash
pnpm add @neotap.app/neo-engine
pnpm add -D @neotap.app/neo-engine-tools
pnpm exec neo lint
```

`@neotap.app/neo-engine-tools` 提供 `neo` 命令（`bin: neo`），安装后即可在工程脚本中直接调用。

## 1. 声明 manifest

```json
{
  "name": "my-game",
  "version": "1.0.0",
  "engine": "neo-engine@0.1.2",
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

    const image = await ctx.load.loadImage('/textures/logo.png');
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
- `assets/**` 自动打包，无需声明清单；`ctx.load.*` 的 key 直接用 `/textures/logo.png`（等价 `assets/textures/logo.png`）。
- 2D 与 3D 互不混合渲染，一个入口只选一种 `mode`。
- 音频建议在首次用户手势里调用 `await ctx.audio.unlock()`。

完整 API 见 [README.md](./README.md)。
