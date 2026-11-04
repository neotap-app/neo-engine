# dev server

```ts
function startDevServer(options: {
  cwd: string;
  port?: number;
  host?: string;
}): Promise<{
  url: string;
  server: ViteDevServer;
  close(): Promise<void>;
  dispose(): void;
}>;
```

`ViteDevServer` 为 Vite 的对应类型。

`neo dev` 会：

- 创建 `.neo-dev/<pid>-<timestamp>/` 临时根目录；
- 写入 `index.html` 与 bootstrap，注入 manifest 与 `baseUrl: './'`；
- 复制工程 `assets/**` 到临时目录；
- 启动 Vite dev server 并监听入口目录与 `src/`；
- 启动时清理已退出进程遗留的 `.neo-dev/<pid>-*`；
- 退出时删除临时目录（强杀进程除外）。

默认端口 `5173`，默认 host `localhost`；`--host` 裸用等价 `0.0.0.0`。
