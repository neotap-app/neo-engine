import type { Capability } from './types';

export interface AudioPlayOptions {
  loop?: boolean;
  volume?: number;
  playbackRate?: number;
  startTime?: number;
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
  /** 预加载/解码，resolve 时长（秒；未知为 0） */
  preload(key: string): Promise<number>;
  play(key: string, options?: AudioPlayOptions): AudioHandle;
  pause(key: string): void;
  resume(key: string): void;
  stop(key: string): void;
  setVolume(key: string, volume: number): void;
  setMasterVolume(volume: number): void;
  setMuted(muted: boolean): void;
  /** 首次用户手势时调用，解锁自动播放；失败不要 reject */
  unlock(): Promise<void>;
  dispose(): void;
}

function createNoopHandle(key: string): AudioHandle {
  return {
    key,
    duration: 0,
    playing: false,
    pause: () => undefined,
    resume: () => undefined,
    stop: () => undefined,
    setVolume: () => undefined,
  };
}

export function createNoopAudio(): IAudio {
  return {
    name: 'audio',
    available: false,
    preload: async () => 0,
    play: (key) => createNoopHandle(key),
    pause: () => undefined,
    resume: () => undefined,
    stop: () => undefined,
    setVolume: () => undefined,
    setMasterVolume: () => undefined,
    setMuted: () => undefined,
    unlock: async () => undefined,
    dispose: () => undefined,
  };
}
