import type { Capability } from './types';

export interface ILifecycle extends Capability {
  onShow(listener: () => void): void;
  offShow(listener: () => void): void;
  onHide(listener: () => void): void;
  offHide(listener: () => void): void;
}

export function createNoopLifecycle(): ILifecycle {
  return {
    name: 'lifecycle',
    available: false,
    onShow: () => undefined,
    offShow: () => undefined,
    onHide: () => undefined,
    offHide: () => undefined,
  };
}
