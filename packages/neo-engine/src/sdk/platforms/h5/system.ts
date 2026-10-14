import type { DeviceInfo, EnvironmentInfo, ISystem } from '../../types/game-context/system';

function detectSystem(ua: string): string | undefined {
  if (/Windows/.test(ua)) {
    return `Windows ${/Windows NT (\d+\.\d+)/.exec(ua)?.[1] ?? ''}`;
  }
  if (/Android/.test(ua)) {
    return `Android ${/Android (\d+([._]\d+)*)/.exec(ua)?.[1]?.replace(/_/g, '.') ?? ''}`;
  }
  if (/iPhone|iPad|iPod/.test(ua)) {
    return `iOS ${/OS (\d+[._]\d+([._]\d+)*)/.exec(ua)?.[1]?.replace(/_/g, '.') ?? ''}`;
  }
  if (/Mac OS X/.test(ua)) {
    return `macOS ${/Mac OS X (\d+[._]\d+([._]\d+)*)/.exec(ua)?.[1]?.replace(/_/g, '.') ?? ''}`;
  }
  return undefined;
}

function detectBrand(ua: string): string | undefined {
  if (/iPhone/.test(ua)) {
    return 'Apple';
  }
  if (/iPad/.test(ua)) {
    return 'Apple';
  }
  if (/Macintosh/.test(ua)) {
    return 'Apple';
  }
  const match = /Mobile\s*;?\s*([^;)]+)/.exec(ua);
  return match?.[1]?.trim() || undefined;
}

function detectModel(ua: string): string | undefined {
  const iphone = /iPhone (\d+,\d+)/.exec(ua);
  if (iphone) {
    return iphone[1];
  }
  const ipad = /iPad (\d+,\d+)/.exec(ua);
  if (ipad) {
    return ipad[1];
  }
  const android = /Android\s+[\d.]+\s*;\s*([^;)]+)/.exec(ua);
  return android?.[1]?.trim() || undefined;
}

export function createH5System(): ISystem {
  return {
    name: 'system',
    available: true,
    getEnvironmentInfo(): EnvironmentInfo {
      const ua = navigator.userAgent;
      const screen = window.screen;
      const device: DeviceInfo = {
        brand: detectBrand(ua),
        model: detectModel(ua),
        system: detectSystem(ua),
        pixelRatio: window.devicePixelRatio || 1,
        screenWidth: screen.width,
        screenHeight: screen.height,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
      };
      return {
        platform: 'h5',
        runtime: {
          name: 'browser',
          version: ua,
          language: navigator.language,
          platform: navigator.platform || undefined,
        },
        device,
      };
    },
  };
}
