# lint

`neo lint` 校验 manifest 可解析、入口存在，并从入口遍历本地 import 图（跳过 `node_modules`、`dist`、`out`、`.neo-build`、`.neo-dev`、`.neo`），使用 TypeScript AST 检查：

- 禁用浏览器 / 平台 / Node 全局，如 `window`、`document`、`navigator`、`localStorage`、`fetch`、`Image`、`Audio`、`HTMLElement`、`wx`、`tt`、`process`、`Buffer`、`require`、`Proxy`；
- 禁用动态代码：`eval()`、`new Function()`、`Function()`；
- 字面量资产 key 必须存在于 `assets/`。

错误输出为 `file:line:col message`；有错误时 `exit code 1`。

资产 key 匹配规则：

- 按 callee 名字识别 `loadText` / `loadBinary` / `loadImage` / `resolve` / `load`；
- 仅校验第一个参数为字符串字面量的调用，变量与模板字符串跳过；
- 排除 `Promise.resolve(...)`；
- key 归一化规则见 [资源 key](../assets/keys.md)。
