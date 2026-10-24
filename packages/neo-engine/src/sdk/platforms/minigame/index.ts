import type { CapabilityBundle } from '../../types/game-context';
import type { IAudio } from '../../types/game-context/audio';
import type { IInput } from '../../types/game-context/input';
import type { ILifecycle } from '../../types/game-context/lifecycle';
import type { IResource } from '../../types/game-context/resource';
import type { IScreen } from '../../types/game-context/screen';
import type { IStorage } from '../../types/game-context/storage';
import type { ISystem } from '../../types/game-context/system';
import { createMinigameAdapter } from './adapter';
import type { MinigameAPI } from './api';
import { detectMinigameAPI } from './api';
import {
  createMinigameAudio,
  createMinigameInput,
  createMinigameLifecycle,
  createMinigameResource,
  createMinigameScreen,
  createMinigameStorage,
  createMinigameSystem,
  type MinigameCapabilityOptions,
} from './capabilities';

export * from './api';
export * from './adapter';
export type { MinigameCapabilityOptions, MinigameStorageOptions } from './capabilities';

export interface MinigameCapabilities extends CapabilityBundle {
  storage: IStorage;
  audio: IAudio;
  input: IInput;
  lifecycle: ILifecycle;
  resource: IResource;
  system: ISystem;
  screen: IScreen;
}

export function createMinigameCapabilities(api: MinigameAPI, options: MinigameCapabilityOptions = {}): MinigameCapabilities {
  const platform = options.platform ?? detectMinigameAPI()?.namespace ?? 'wechat';
  return {
    storage: createMinigameStorage(api, {
      ...options.storage,
      namespace: options.storage?.namespace ?? options.manifest?.name,
    }),
    audio: createMinigameAudio(api),
    input: createMinigameInput(api),
    lifecycle: createMinigameLifecycle(api),
    resource: createMinigameResource(api, options),
    system: createMinigameSystem(api, platform),
    screen: createMinigameScreen(api),
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
