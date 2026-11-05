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
- 小游戏产物所有 JS（入口与 chunk）扩展名统一为 `.js`，**禁止 `.cjs`**（微信/抖音上传白名单）；通过 `build.rolldownOptions.output.chunkFileNames` 固定 chunk 名，入口名仍由 `lib.fileName` 决定
- **每次构建前清空 `outDir`**（小游戏与 H5 一致）：小游戏走 `prepareOutputDir`，拒绝会包含工程根的路径；Vite 侧 `emptyOutDir: false` 避免 “outDir is not inside project root” 警告
- 构建期扫描入口本地 import 图识别 `mode`：`2d` 时将 `three` 解析为内置 stub，不产出/依赖 Three.js chunk；`3d` 正常打包 `three`；无法识别时按 `3d` 处理
- 构建临时目录为 `.neo-build/<pid>-<timestamp>/`（与 `.neo-dev` 一致）；成功/失败/异常在 `finally` 清理，并在启动时清理已退出进程遗留目录；`.gitignore` 与 lint 的 `.neo-build` 排除规则覆盖整个目录
- 资产管线：H5 与小游戏都由 `src/build/assets.ts` 统一处理
  - 构建结束后把工程 `assets/**` 原样镜像到产物 `assets/**`（public 目录语义），保持目录结构；`copyAssets` 是唯一职责
  - **不生成** `assets-manifest.json` / `.neo/assets.d.ts`，也**不在 lint/build 阶段校验资产 key**；资产发现完全由 `assets/**` 目录决定，新增文件无需声明
- key 归一化与 SDK 保持一致：`/textures/a.png`、`textures/a.png`、`assets/textures/a.png`、`./assets/textures/a.png` 等价；空 key、`..` 穿越、绝对 URL/协议、`//` 开头的路径视为非法
- 寻址：`IResource.resolveAsset(key)` 统一解析为 `assets/<key>`；H5 以 `import.meta.env.BASE_URL` 为 base 返回 URL，小游戏返回包内相对路径
- 资产复制结果属于构建产物，不入库
- 详细语义见 [asset-pipeline.md](/specs/features/neo-engine/asset-pipeline.md)；hash 缓存 / 压缩 / 图集合并 / 预加载 / 进度属于后续阶段，本次不做

### H5 资源基础路径（base）

- H5 产物的 **HTML/JS chunk URL** 由 vite `base` 决定；public `assets/` 目录（P0-2 落地后：原样拷贝、按相对路径直接访问、无 manifest）也基于同一 `base` 解析
- **默认 `'./'`**（相对路径），产物同时可用于根路径与子路径部署
- 需要固定前缀（子路径 / CDN）时用 `BuildOptions.base` 或 CLI `--base <path>` / `--base=<path>` 覆盖，例如 `/games/pvz/`
- API 与 CLI 共用 `normalizeH5Base` 归一化：去首尾空白、拒绝空/纯空白；**非 `/` 结尾补尾 `/`**。因此 `/games/pvz` ≡ `/games/pvz/`；`./` 保持 `./`；相对路径（如 `game/`）保持相对并补尾 `/`；绝对 URL（如 `https://cdn.example.com/game`）与 `//` 只补尾 `/`，不破坏 scheme
- `base` **仅 H5 生效**；`wechat` / `douyin` 等小游戏 target 忽略该参数，行为不变

## 开发回路（dev / preview）

- `neo dev`：在工程内创建 `.neo-dev/<pid>-<timestamp>/` 临时根目录，写入 `index.html` + bootstrap（复用 H5 bootstrap，import manifest 入口的绝对路径），启动 Vite dev server
  - 同步复制工程 `assets/**` 到临时根目录，dev 下按 public 目录语义直接请求 `assets/**`
  - bootstrap 注入 `NeoManifest`，并以 `baseUrl: './'` 创建 H5 能力，保证 dev 与 H5 产物的资源行为一致
  - 监听入口所在目录与工程 `src/`，源码变更走 Vite HMR / 刷新
  - `--port <n>`（默认 5173，被占用时由 Vite 顺延）、`--host <addr>`（默认 `localhost`；裸 `--host` = `0.0.0.0`）
  - 启动后打印 `neo dev listening at <url>`；SIGINT / SIGTERM / SIGBREAK / SIGHUP / 正常退出时删除临时目录（进程被强杀时无法执行清理）
  - 启动时清理同一工程内已退出进程遗留的 `.neo-dev/<pid>-*` 目录
- `neo preview`：校验 `<outDir>/index.html` 存在后，用 Vite preview 提供静态服务
  - `--outDir <dir>`（默认 `dist`）、`--port <n>`（默认 4173）、`--host <addr>`
  - 产物缺失时明确报错并非 0 退出
- `.neo-dev/` 为临时目录，写入 `.gitignore`，不入库

## Lint（静态约束）

- `neo lint`：校验 manifest 可解析、入口存在，并从入口遍历**本地 import 图**（跳过 `node_modules` / `dist` / `out` / `.neo-build` / `.neo-dev` / `.neo`）
- 使用 **TypeScript AST** 解析（注释与字符串不误报），违规输出 `file:line:col`
- 禁止的平台/浏览器用法：
  - DOM/BOM：`window` / `document` / `navigator` / `location` / `history` / `screen` / `localStorage` / `sessionStorage` / `indexedDB` / `getComputedStyle` / `matchMedia` / `performance` / `alert` / `confirm` / `prompt` / `CustomEvent` / `DOMParser` / `XMLSerializer` / `ResizeObserver` / `IntersectionObserver` / `MutationObserver` / `requestIdleCallback`
  - 网络/二进制/媒体：`fetch` / `XMLHttpRequest` / `WebSocket` / `Worker` / `SharedWorker` / `FileReader` / `Blob` / `File` / `URL` / `Image` / `Audio` / `AudioContext` / `webkitAudioContext` / `createImageBitmap`
  - DOM 类型/画布：`HTMLElement` / `HTMLCanvasElement` / `HTMLImageElement` / `HTMLAudioElement` / `HTMLVideoElement` / `CanvasRenderingContext2D` / `OffscreenCanvas`
  - 平台/宿主/Node：`wx` / `tt` / `Proxy` / `process` / `Buffer` / `require` / `module`
  - 动态代码：`eval()` / `new Function()` / `Function()`
  - 对象属性名/声明名（如 `obj.window`、`{ window: 1 }`）不算全局引用
  - 作用域内同名声明（变量 / 参数 / 解构绑定 / 导入 / 类型别名 / 类型参数 / class / enum）不算全局引用；检查按词法作用域解析，支持 shadowing
  - `eval` 检测引用与调用；`Function` 只检测调用或构造
- 有违规时返回 **exit code 1**；无违规时正常通过（exit 0）

## 扩展方式

- 新增平台 target = 在 `src/build/platforms/<target>.ts` 加实现，并在 `buildProject` 的 `switch` 中分派
- 打包参数（分包策略 / 资源远程-本地 / target 等）由 CLI/接口传入，**不进 manifest**
