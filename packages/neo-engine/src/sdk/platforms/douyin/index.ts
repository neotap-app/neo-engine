import type { CapabilityBundle } from '../../types/game-context';
import { createMinigameRuntimeEnvironment, createMinigameCapabilities } from '../minigame';
import type { MinigameCapabilityOptions } from '../minigame/capabilities';

export interface DouyinCapabilities extends CapabilityBundle {}

export function getDouyinAPI(): unknown {
  return (globalThis as Record<string, unknown>).tt;
}

export function createDouyinCapabilities(options: MinigameCapabilityOptions = {}): DouyinCapabilities {
  const api = getDouyinAPI();
  if (!api) {
    throw new Error('douyin runtime (tt) not found');
  }
  return createMinigameCapabilities(api as never, options) as DouyinCapabilities;
}

export function createDouyinRuntimeEnvironment(options: MinigameCapabilityOptions = {}) {
  const api = getDouyinAPI();
  if (!api) {
    throw new Error('douyin runtime (tt) not found');
  }
  return createMinigameRuntimeEnvironment(api as never, options);
}
