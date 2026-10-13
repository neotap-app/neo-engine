import type { IStorage } from '../../types/game-context/storage';

export interface H5StorageOptions {
  prefix?: string;
}

export function createH5Storage(options: H5StorageOptions = {}): IStorage {
  const prefix = options.prefix ?? 'neo:';
  const namespace = `${prefix}${'game'}:`;

  return {
    name: 'storage',
    available: true,
    get(key) {
      return localStorage.getItem(`${namespace}${key}`);
    },
    set(key, value) {
      localStorage.setItem(`${namespace}${key}`, value);
    },
    remove(key) {
      localStorage.removeItem(`${namespace}${key}`);
    },
    clear() {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(namespace)) {
          keys.push(k);
        }
      }
      keys.forEach((k) => localStorage.removeItem(k));
    },
  };
}
