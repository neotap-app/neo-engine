import type { IResource, ResourceSource } from '../../types/game-context/resource';

export interface H5ResourceOptions {
  baseUrl?: string;
  manifest?: Record<string, string>;
}

export function createH5Resource(options: H5ResourceOptions = {}): IResource {
  const baseUrl = options.baseUrl ?? '';
  const manifest = options.manifest ?? {};

  return {
    name: 'resource',
    available: true,
    resolve(key): ResourceSource | null {
      const mapped = manifest[key] ?? key;
      return { kind: 'remote', url: `${baseUrl}${mapped}` };
    },
    async load<T>(key: string): Promise<T> {
      const source = this.resolve(key);
      if (!source || source.kind !== 'remote') {
        throw new Error(`cannot load resource: ${key}`);
      }
      const res = await fetch(source.url);
      if (!res.ok) {
        throw new Error(`failed to load resource ${key}: ${res.status}`);
      }
      return (await res.json()) as T;
    },
  };
}
