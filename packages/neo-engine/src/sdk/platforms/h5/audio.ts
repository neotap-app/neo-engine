import type { IAudio } from '../../types/game-context/audio';

const audioContexts = new Map<string, HTMLAudioElement>();

export function createH5Audio(): IAudio {
  return {
    name: 'audio',
    available: true,
    play(key, options = {}) {
      const el = audioContexts.get(key);
      if (el) {
        el.play().catch(() => undefined);
        return;
      }
      const audio = new Audio(key);
      audio.loop = options.loop ?? false;
      if (options.volume !== undefined) {
        audio.volume = options.volume;
      }
      audioContexts.set(key, audio);
      audio.play().catch(() => undefined);
    },
    pause(key) {
      const el = audioContexts.get(key);
      if (el) {
        el.pause();
      }
    },
    stop(key) {
      const el = audioContexts.get(key);
      if (el) {
        el.pause();
        el.currentTime = 0;
      }
    },
    setVolume(key, volume) {
      const el = audioContexts.get(key);
      if (el) {
        el.volume = volume;
      }
    },
  };
}
