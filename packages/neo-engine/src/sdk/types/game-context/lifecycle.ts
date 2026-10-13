import type { Capability } from './types';

export interface ILifecycle extends Capability {
  onShow(listener: () => void): void;
  onHide(listener: () => void): void;
}

export function createNoopLifecycle(): ILifecycle {
  return {
    name: 'lifecycle',
    available: false,
    onShow: () => undefined,
    onHide: () => undefined,
  };
}
