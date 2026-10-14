import type { Capability } from './types';

export type PlatformName = 'h5' | 'wechat' | 'douyin';

export interface RuntimeInfo {
  name: string;
  version: string;
  language?: string;
  platform?: string;
}

export interface DeviceInfo {
  brand?: string;
  model?: string;
  system?: string;
  pixelRatio: number;
  screenWidth: number;
  screenHeight: number;
  windowWidth: number;
  windowHeight: number;
}

export interface EnvironmentInfo {
  platform: PlatformName;
  runtime: RuntimeInfo;
  device: DeviceInfo;
}

export interface ISystem extends Capability {
  getEnvironmentInfo(): EnvironmentInfo;
}

export function createNoopSystem(): ISystem {
  return {
    name: 'system',
    available: false,
    getEnvironmentInfo: (): EnvironmentInfo => ({
      platform: 'h5',
      runtime: { name: 'unknown', version: '0' },
      device: {
        pixelRatio: 1,
        screenWidth: 0,
        screenHeight: 0,
        windowWidth: 0,
        windowHeight: 0,
      },
    }),
  };
}
