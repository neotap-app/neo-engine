# CLI 命令

```ts
interface CLIOptions {
  cwd: string;
}

function runCLI(argv: string[], options?: CLIOptions): Promise<void>;
```

## 命令

在含 `package.neo.json` 的工程目录运行：

```bash
neo <command> [options]
```

| 命令 | 说明 |
| --- | --- |
| `neo lint` | 校验 manifest、入口、导入图与禁用全局 |
| `neo build` | 构建到目标平台 |
| `neo dev` | 启动 Vite 开发服务器 |
| `neo preview` | 预览 H5 构建产物 |
| `neo help` / `--help` / `-h` | 打印帮助 |

## 参数

| 参数 | 适用命令 | 说明 |
| --- | --- | --- |
| `--target <h5\|wechat\|douyin>` / `--target=...` | `build` | 默认 `h5` |
| `--outDir <dir>` / `-o <dir>` / `--outDir=...` | `build`、`preview` | `build` 默认 `dist`；`preview` 默认预览 `dist` |
| `--base <path>` / `--base=...` | `build` | 仅 H5；默认 `'./'`，自动补尾 `/` |
| `--port <n>` / `-p <n>` / `--port=...` | `dev`、`preview` | `dev` 默认 `5173`，`preview` 默认 `4173` |
| `--host <addr>` / `--host=...` | `dev`、`preview` | 默认 `localhost`；裸 `--host` 等价 `0.0.0.0` |

## 退出码

- `neo lint` 有错误时 `exit code 1`；
- `neo` 命令参数/构建错误由入口捕获，输出 `error: <message>` 并设置 `exit code 1`。

子命令细节见 [lint](./lint.md) / [dev server](./dev-server.md) / [preview server](./preview-server.md) / [buildProject](./build.md)。
