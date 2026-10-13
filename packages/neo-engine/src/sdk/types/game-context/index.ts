export * from './types';
export * from './storage';
export * from './audio';
export * from './input';
export * from './lifecycle';
export * from './resource';

import type { IAudio } from './audio';
import type { IInput } from './input';
import type { ILifecycle } from './lifecycle';
import type { IResource } from './resource';
import type { IStorage } from './storage';

export interface CapabilityBundle {
  storage: IStorage;
  audio: IAudio;
  input: IInput;
  lifecycle: ILifecycle;
  resource: IResource;
}
