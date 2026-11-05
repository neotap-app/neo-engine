# buildProject

```ts
import { buildProject } from '@neotap.app/neo-engine-tools/build';

type Target = 'h5' | 'wechat' | 'douyin';

interface BuildOptions {
  cwd: string;
  target: Target;
  outDir?: string;
  base?: string;
}

interface BuildResult {
  target: Target;
  outDir: string;
}

function buildProject(options: BuildOptions): Promise<BuildResult>;
```

| 字段 | 说明 |
| --- | --- |
| `cwd` | 游戏工程根目录（含 `package.neo.json`） |
| `target` | `h5` / `wechat` / `douyin` |
| `outDir` | 产物目录，默认 `dist` |
| `base` | 仅 H5 生效，HTML/JS chunk 与 `assets/` 的基础路径；默认 `'./'` |

## 构建流程

1. 读取 `package.neo.json`，校验 manifest，并精确比对声明的 `engine` 版本与已安装的 `@neotap.app/neo-engine` 版本；
2. 任一校验失败直接抛错，不产出半成品；
3. **清空目标 `outDir`**（小游戏与 H5 一致），避免重复构建或切换 target 残留旧文件；
4. 按 target 构建，并把工程 `assets/**` 原样拷贝到产物（public 目录语义）。

构建使用工程内 `.neo-build/<pid>-<timestamp>/` 临时目录；成功、失败或异常都会在 `finally` 中清理，并顺带清理同工程内已退出进程遗留的 `.neo-build/<pid>-*`。

## 2D / 3D 与 Three.js

构建期会扫描入口的本地 import 图，识别游戏实例的 `mode`：

- `mode: '2d'`：`three` 被解析为内置 stub，2D 产物不包含 Three.js 代码，也不会产出 `three*` chunk；
- `mode: '3d'`：正常打包 `three`，并按需产出 `three.module-*.js` chunk；
- 无法静态识别时按 `3d` 处理（保守保留 `three`）。

stub 只在 2D 构建中占位；若 2D 游戏误用 Three.js，会得到明确的 “three.js is not bundled in 2D builds” 错误。需要 3D 时把入口实例改为 `mode: '3d'`。

## 产物结构

H5（`outDir` 默认 `dist`）：

```text
dist/
  index.html
  assets/                 # Vite 打包的 JS/CSS + 工程 assets/** 原样镜像，合并在此目录
```

> 工程资产保持 `assets/<key>` 相对路径，因此与 Vite 的构建资源共用 `assets/` 目录。资产自动打包，无需在 manifest 或代码中声明清单。

小游戏（`wechat` / `douyin`）：

```text
dist/
  game.js                 # 先安装 adapter，再加载 game-core
  game-core.js
  game.json
  project.config.json
  neotap-runtime/adapter.js
  assets/                 # 工程 assets/** 原样镜像
```

所有产物 JS（入口与分包 chunk）扩展名统一为 `.js`，不会生成 `.cjs`；3D 构建会额外产出 `three.module-*.js`。

## H5 base

```ts
const DEFAULT_H5_BASE = './';

function normalizeH5Base(base?: string): string;
```

- 未传返回 `'./'`；
- 去首尾空白，空字符串抛错；
- `'.'` 归一化为 `'./'`；
- 非 `/` 结尾自动补尾 `/`，如 `/games/pvz` → `/games/pvz/`；
- 保留 `./`、相对路径、`https://`、`//` 形态；
- 小游戏 target 忽略该参数。

资产寻址见 [资源 key](../assets/keys.md)，资产拷贝见 [资产拷贝](./build-assets.md)。
