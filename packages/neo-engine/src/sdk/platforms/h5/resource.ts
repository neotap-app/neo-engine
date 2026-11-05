import {
  assetPath,
  joinAssetUrl,
  type IImage,
  type IResource,
  type ResourceSource,
} from '../../types/game-context/resource';

export interface H5ResourceOptions {
  baseUrl?: string;
}

export function createH5Resource(options: H5ResourceOptions = {}): IResource {
  const baseUrl = options.baseUrl ?? '';

  const urlFor = (key: string): string | null => {
    const path = assetPath(key);
    return path ? joinAssetUrl(baseUrl, path) : null;
  };

  const request = async (key: string): Promise<Response> => {
    const url = urlFor(key);
    if (!url) {
      throw new Error(`invalid resource key: ${key}`);
    }
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`failed to load resource ${key}: ${res.status}`);
    }
    return res;
  };

  return {
    name: 'resource',
    available: true,
    resolve(key): ResourceSource | null {
      const url = urlFor(key);
      return url ? { kind: 'remote', url } : null;
    },
    resolveAsset: urlFor,
    async load<T>(key: string): Promise<T> {
      const res = await request(key);
      return (await res.json()) as T;
    },
    async loadText(key: string): Promise<string> {
      const res = await request(key);
      return res.text();
    },
    async loadBinary(key: string): Promise<ArrayBuffer> {
      const res = await request(key);
      return res.arrayBuffer();
    },
    loadImage(key: string): Promise<IImage> {
      return new Promise<IImage>((resolve, reject) => {
        const url = urlFor(key);
        if (!url) {
          reject(new Error(`invalid resource key: ${key}`));
          return;
        }
        const image = new Image();
        image.onload = () =>
          resolve({
            key,
            source: image,
            width: image.naturalWidth || image.width,
            height: image.naturalHeight || image.height,
            url,
          });
        image.onerror = () => reject(new Error(`failed to load image ${key}`));
        image.src = url;
      });
    },
  };
}
