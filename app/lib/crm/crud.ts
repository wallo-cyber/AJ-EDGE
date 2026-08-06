import { readFromStorage, writeToStorage } from './storage';
import type { TimestampedEntity } from './types';

export type CrudService<T extends TimestampedEntity> = {
  list(): T[];
  get(id: string): T | undefined;
  create(item: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): T;
  update(id: string, changes: Partial<T>): T | undefined;
  remove(id: string): T[];
  replace(items: T[]): void;
};

export function createCrudService<T extends TimestampedEntity>(key: string): CrudService<T> {
  return {
    list() {
      return readFromStorage<T>(key);
    },
    get(id) {
      return this.list().find((item) => item.id === id);
    },
    create(item) {
      const now = new Date().toISOString();
      const entity = {
        ...(item as T),
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      } as T;
      const nextItems = [entity, ...this.list()];
      writeToStorage<T>(key, nextItems);
      return entity;
    },
    update(id, changes) {
      const items = this.list();
      const nextItems = items.map((item) => {
        if (item.id !== id) {
          return item;
        }

        return {
          ...item,
          ...changes,
          updatedAt: new Date().toISOString(),
        } as T;
      });
      writeToStorage<T>(key, nextItems);
      return nextItems.find((item) => item.id === id);
    },
    remove(id) {
      const nextItems = this.list().filter((item) => item.id !== id);
      writeToStorage<T>(key, nextItems);
      return nextItems;
    },
    replace(items) {
      writeToStorage<T>(key, items);
    },
  };
}
