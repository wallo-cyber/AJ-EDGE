import { useEffect, useMemo, useState } from 'react';
import { createCrudService } from './crud';
import type { TimestampedEntity, SortDirection } from './types';

export function useCrudCollection<T extends TimestampedEntity>(key: string) {
  const [items, setItems] = useState<T[]>([]);
  const service = useMemo(() => createCrudService<T>(key), [key]);

  useEffect(() => {
    setItems(service.list());
  }, [service]);

  function refresh() {
    setItems(service.list());
  }

  function create(item: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) {
    const created = service.create(item);
    refresh();
    return created;
  }

  function update(id: string, changes: Partial<T>) {
    const updated = service.update(id, changes);
    refresh();
    return updated;
  }

  function remove(id: string) {
    service.remove(id);
    refresh();
  }

  return { items, create, update, remove, refresh, service };
}

export function useSearch<T>(items: T[], fields: Array<keyof T>, query: string) {
  return useMemo(() => {
    if (!query.trim()) {
      return items;
    }

    const normalized = query.toLowerCase();
    return items.filter((item) => fields.some((field) => {
      const value = (item as Record<string, unknown>)[String(field)];
      return typeof value === 'string' && value.toLowerCase().includes(normalized);
    }));
  }, [fields, items, query]);
}

export function useFilteredCollection<T>(items: T[], filters: Record<string, string | null | undefined>) {
  return useMemo(() => {
    return items.filter((item) => Object.entries(filters).every(([key, value]) => {
      if (!value) {
        return true;
      }

      const candidate = (item as Record<string, unknown>)[key];
      return typeof candidate === 'string' && candidate.includes(String(value));
    }));
  }, [filters, items]);
}

export function useSortedCollection<T>(items: T[], sortKey: keyof T, direction: SortDirection) {
  return useMemo(() => {
    const sorted = [...items].sort((left, right) => {
      const leftValue = String((left as Record<string, unknown>)[String(sortKey)] ?? '');
      const rightValue = String((right as Record<string, unknown>)[String(sortKey)] ?? '');
      return leftValue.localeCompare(rightValue, 'ar');
    });

    return direction === 'desc' ? sorted.reverse() : sorted;
  }, [direction, items, sortKey]);
}

export function usePaginatedCollection<T>(items: T[], page: number, pageSize: number) {
  return useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);
}

export function useCollectionStats<T>(items: T[]) {
  return useMemo(() => ({
    total: items.length,
    hasItems: items.length > 0,
  }), [items]);
}
