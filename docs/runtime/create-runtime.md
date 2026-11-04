# createRuntime

```ts
function createRuntime(): NeoRuntime;

interface NeoRuntime {
  mount(options: RuntimeOptions): Promise<void>;
  unmount(): void;
}
```

- `mount` 负责解析 canvas、加载游戏实例、创建引擎、绑定能力并订阅生命周期。
- `unmount` 幂等，可重复调用；`mount` 失败时也会执行等价清理。
- 同一个 `NeoRuntime` 在已 mount 状态下再次调用 `mount` 会抛出 `runtime already mounted`。

详细参数见 [RuntimeOptions](./options.md)，流程见 [mount](./mount.md) / [unmount](./unmount.md)。
