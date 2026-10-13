import type { CapabilityBundle } from '../../types/game-context';
import type { IAudio } from '../../types/game-context/audio';
import type { IInput } from '../../types/game-context/input';
import type { ILifecycle } from '../../types/game-context/lifecycle';
import type { IResource } from '../../types/game-context/resource';
import type { IStorage } from '../../types/game-context/storage';
import { createMinigameAdapter } from './adapter';
import type { MinigameAPI } from './api';
import { detectMinigameAPI } from './api';
import {
  createMinigameAudio,
  createMinigameInput,
  createMinigameLifecycle,
  createMinigameResource,
  createMinigameStorage,
  type MinigameCapabilityOptions,
} from './capabilities';

export * from './api';
export * from './adapter';

export interface MinigameCapabilities extends CapabilityBundle {
  storage: IStorage;
  audio: IAudio;
  input: IInput;
  lifecycle: ILifecycle;
  resource: IResource;
}

export function createMinigameCapabilities(api: MinigameAPI, options: MinigameCapabilityOptions = {}): MinigameCapabilities {
  return {
    storage: createMinigameStorage(api),
    audio: createMinigameAudio(api),
    input: createMinigameInput(api),
    lifecycle: createMinigameLifecycle(api),
    resource: createMinigameResource(api, options),
  };
}

export function detectMinigame(): { api: MinigameAPI; namespace: 'wechat' | 'douyin' } | null {
  return detectMinigameAPI();
}

export function createMinigameRuntimeEnvironment(api: MinigameAPI, options: MinigameCapabilityOptions = {}) {
  const adapter = createMinigameAdapter(api);
  adapter.install();
  return {
    canvas: adapter.canvas,
    capabilities: createMinigameCapabilities(api, options),
  };
}
