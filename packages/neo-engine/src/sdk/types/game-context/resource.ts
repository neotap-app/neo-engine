import type { Capability } from './types';

export type ResourceSource =
  | { kind: 'remote'; url: string }
  | { kind: 'local'; path: string };

export interface IResource extends Capability {
  resolve(key: string): ResourceSource | null;
  load<T>(key: string): Promise<T>;
}

export function createNoopResource(): IResource {
  return {
    name: 'resource',
    available: false,
    resolve: () => null,
    load: async () => {
      throw new Error('resource capability unavailable');
    },
  };
}
