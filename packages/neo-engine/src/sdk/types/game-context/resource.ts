import type { Capability } from './types';

export type ResourceSource =
  | { kind: 'remote'; url: string }
  | { kind: 'local'; path: string };

export const ASSET_DIR = 'assets';

export interface IImage {
  readonly key: string;
  /** 平台原生图片对象：HTMLImageElement / ImageBitmap / 小游戏 createImage() 结果 */
  readonly source: unknown;
  readonly width: number;
  readonly height: number;
  readonly url?: string;
  dispose?(): void;
}

export interface IResource extends Capability {
  resolve(key: string): ResourceSource | null;
  load<T>(key: string): Promise<T>;
  loadText(key: string): Promise<string>;
  loadBinary(key: string): Promise<ArrayBuffer>;
  loadImage(key: string): Promise<IImage>;
}

export function normalizeAssetKey(key: string): string {
  let normalized = key.trim().replace(/\\/g, '/');
  while (normalized.startsWith('./')) {
    normalized = normalized.slice(2);
  }
  if (normalized.startsWith(`${ASSET_DIR}/`)) {
    normalized = normalized.slice(ASSET_DIR.length + 1);
  }
  return normalized;
}

export function assetPath(key: string): string | null {
  const raw = key.trim().replace(/\\/g, '/');
  if (!raw || raw.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(raw)) {
    return null;
  }
  const normalized = normalizeAssetKey(raw);
  if (!normalized) {
    return null;
  }
  const segments = normalized.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    return null;
  }
  return `${ASSET_DIR}/${normalized}`;
}

export function joinAssetUrl(baseUrl: string, path: string): string {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path) || path.startsWith('//')) {
    return path;
  }
  if (!baseUrl) {
    return path;
  }
  return baseUrl.endsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`;
}

export function createNoopResource(): IResource {
  const reject = async (): Promise<never> => {
    throw new Error('resource capability unavailable');
  };
  return {
    name: 'resource',
    available: false,
    resolve: () => null,
    load: reject,
    loadText: reject,
    loadBinary: reject,
    loadImage: reject,
  };
}
