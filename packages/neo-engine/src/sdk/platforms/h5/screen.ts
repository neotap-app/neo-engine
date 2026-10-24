import type { IScreen, Orientation, ScreenInfo } from '../../types/game-context/screen';

export function createH5Screen(): IScreen {
  const listeners = new Set<(orientation: Orientation) => void>();
  const orientationApi = window.screen.orientation as (ScreenOrientation & {
    lock?: (orientation: 'portrait' | 'landscape') => Promise<void>;
  }) | null;

  const readOrientation = (): Orientation =>
    orientationApi?.type.startsWith('landscape') ? 'landscape' : 'portrait';

  const handleChange = () => {
    const orientation = readOrientation();
    listeners.forEach((fn) => fn(orientation));
  };

  let attached = false;

  const attach = () => {
    if (attached) {
      return;
    }
    orientationApi?.addEventListener('change', handleChange);
    window.addEventListener('resize', handleChange);
    attached = true;
  };

  const detach = () => {
    if (!attached) {
      return;
    }
    orientationApi?.removeEventListener('change', handleChange);
    window.removeEventListener('resize', handleChange);
    attached = false;
  };

  attach();

  return {
    name: 'screen',
    available: true,
    bind() {
      attach();
    },
    dispose() {
      detach();
      listeners.clear();
    },
    getInfo(): ScreenInfo {
      return {
        width: window.screen.width,
        height: window.screen.height,
        pixelRatio: window.devicePixelRatio || 1,
        orientation: readOrientation(),
      };
    },
    getOrientation: readOrientation,
    canChangeOrientation() {
      return typeof orientationApi?.lock === 'function';
    },
    async requestOrientation(orientation: Orientation): Promise<boolean> {
      const lock = orientationApi?.lock;
      if (typeof lock !== 'function') {
        return false;
      }
      try {
        await lock(orientation);
        return true;
      } catch {
        return false;
      }
    },
    onOrientationChange(listener) {
      listeners.add(listener);
    },
    offOrientationChange(listener) {
      listeners.delete(listener);
    },
  };
}
