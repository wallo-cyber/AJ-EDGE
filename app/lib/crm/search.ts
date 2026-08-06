import type { FilterValue } from './types';

export function searchItems<T extends Record<string, unknown>>(items: T[], query: string, fields: Array<keyof T>) {
  if (!query.trim()) {
    return items;
  }

  const normalized = query.toLowerCase();
  return items.filter((item) => fields.some((field) => {
    const value = item[field];
    return typeof value === 'string' && value.toLowerCase().includes(normalized);
  }));
}

export function filterItems<T extends Record<string, unknown>>(items: T[], filters: Record<string, FilterValue>) {
  return items.filter((item) => Object.entries(filters).every(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return true;
    }

    const candidate = item[key];
    return typeof candidate === 'string' && candidate.includes(String(value));
  }));
}

export function sortItems<T extends Record<string, unknown>>(items: T[], sortKey: keyof T, direction: 'asc' | 'desc' = 'asc') {
  const sorted = [...items].sort((left, right) => {
    const leftValue = String(left[sortKey] ?? '');
    const rightValue = String(right[sortKey] ?? '');
    return leftValue.localeCompare(rightValue, 'ar');
  });

  return direction === 'desc' ? sorted.reverse() : sorted;
}

export function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return {
    items: items.slice(start, end),
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
    totalItems: items.length,
  };
}

export function calculateStats<T>(items: T[]) {
  return {
    total: items.length,
    hasItems: items.length > 0,
  };
}
