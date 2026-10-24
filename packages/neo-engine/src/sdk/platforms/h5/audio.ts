import type { AudioHandle, AudioPlayOptions, IAudio } from '../../types/game-context/audio';
import type { IResource } from '../../types/game-context/resource';

export interface H5AudioOptions {
  resource?: IResource;
}

const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

function clampVolume(volume: number): number {
  if (!Number.isFinite(volume)) {
    return 1;
  }
  return Math.min(1, Math.max(0, volume));
}

export function createH5Audio(options: H5AudioOptions = {}): IAudio {
  const resource = options.resource;
  const active = new Set<HTMLAudioElement>();
  const byKey = new Map<string, Set<HTMLAudioElement>>();
  const instanceVolumes = new Map<HTMLAudioElement, number>();
  const defaultVolumes = new Map<string, number>();
  const durations = new Map<string, number>();
  const detachers = new Map<HTMLAudioElement, () => void>();

  let masterVolume = 1;
  let muted = false;

  const sourceFor = (key: string): string => {
    const source = resource?.resolve(key);
    if (source) {
      return source.kind === 'remote' ? source.url : source.path;
    }
    return key;
  };

  const effectiveVolume = (volume: number): number =>
    muted ? 0 : clampVolume(volume * masterVolume);

  const applyMasterVolume = () => {
    active.forEach((audio) => {
      audio.volume = effectiveVolume(instanceVolumes.get(audio) ?? 1);
    });
  };

  const track = (audio: HTMLAudioElement, key: string): void => {
    active.add(audio);
    let set = byKey.get(key);
    if (!set) {
      set = new Set();
      byKey.set(key, set);
    }
    set.add(audio);
  };

  const untrack = (audio: HTMLAudioElement, key: string): void => {
    audio.onended = null;
    audio.onerror = null;
    audio.onloadedmetadata = null;
    active.delete(audio);
    instanceVolumes.delete(audio);
    const set = byKey.get(key);
    if (set) {
      set.delete(audio);
      if (set.size === 0) {
        byKey.delete(key);
      }
    }
    detachers.delete(audio);
  };

  const stopElement = (audio: HTMLAudioElement): void => {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // Ignore elements that cannot be reset.
    }
    detachers.get(audio)?.();
  };

  const play = (key: string, playOptions: AudioPlayOptions = {}): AudioHandle => {
    const audio = new Audio(sourceFor(key));
    const instanceVolume = clampVolume(
      playOptions.volume ?? defaultVolumes.get(key) ?? 1,
    );
    let reported = false;

    const reportError = (error: unknown): void => {
      if (reported) {
        return;
      }
      reported = true;
      playOptions.onError?.(error);
    };

    const detach = () => untrack(audio, key);

    audio.loop = playOptions.loop ?? false;
    if (playOptions.playbackRate !== undefined) {
      audio.playbackRate = playOptions.playbackRate;
    }

    instanceVolumes.set(audio, instanceVolume);
    audio.volume = effectiveVolume(instanceVolume);

    if (playOptions.startTime !== undefined) {
      const startTime = playOptions.startTime;
      const seek = () => {
        try {
          audio.currentTime = startTime;
        } catch {
          // Ignore elements that cannot seek yet.
        }
      };
      if (audio.readyState >= 1) {
        seek();
      } else {
        audio.onloadedmetadata = seek;
      }
    }

    audio.onended = () => {
      detach();
      playOptions.onEnded?.();
    };
    audio.onerror = () => {
      reportError(audio.error ?? new Error(`failed to play audio ${key}`));
      detach();
    };

    track(audio, key);
    detachers.set(audio, detach);

    audio.play().catch((error: unknown) => reportError(error));

    return {
      key,
      get duration() {
        const duration = audio.duration;
        if (Number.isFinite(duration) && duration > 0) {
          return duration;
        }
        return durations.get(key) ?? 0;
      },
      get playing() {
        return !audio.paused && !audio.ended;
      },
      pause() {
        audio.pause();
      },
      resume() {
        audio.play().catch((error: unknown) => reportError(error));
      },
      stop() {
        stopElement(audio);
      },
      setVolume(volume: number) {
        const next = clampVolume(volume);
        instanceVolumes.set(audio, next);
        audio.volume = effectiveVolume(next);
      },
    };
  };

  return {
    name: 'audio',
    available: true,
    dispose() {
      Array.from(active).forEach(stopElement);
      active.clear();
      byKey.clear();
      instanceVolumes.clear();
      defaultVolumes.clear();
      durations.clear();
      detachers.clear();
    },
    preload(key: string): Promise<number> {
      return new Promise<number>((resolve, reject) => {
        const audio = new Audio();
        let settled = false;

        const cleanup = () => {
          audio.onloadedmetadata = null;
          audio.onerror = null;
          try {
            audio.src = '';
          } catch {
            // Ignore elements that cannot be released.
          }
        };

        audio.preload = 'metadata';
        audio.onloadedmetadata = () => {
          if (settled) {
            return;
          }
          settled = true;
          const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
          durations.set(key, duration);
          cleanup();
          resolve(duration);
        };
        audio.onerror = () => {
          if (settled) {
            return;
          }
          settled = true;
          cleanup();
          reject(new Error(`failed to preload audio ${key}`));
        };
        audio.src = sourceFor(key);
      });
    },
    play,
    pause(key: string) {
      byKey.get(key)?.forEach((audio) => audio.pause());
    },
    resume(key: string) {
      byKey.get(key)?.forEach((audio) => {
        audio.play().catch(() => undefined);
      });
    },
    stop(key: string) {
      Array.from(byKey.get(key) ?? []).forEach(stopElement);
    },
    setVolume(key: string, volume: number) {
      const next = clampVolume(volume);
      defaultVolumes.set(key, next);
      byKey.get(key)?.forEach((audio) => {
        instanceVolumes.set(audio, next);
        audio.volume = effectiveVolume(next);
      });
    },
    setMasterVolume(volume: number) {
      masterVolume = clampVolume(volume);
      applyMasterVolume();
    },
    setMuted(value: boolean) {
      muted = value;
      applyMasterVolume();
    },
    unlock(): Promise<void> {
      return new Promise<void>((resolve) => {
        let settled = false;
        const settle = () => {
          if (settled) {
            return;
          }
          settled = true;
          resolve();
        };
        try {
          const audio = new Audio(SILENT_WAV);
          audio.volume = 0;
          audio.onended = settle;
          const result = audio.play();
          if (result && typeof result.then === 'function') {
            result.then(settle, settle);
          } else {
            settle();
          }
        } catch {
          settle();
        }
      });
    },
  };
}
