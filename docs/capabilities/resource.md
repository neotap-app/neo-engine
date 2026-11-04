# IResource

```ts
type ResourceSource =
  | { kind: 'remote'; url: string }
  | { kind: 'local'; path: string };

interface IImage {
  readonly key: string;
  readonly source: unknown;
  readonly width: number;
  readonly height: number;
  readonly url?: string;
  dispose?(): void;
}

interface IResource extends Capability {
  resolve(key: string): ResourceSource | null;
  load<T>(key: string): Promise<T>;
  loadText(key: string): Promise<string>;
  loadBinary(key: string): Promise<ArrayBuffer>;
  loadImage(key: string): Promise<IImage>;
}
```

| 方法 | 说明 |
| --- | --- |
| `resolve(key)` | 返回平台可寻址来源；key 非法返回 `null` |
| `load<T>(key)` | 按 JSON 解析 |
| `loadText(key)` | 读取文本 |
| `loadBinary(key)` | 读取二进制 |
| `loadImage(key)` | 返回平台无关 `IImage`，不是 `HTMLImageElement` |

`IImage.source` 是平台原生图片对象（`HTMLImageElement` / `ImageBitmap` / 小游戏 `createImage()` 结果），需要绘制时按目标平台断言。`url` 仅 H5 提供。当前实现不提供 `dispose`。

key 规则与工具函数见 [资源 key](../assets/keys.md)，平台实现见 [H5](../platforms/h5.md) / [小游戏能力](../platforms/minigame/capabilities.md)。
