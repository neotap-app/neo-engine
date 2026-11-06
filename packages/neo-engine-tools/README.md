# @neotap.app/neo-engine-tools

Build tools and CLI for **Neo Engine**: transpile and bundle a Neo project into **H5**, **WeChat mini game**, or **Douyin mini game** output.

Neo Engine 的 Node 侧构建工具与 CLI：把原工程转译、打包为 H5 / 微信小游戏 / 抖音小游戏产物，并提供无头构建接口。

## Installation / 安装

```bash
pnpm add -D @neotap.app/neo-engine-tools
# or: npm install -D @neotap.app/neo-engine-tools
```

安装后会同时安装运行时依赖 `@neotap.app/neo-engine`，并提供 `neo` 命令。

环境要求：Node.js `^20.19.0 || >=22.12.0`。

## Project layout / 工程结构

```text
my-game/
  package.neo.json   # manifest
  src/
    index.ts         # export default 一个 NeoGameInstance
  assets/            # 资产目录，构建时原样拷贝
```

`package.neo.json`：

```json
{
  "name": "my-game",
  "version": "1.0.0",
  "engine": "neo-engine@0.1.2",
  "entry": "src/index.ts"
}
```

`engine` 必须与已安装的 `@neotap.app/neo-engine` 版本完全一致。

## CLI

在含 `package.neo.json` 的工程目录运行：

```bash
neo lint                              # 静态校验 manifest、入口与 import 图
neo build --target h5                 # 构建 H5（默认 target）
neo build --target wechat             # 构建微信小游戏
neo build --target douyin             # 构建抖音小游戏
neo dev                               # 启动 Vite 开发服务器（默认 5173）
neo preview                           # 预览 H5 产物（默认 4173）
```

常用参数：

| 参数 | 适用命令 | 说明 |
| --- | --- | --- |
| `--target <h5\|wechat\|douyin>` | `build` | 目标平台，默认 `h5` |
| `--outDir <dir>` / `-o <dir>` | `build`、`preview` | 产物目录，默认 `dist` |
| `--base <path>` | `build` | 仅 H5，HTML/JS chunk 与 `assets/` 的基础路径，默认 `./` |
| `--port <n>` / `-p <n>` | `dev`、`preview` | 监听端口 |
| `--host <addr>` | `dev`、`preview` | 监听地址，裸 `--host` 等价 `0.0.0.0` |

## Headless build API / 无头构建接口

```ts
import { buildProject } from '@neotap.app/neo-engine-tools/build';

const result = await buildProject({
  cwd: process.cwd(),
  target: 'h5', // 'h5' | 'wechat' | 'douyin'
  outDir: 'dist',
  base: './', // H5 only
});

console.log(result.target, result.outDir);
```

## Documentation / 文档

- [Get Started](https://github.com/neotap-app/neo-engine/blob/main/docs/get-started.md)
- [CLI 命令](https://github.com/neotap-app/neo-engine/blob/main/docs/tools/cli.md)
- [buildProject](https://github.com/neotap-app/neo-engine/blob/main/docs/tools/build.md)
- [完整 API 文档](https://github.com/neotap-app/neo-engine/blob/main/docs/README.md)

## License / 许可证

[Apache License 2.0](https://github.com/neotap-app/neo-engine/blob/main/LICENSE)
