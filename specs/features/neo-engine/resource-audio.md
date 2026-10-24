# 资源图片与音频能力（Round 2）

本文记录平台无关图片抽象 `IImage` 与重设计后的 `IAudio` 契约。二者均为**破坏性变更**，旧调用方需按下文迁移。

## IImage

`IResource.loadImage(key)` 不再返回 `HTMLImageElement`（小游戏端没有 DOM，旧类型是类型谎言），统一返回：

```ts
export interface IImage {
  readonly key: string;
  /** 平台原生图片对象：HTMLImageElement / ImageBitmap / 小游戏 createImage() 结果 */
  readonly source: unknown;
  readonly width: number;
  readonly height: number;
  readonly url?: string;
  dispose?(): void;
}
```

- `source` 保持平台原生对象，游戏脚本需要绘制时按目标平台自行断言或走引擎抽象，不依赖具体类型
- `width` / `height`：H5 取 `naturalWidth || width`（同理高度）；小游戏取 `image.width ?? 0` / `image.height ?? 0`
- `url`：仅 H5 提供，为最终请求 URL；小游戏本地路径不通过该字段暴露
- `dispose` 为可选扩展点，当前实现不提供
- `resolve` / `load` / `loadText` / `loadBinary` 语义不变；`createNoopResource` 的 `loadImage` 继续 reject

## IAudio 新契约

```ts
export interface AudioPlayOptions {
  loop?: boolean;
  volume?: number; // 0..1，单次播放音量
  playbackRate?: number;
  startTime?: number; // 秒
  onEnded?: () => void;
  onError?: (error: unknown) => void;
}

export interface AudioHandle {
  readonly key: string;
  readonly duration: number;
  readonly playing: boolean;
  pause(): void;
  resume(): void;
  stop(): void;
  setVolume(volume: number): void;
}

export interface IAudio extends Capability {
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

### 音频来源

音频 key 与资源 key 同源，播放前经 `IResource.resolve(key)` 解析：

- `remote` 用 `url`，`local` 用 `path`
- 解析失败或未注入 `resource` 时回退为 key 本身，兼容直接传 URL 的旧用法

工厂签名：

```ts
createH5Audio(options?: { resource?: IResource }): IAudio
createMinigameAudio(api, options?: { resource?: IResource }): IAudio
```

`createH5Capabilities` / `createMinigameCapabilities` 先构造 `resource`，再注入 audio，保证同一 runtime 内资源寻址一致。

### 并发与句柄

- 每次 `play` 都创建独立实例（H5 `new Audio` / 小游戏 `createInnerAudioContext`），同一 key 可并发播放、可重新开始
- 每次 `play` 的选项一定作用到该次实例，不存在“命中缓存忽略 options”
- `AudioHandle` 只控制自己那一个实例；`IAudio.pause/resume/stop(key)` 作用于该 key 的全部活跃实例
- `duration`：未知时返回 `0`；H5 优先实时 `duration`，其次 `preload` 缓存；小游戏取 `ctx.duration`
- 自然结束或出错后实例从活跃集合移除；`stop()` 立即停止并释放实例

### 预加载

- `preload(key)` resolve 时长（秒）；无法得知时 resolve `0`
- H5：`preload = 'metadata'`，`loadedmetadata` resolve，`error` reject；不永久缓存错误状态，下次调用重新尝试
- 小游戏：创建 context、设 `src`、`onCanplay` resolve `duration ?? 0`、`onError` reject；10s 超时兜底 resolve `0`，避免不回调的平台挂死

### 音量与静音

- 单次音量优先级：`play({ volume })` > `setVolume(key, v)` 的默认音量 > `1`
- 实际写入音量 = `单实例音量 × masterVolume`，`muted` 时为 `0`
- `setVolume(key, v)` 同时更新该 key 的默认音量与所有活跃实例；`AudioHandle.setVolume` 只改当前实例
- `setMasterVolume` / `setMuted` 立即同步所有活跃实例

### 自动播放解锁

- `unlock()` 应在首次用户手势内调用
- H5：播放一个极短静音 WAV data URL 解锁音频上下文；任何失败都 resolve，不 reject
- 小游戏：直接 resolve（平台无该前置限制）

### 资源释放

- `dispose()` 停止并清空活跃实例；H5 清空元素引用，小游戏 stop + destroy 所有 context
- 小游戏 `dispose` 优先调用 `offEnded` / `offError`，避免残留监听

## 平台降级

| 能力 | H5 | 小游戏 |
| --- | --- | --- |
| `startTime` | 设 `currentTime`（metadata 前赋值，必要时 metadata 后补） | 设 `ctx.startTime` |
| `playbackRate` | `audio.playbackRate` | `ctx.playbackRate` |
| 播放错误 | `error` 事件 + `play()` Promise rejection | `ctx.onError` |
| `preload` | `loadedmetadata` / `error` | `onCanplay` / `onError` + 10s 超时 |
| `unlock` | 静音 WAV | no-op resolve |

## 破坏性变更与迁移

| 旧用法 | 新用法 |
| --- | --- |
| `const img: HTMLImageElement = await ctx.load.loadImage(k)` | `const img = await ctx.load.loadImage(k); const el = img.source as HTMLImageElement` |
| `ctx.audio.play(key)`（返回 void） | `const handle = ctx.audio.play(key, { volume, loop })` |
| `ctx.audio.play(key, { volume })` 命中缓存后忽略 volume（旧缺陷） | 每次播放均按本次 options 生效 |
| 无 `resume` / 无预加载 / 无结束回调 | `ctx.audio.resume(key)` / `await ctx.audio.preload(key)` / `onEnded` |
| 无法全局调音量/静音 | `setMasterVolume` / `setMuted` |
| 移动端/浏览器自动播放受阻 | 首次手势调用 `await ctx.audio.unlock()` |

迁移时注意：`play` 的返回值从 `void` 变为 `AudioHandle`，忽略返回值不会报错；但依赖“同 key 单实例复用”的逻辑应改为分别持有每次 `play` 返回的 handle。`createNoopAudio` 已完整实现新接口，无音频能力时 `play` 返回安全 noop handle。
