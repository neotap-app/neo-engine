# IStorage

```ts
interface StorageValue {
  key: string;
  value: string;
}

interface IStorage extends Capability {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  clear(): void;
}
```

- 值为字符串，非字符串请自行序列化。
- 实现统一使用 `neo:<namespace>:` 前缀；`<namespace>` 默认为 `manifest.name` 经 `encodeURIComponent` 编码，缺省为 `game`。
- `clear()` 只清当前 namespace，不会清空宿主全部存储。
- 小游戏端拿不到 `getStorageInfoSync().keys` 时不清空，避免误删其他数据。

工厂参数见 [H5](../platforms/h5.md) / [小游戏能力](../platforms/minigame/capabilities.md)。
