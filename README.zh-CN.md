# Neo Engine

**轻量化跨平台 JS 游戏框架**

基于 **Phaser（2D）+ Three.js（3D）** 的**跨平台轻量化 JavaScript/TypeScript 游戏框架**。

[English](./README.md)

## 特性

- **一次编写，多端发布** — 一份代码即可构建发布为 **HTML5 游戏** / **独立客户端游戏**（Android / iOS / 桌面平台等）/ **NeoTap 小游戏** / **微信小游戏** / **抖音小游戏**。
- **多平台运行时 SDK** — 封装跨平台运行时，提供**本地存档存储**、**广告变现**、**资源加载优化**、**设备信息**、**社交分享**等丰富能力，助力游戏快速上线。

## 包结构

| 包 | 说明 |
| --- | --- |
| `@neotap.app/neo-engine` | 客户端运行时 SDK（manifest、平台能力、`createRuntime`） |
| `@neotap.app/neo-engine-tools` | 构建工具 + `neo` CLI（无头构建接口 `buildProject`） |

## CLI

在游戏工程目录（含 `package.neo.json`）运行 `neo`：

| 命令 | 说明 |
| --- | --- |
| `neo lint` | 校验 manifest、入口与本地 import 图（禁止平台/浏览器全局、`eval`、`new Function`、`Proxy`） |
| `neo build --target <h5\|wechat\|douyin> [--outDir <dir>]` | 构建项目 |
| `neo dev [--port <n>] [--host <addr>]` | 启动带 HMR 的 Vite 开发服务器（默认端口 `5173`） |
| `neo preview [--outDir <dir>] [--port <n>] [--host <addr>]` | 预览 H5 构建产物（默认 `dist`，端口 `4173`） |
| `neo help` | 显示帮助 |

## 仓库

pnpm workspace monorepo：`packages/*` 为框架，`examples/*` 为示例游戏。架构、决策与约定见 `AGENTS.md` 与 `specs/`。
