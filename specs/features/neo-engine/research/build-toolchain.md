# 调研：小游戏构建工具链与包体/分包限制

> 调研日期 2026-10-05，均基于官方文档与活跃 npm 包核实。用于 B1 工具链选型。

## 包体/分包限制（官方当前数值）

| 平台 | 主包 | 总包 | 单个分包 | 独立分包 |
| --- | --- | --- | --- | --- |
| 微信小游戏 | ≤ 4M | ≤ 30M（主包+全部分包） | 不限大小 | ≤ 4M |
| 抖音小游戏 | ≤ 4M | ≤ 20M（未分包单次上传 / 分包整体） | ≤ 20M | 开放数据域 ≤ 4M |

- 微信：分包在 `game.json` 的 `subpackages` 配置；下载 `wx.loadSubpackage()`，预下载 `wx.preDownloadSubpackage()`（基础库 ≥3.4.9）。上传仅白名单扩展名（png/jpg/js/json/wasm/glb/astc 等 69 种）；`*.js` 与 `game.json` 会被编译。
- 抖音：IDE 1.1.0+ 起生效；IDE 计算包体积不含 dot 文件、`node_modules`、`js.map`。
- 注意：普通微信**小程序**是「总包 30M、单包 2M」，与小游戏（单分包不限）不同，勿混用。

来源：
- https://developers.weixin.qq.com/minigame/dev/guide/base-ability/code-package.html
- https://developers.weixin.qq.com/minigame/dev/guide/base-ability/subPackage/useSubPackage.html
- https://developers.weixin.qq.com/miniprogram/dev/framework/subpackages.html
- https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/guide/dev-guide/bytedance-mini-game

## 小游戏运行时环境与 JS 语法约束

- 引擎：微信 = iOS JavaScriptCore / Android V8 / 开发者工具 NW.js；抖音 = iOS JavaScriptCore / Android V8 / 开发者工具 Electron。
- **不支持动态执行**：`eval`、`new Function`。**`Proxy` 无法 polyfill**。
- iOS ≤15 的 `Promise` 由 `setTimeout` 模拟（时序与标准不一致），iOS16+ 正常。
- **模块化：支持 CommonJS**（`module.exports`/`require`，全局对象 `GameGlobal`）；**不直接支持 `node_modules`**；无原生 ES Module，import 需在构建期转 CommonJS/平台模块。
- 官方解法：开启 ES6→ES5 编译（babel7 + preset-env，目标 `{chrome:53, ios:8}`，按需 `regeneratorRuntime` 支持 async/await），基础库内置 core-js polyfill。
- **结论：现代 TS/ES2020+ 源码必须经转译降级**，平台工具在编译环节还会再做一次 ES6→ES5（黑盒、不可编程）。

来源：
- https://developers.weixin.qq.com/minigame/dev/guide/runtime/env.html
- https://developers.weixin.qq.com/minigame/dev/guide/runtime/js-support.html
- https://developers.weixin.qq.com/miniprogram/dev/devtools/codecompile.html
- https://developers.weixin.qq.com/minigame/dev/guide/base-ability/module.html

## 构建/发布流程（官方）

### 微信
- **miniprogram-ci**（官方 npm，活跃维护）：从开发者工具抽离的编译模块，**明确支持小游戏**（`type: 'miniGame'`）。Node 脚本 + 命令行；能力：上传、预览、构建 npm、sourceMap、jsserver 上传、静态依赖分析。
- 鉴权：管理员在微信公众平台生成代码上传密钥（private key）+ IP 白名单。
- `projectPath` = `project.config.json` 所在目录。编译设置含 `es6/es7/minifyJS/codeProtect`（平台自带 ES6→ES5）。
- 产物目录需含：`game.js`（入口）、`game.json`（全局配置，含 subpackages）、`project.config.json`。
- 另有开发者工具命令行（`cli`）与 HTTP（`http`）调用方式。

来源：
- https://developers.weixin.qq.com/miniprogram/dev/devtools/ci.html
- https://www.npmjs.com/package/miniprogram-ci

### 抖音
- **抖音开发者工具（IDE）是主发布入口**：编译/预览（二维码）/真机调试/上传（版本号+更新日志，进审核预检），上传后到开发者平台「版本管理」提审。测试号不支持上传。
- **IDE CLI（官方）**支持指定测试通道上传（多测试版本仅限抖音/极速版/火山版 ≥31.6.0）。
- `@douyin-minigame/cli`（`dymg`）是**数据/登录 CLI，不是上传工具**，别误用。
- 产物文件：`game.js`、`game.json`、`project.config.json`（IDE 编译条件读取）。
- Cocos/Laya/Egret 已官方适配，可从引擎直接导出抖音小游戏产物。

来源：
- https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/dev-tools/mini-app-developer-instrument
- https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/developer-instrument/development-assistance/ide-cli
- https://www.npmjs.com/package/@douyin-minigame/cli

## 社区构建工具链现状

- **无成熟、持续维护的「web→微信/抖音小游戏」vite 插件**；社区多为「vite/esbuild 打包成单 JS + 资源 → 拷入小游戏目录」的自组装。
- 官方 TS 类型：`minigame-api-typings`（微信）、`@douyin-minigame/api-typings`（抖音），均活跃。
- TST（字节 TS 转换工具）：**未在 ByteDance 官方 GitHub 找到公开仓库**，属工具链内嵌/文档化工具。
- 行业通行模式：各厂商官方 CI 上传（`@vivo-minigame/cli`、`@oppo-minigame/cli`、`jd-minigame-ci`）。

## 工具链选型结论

- **转译（transpile）：用 vite**，bundle 目标锁定 **CommonJS + ES5 兼容**。理由：
  1. 平台运行时是 CommonJS、禁 `eval/new Function`、`Proxy` 不可用、不支持 node_modules 直引 —— 必须转译期处理（树摇、分包、polyfill），vite（rollup 内核）对 code-splitting 与分包边界控制优于 esbuild。
  2. 平台「编译」环节的 ES6→ES5 是黑盒不可编程；把降级/模块化留在 vite 侧（`@vitejs/plugin-legacy` 或 babel preset-env）显式输出 ES5+CommonJS，行为可预期、可测试。
  3. 需要极致转译速度时可退化为 esbuild，但 esbuild 不做完整分包/代码分块，需自行处理分包输出。
- **编译/发布：用平台官方工具**。微信 = `miniprogram-ci`（`type:'miniGame'`，可全 CI 化）；抖音 = 开发者工具/IDE CLI 上传 → 平台提审。
- **不做纯社区 vite-plugin**（无主流维护项）；「vite 转译 + 官方工具上传」自组装是最低风险、最贴官方接口。
- **跨端**：微信/抖音约束高度相似（CommonJS、总包 30M/20M、主包 4M、文件白名单、禁动态执行），**同一份 vite 管线 + 平台差异化输出目录**可覆盖两端，只需分别接各自官方「编译/发布」通道。
