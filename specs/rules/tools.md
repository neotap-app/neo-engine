# 构建工具规范（packages/neo-engine-tools）

`@neotap.app/neo-engine-tools`（构建工具 + `neo` CLI）的编码约束与最高规则。
编译管线设计见 [/specs/features/neo-engine/README.md](/specs/features/neo-engine/README.md)。

## 边界约束

- **Node 侧，构建逻辑与 CLI 分离**：`src/build/` 暴露编程接口 `buildProject`，**不依赖 CLI**；
  `src/cli/` 只解析 argv 再调用 build，是薄壳
- 依赖 SDK（`@neotap.app/neo-engine`），**不反向被 SDK 依赖**（保持 SDK 无 node 依赖）
- `exports`：`.` / `./build`（无头构建接口）/ `./cli`；`bin: neo`
- 包产物 `dist/` 不入库

## 编译管线

- 三段式：**原工程（唯一源码）→ 转译 → 编译/发布**
- 转译用 vite，bundle 锁定 **CommonJS + ES5**；禁 `eval` / `new Function`，`Proxy` 不可用
- 编译/发布用**平台官方工具链**（微信 `miniprogram-ci`；抖音走 IDE/IDE CLI）
- 小游戏产物为**双 chunk**：保证 adapter 先于引擎加载

### H5 资源基础路径（base）

- H5 产物的 **HTML/JS chunk URL** 由 vite `base` 决定；public `assets/` 目录（P0-2 落地后：原样拷贝、按相对路径直接访问、无 manifest）也基于同一 `base` 解析
- **默认 `'./'`**（相对路径），产物同时可用于根路径与子路径部署
- 需要固定前缀（子路径 / CDN）时用 `BuildOptions.base` 或 CLI `--base <path>` / `--base=<path>` 覆盖，例如 `/games/pvz/`
- API 与 CLI 共用 `normalizeH5Base` 归一化：去首尾空白、拒绝空/纯空白；**非 `/` 结尾补尾 `/`**。因此 `/games/pvz` ≡ `/games/pvz/`；`./` 保持 `./`；相对路径（如 `game/`）保持相对并补尾 `/`；绝对 URL（如 `https://cdn.example.com/game`）与 `//` 只补尾 `/`，不破坏 scheme
- `base` **仅 H5 生效**；`wechat` / `douyin` 等小游戏 target 忽略该参数，行为不变

## 扩展方式

- 新增平台 target = 在 `src/build/platforms/<target>.ts` 加实现，并在 `buildProject` 的 `switch` 中分派
- 打包参数（分包策略 / 资源远程-本地 / target 等）由 CLI/接口传入，**不进 manifest**
