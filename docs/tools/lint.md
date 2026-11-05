# lint

`neo lint` 校验 manifest 可解析、入口存在，并从入口遍历本地 import 图（跳过 `node_modules`、`dist`、`out`、`.neo-build`、`.neo-dev`），使用 TypeScript AST 检查：

- 禁用浏览器 / 平台 / Node 全局，如 `window`、`document`、`navigator`、`localStorage`、`fetch`、`Image`、`Audio`、`HTMLElement`、`wx`、`tt`、`process`、`Buffer`、`require`、`Proxy`；
- 禁用动态代码：`eval()`、`new Function()`、`Function()`。

错误输出为 `file:line:col message`；有错误时 `exit code 1`。

资产不做 key 校验：`assets/**` 自动打包，运行时通过 `IResource.resolveAsset` 按路径寻址，见 [资源 key](../assets/keys.md)。
