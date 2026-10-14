import type { Capability } from './types';

export type Orientation = 'portrait' | 'landscape';

export interface SafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ScreenInfo {
  width: number;
  height: number;
  pixelRatio: number;
  orientation: Orientation;
  statusBarHeight?: number;
  safeArea?: SafeArea;
}

export interface IScreen extends Capability {
  getInfo(): ScreenInfo;
  getOrientation(): Orientation;
  canChangeOrientation(): boolean;
  requestOrientation(orientation: Orientation): Promise<boolean>;
  onOrientationChange(listener: (orientation: Orientation) => void): void;
  offOrientationChange(listener: (orientation: Orientation) => void): void;
}

export function createNoopScreen(): IScreen {
  return {
    name: 'screen',
    available: false,
    getInfo: (): ScreenInfo => ({
      width: 0,
      height: 0,
      pixelRatio: 1,
      orientation: 'portrait',
    }),
    getOrientation: () => 'portrait',
    canChangeOrientation: () => false,
    requestOrientation: async () => false,
    onOrientationChange: () => undefined,
    offOrientationChange: () => undefined,
  };
}
