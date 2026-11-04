# IAudio

```ts
interface AudioPlayOptions {
  loop?: boolean;
  volume?: number;
  playbackRate?: number;
  startTime?: number;
  onEnded?: () => void;
  onError?: (error: unknown) => void;
}

interface AudioHandle {
  readonly key: string;
  readonly duration: number;
  readonly playing: boolean;
  pause(): void;
  resume(): void;
  stop(): void;
  setVolume(volume: number): void;
}

interface IAudio extends Capability {
  preload(key: string): Promise<number>;
  play(key: string, options?: AudioPlayOptions): AudioHandle;
  pause(key: string): void;
  resume(key: string): void;
  stop(key: string): void;
  setVolume(key: string, volume: number): void;
  setMasterVolume(volume: number): void;
  setMuted(muted: boolean): void;
  unlock(): Promise<void>;
  dispose(): void;
}
```

| 方法 / 字段 | 说明 |
| --- | --- |
| `preload(key)` | 预加载并 resolve 时长（秒）；未知或超时 resolve `0` |
| `play(key, options)` | 每次创建独立实例，返回控制该实例的 `AudioHandle` |
| `pause/resume/stop(key)` | 作用于该 key 的全部活跃实例 |
| `setVolume(key, v)` | 设置该 key 的默认音量并同步活跃实例，`0..1` |
| `setMasterVolume(v)` | 全局音量，`0..1` |
| `setMuted(v)` | 静音开关，实际音量为 `0` |
| `unlock()` | 首次用户手势调用，解锁自动播放；失败也 resolve |
| `duration` | 未知为 `0` |
| `playing` | 当前实例是否正在播放 |

音量优先级：`play({ volume })` > `setVolume(key, v)` 的默认值 > `1`。实际音量 = 单实例音量 × `masterVolume`；静音时为 `0`。

音频 key 与资源 key 同源：播放前通过 [IResource.resolve](./resource.md) 解析；未注入资源或解析失败时回退使用 key 本身。

`startTime` 单位为秒。平台行为见 [H5](../platforms/h5.md) / [小游戏能力](../platforms/minigame/capabilities.md)。
