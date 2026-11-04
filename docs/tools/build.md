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
2. 从入口遍历本地 import 图，校验代码里的字面量资产 key；
3. 任一校验失败直接抛错，不产出半成品；
4. 按 target 构建；
5. 写入 `assets-manifest.json` 与 `.neo/` 生成物。

## 产物结构

H5（`outDir` 默认 `dist`）：

```text
dist/
  index.html
  assets/                 # Vite 打包的 JS/CSS + 工程 assets/** 原样镜像，合并在此目录
  assets-manifest.json
```

> 工程资产保持 `assets/<key>` 相对路径，因此与 Vite 的构建资源共用 `assets/` 目录。

小游戏（`wechat` / `douyin`）：

```text
dist/
  game.js                 # 先安装 adapter，再加载 game-core
  game-core.js
  game.json
  project.config.json
  neotap-runtime/adapter.js
  assets/                 # 工程 assets/** 原样镜像
  assets-manifest.json
```

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

资产索引见 [资产产物与 manifest](../assets/manifest.md)，工具函数见 [资产工具](./build-assets.md)。
