# Neo Engine

**轻量化跨平台 JS 游戏框架**

**A lightweight, cross-platform JavaScript / TypeScript game framework.**

基于 **Phaser（2D）+ Three.js（3D）** 的**跨平台轻量化 JavaScript/TypeScript 游戏框架**。

A lightweight, cross-platform **JavaScript / TypeScript game framework** built on **Phaser (2D) + Three.js (3D)**.

## 特性 / Features

- **一次编写，多端发布** — 一份代码即可构建发布为 **HTML5 游戏** / **独立客户端游戏**（Android / iOS / 桌面平台等）/ **NeoTap 小游戏** / **微信小游戏** / **抖音小游戏**。
- **Write once, ship everywhere** — a single codebase builds and publishes to **HTML5 games**, **standalone client games** (Android / iOS / desktop, etc.), **NeoTap mini games**, **WeChat mini games**, and **Douyin mini games**.
- **多平台运行时 SDK** — 封装跨平台运行时，提供**本地存档存储**、**广告变现**、**资源加载优化**、**设备信息**、**社交分享**等丰富能力，助力游戏快速上线。
- **Multi-platform runtime SDK** — a unified cross-platform runtime provides rich capabilities such as **local save storage**, **ad monetization**, **optimized asset loading**, **device info**, and **social sharing**, helping you launch fast.

## 包结构 / Packages

| 包 / Package | 说明 / Description |
| --- | --- |
| `@neotap.app/neo-engine` | 客户端运行时 SDK（manifest、平台能力、`createRuntime`）<br>Client runtime SDK (manifest, platform capabilities, `createRuntime`) |
| `@neotap.app/neo-engine-tools` | 构建工具 + `neo` CLI（无头构建接口 `buildProject`）<br>Build tools + `neo` CLI (headless `buildProject` API) |

## CLI

在游戏工程目录（含 `package.neo.json`）运行 `neo`：

Run `neo` in a game project directory (contains `package.neo.json`):

| 命令 / Command | 说明 / Description |
| --- | --- |
| `neo lint` | 校验 manifest、入口与本地 import 图（禁止平台/浏览器全局、`eval`、`new Function`、`Proxy`）<br>Validate the manifest, entry, and local import graph (forbidden platform/browser globals, `eval`, `new Function`, `Proxy`) |
| `neo build --target <h5\|wechat\|douyin> [--outDir <dir>]` | 构建项目<br>Build the project |
| `neo dev [--port <n>] [--host <addr>]` | 启动带 HMR 的 Vite 开发服务器（默认端口 `5173`）<br>Start a Vite dev server with HMR (default port `5173`) |
| `neo preview [--outDir <dir>] [--port <n>] [--host <addr>]` | 预览 H5 构建产物（默认 `dist`，端口 `4173`）<br>Serve an H5 build output (default `dist`, port `4173`) |
| `neo help` | 显示帮助<br>Show help |

## 仓库 / Repository

pnpm workspace monorepo：`packages/*` 为框架，`examples/*` 为示例游戏。架构、决策与约定见 `AGENTS.md` 与 `specs/`。

pnpm workspace monorepo: `packages/*` for the framework, `examples/*` for sample games. See `AGENTS.md` and `specs/` for architecture, decisions, and conventions.
