import type { Capability } from './types';

export interface StorageValue {
  key: string;
  value: string;
}

export interface IStorage extends Capability {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  clear(): void;
}

export function createNoopStorage(): IStorage {
  return {
    name: 'storage',
    available: false,
    get: () => null,
    set: () => undefined,
    remove: () => undefined,
    clear: () => undefined,
  };
}
