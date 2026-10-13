import type { CapabilityBundle } from '../../types/game-context';
import { createMinigameRuntimeEnvironment, createMinigameCapabilities } from '../minigame';
import type { MinigameCapabilityOptions } from '../minigame/capabilities';

export interface WechatCapabilities extends CapabilityBundle {}

export function getWechatAPI(): unknown {
  return (globalThis as Record<string, unknown>).wx;
}

export function createWechatCapabilities(options: MinigameCapabilityOptions = {}): WechatCapabilities {
  const api = getWechatAPI();
  if (!api) {
    throw new Error('wechat runtime (wx) not found');
  }
  return createMinigameCapabilities(api as never, options) as WechatCapabilities;
}

export function createWechatRuntimeEnvironment(options: MinigameCapabilityOptions = {}) {
  const api = getWechatAPI();
  if (!api) {
    throw new Error('wechat runtime (wx) not found');
  }
  return createMinigameRuntimeEnvironment(api as never, options);
}
