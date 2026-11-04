# preview server

```ts
function startPreviewServer(options: {
  cwd: string;
  outDir?: string;
  port?: number;
  host?: string;
}): Promise<{
  url: string;
  server: PreviewServer;
  close(): Promise<void>;
}>;
```

`PreviewServer` 为 Vite 的对应类型。

`neo preview` 要求 `<outDir>/index.html` 存在，否则报错并以非 0 退出；然后用 Vite preview 提供静态服务。默认 `outDir` 为 `dist`，端口 `4173`，host `localhost`。
