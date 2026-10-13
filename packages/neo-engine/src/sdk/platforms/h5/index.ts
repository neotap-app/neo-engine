import type { CapabilityBundle } from '../../types/game-context';
import type { IAudio } from '../../types/game-context/audio';
import type { IInput } from '../../types/game-context/input';
import type { ILifecycle } from '../../types/game-context/lifecycle';
import type { IResource } from '../../types/game-context/resource';
import type { IStorage } from '../../types/game-context/storage';
import { createH5Audio } from './audio';
import { createH5Input } from './input';
import { createH5Lifecycle } from './lifecycle';
import { createH5Resource } from './resource';
import { createH5Storage } from './storage';

export interface H5CapabilityOptions {
  storage?: Parameters<typeof createH5Storage>[0];
  input?: Parameters<typeof createH5Input>[0];
  resource?: Parameters<typeof createH5Resource>[0];
}

export interface H5Capabilities extends CapabilityBundle {
  storage: IStorage;
  audio: IAudio;
  input: IInput;
  lifecycle: ILifecycle;
  resource: IResource;
}

export function createH5Capabilities(options: H5CapabilityOptions = {}): H5Capabilities {
  return {
    storage: createH5Storage(options.storage),
    audio: createH5Audio(),
    input: createH5Input(options.input),
    lifecycle: createH5Lifecycle(),
    resource: createH5Resource(options.resource),
  };
}
