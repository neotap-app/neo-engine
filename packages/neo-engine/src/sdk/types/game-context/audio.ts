import type { Capability } from './types';

export interface AudioPlayOptions {
  loop?: boolean;
  volume?: number;
}

export interface IAudio extends Capability {
  play(key: string, options?: AudioPlayOptions): void;
  pause(key: string): void;
  stop(key: string): void;
  setVolume(key: string, volume: number): void;
}

export function createNoopAudio(): IAudio {
  return {
    name: 'audio',
    available: false,
    play: () => undefined,
    pause: () => undefined,
    stop: () => undefined,
    setVolume: () => undefined,
  };
}
