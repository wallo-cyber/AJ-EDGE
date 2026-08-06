export type StorageProvider = {
  read<T>(key: string): T[];
  write<T>(key: string, items: T[]): void;
  remove(key: string): void;
};

const defaultStorageProvider: StorageProvider = {
  read<T>(key: string): T[] {
    if (typeof window === 'undefined') {
      return [] as T[];
    }

    try {
      const stored = window.localStorage.getItem(key);
      if (!stored) {
        return [] as T[];
      }

      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? (parsed as T[]) : [] as T[];
    } catch {
      return [] as T[];
    }
  },
  write<T>(key: string, items: T[]) {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(key, JSON.stringify(items));
  },
  remove(key: string) {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(key);
  },
};

let activeStorageProvider: StorageProvider = defaultStorageProvider;

export function setStorageProvider(provider: StorageProvider) {
  activeStorageProvider = provider;
}

export function resetStorageProvider() {
  activeStorageProvider = defaultStorageProvider;
}

export function readFromStorage<T>(key: string): T[] {
  return activeStorageProvider.read<T>(key);
}

export function writeToStorage<T>(key: string, items: T[]) {
  activeStorageProvider.write<T>(key, items);
}

export function removeFromStorage(key: string) {
  activeStorageProvider.remove(key);
}
