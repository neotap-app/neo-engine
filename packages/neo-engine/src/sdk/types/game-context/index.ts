export * from './types';
export * from './storage';
export * from './audio';
export * from './input';
export * from './lifecycle';
export * from './resource';
export * from './system';
export * from './screen';

import type { IAudio } from './audio';
import type { IInput } from './input';
import type { ILifecycle } from './lifecycle';
import type { IResource } from './resource';
import type { IScreen } from './screen';
import type { IStorage } from './storage';
import type { ISystem } from './system';

export interface CapabilityBundle {
  storage: IStorage;
  audio: IAudio;
  input: IInput;
  lifecycle: ILifecycle;
  resource: IResource;
  system: ISystem;
  screen: IScreen;
}
