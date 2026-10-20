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

## 开发回路（dev / preview）

- `neo dev`：在工程内创建 `.neo-dev/<pid>-<timestamp>/` 临时根目录，写入 `index.html` + bootstrap（复用 H5 bootstrap，import manifest 入口的绝对路径），启动 Vite dev server
  - 监听入口所在目录与工程 `src/`，源码变更走 Vite HMR / 刷新
  - `--port <n>`（默认 5173，被占用时由 Vite 顺延）、`--host <addr>`（默认 `localhost`；裸 `--host` = `0.0.0.0`）
  - 启动后打印 `neo dev listening at <url>`；SIGINT / SIGTERM / SIGBREAK / SIGHUP / 正常退出时删除临时目录（进程被强杀时无法执行清理）
  - 启动时清理同一工程内已退出进程遗留的 `.neo-dev/<pid>-*` 目录
- `neo preview`：校验 `<outDir>/index.html` 存在后，用 Vite preview 提供静态服务
  - `--outDir <dir>`（默认 `dist`）、`--port <n>`（默认 4173）、`--host <addr>`
  - 产物缺失时明确报错并非 0 退出
- `.neo-dev/` 为临时目录，写入 `.gitignore`，不入库

## Lint（静态约束）

- `neo lint`：校验 manifest 可解析、入口存在，并从入口遍历**本地 import 图**（跳过 `node_modules` / `dist` / `out` / `.neo-build` / `.neo-dev`）
- 使用 **TypeScript AST** 解析（注释与字符串不误报），违规输出 `file:line:col`
- 禁止的平台/浏览器用法：`window` / `document` / `localStorage` / `navigator` / `wx` / `tt` / `Proxy`，以及 `eval()` / `new Function()` / `Function()`
  - 对象属性名/声明名（如 `obj.window`、`{ window: 1 }`）不算全局引用
  - `eval` 检测引用与调用；`Function` 只检测调用或构造
- 有违规时返回 **exit code 1**；无违规时正常通过（exit 0）

## 扩展方式

- 新增平台 target = 在 `src/build/platforms/<target>.ts` 加实现，并在 `buildProject` 的 `switch` 中分派
- 打包参数（分包策略 / 资源远程-本地 / target 等）由 CLI/接口传入，**不进 manifest**
