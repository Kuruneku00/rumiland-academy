/**
 * Rumiland Academy — Base API Service
 * Abstract service with common CRUD operations and error handling.
 */

import { db } from '@/db/schema';
import type { Table } from 'dexie';
import { v4 as uuid } from 'uuid';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export abstract class BaseService<T extends { id: string }> {
  protected table: Table<T, string>;
  protected tableName: string;

  constructor(table: Table<T, string>, tableName: string) {
    this.table = table;
    this.tableName = tableName;
  }

  async getAll(): Promise<T[]> {
    return this.table.filter((item: any) => !item.deleted_at).toArray();
  }

  async getById(id: string): Promise<T | undefined> {
    return this.table.get(id);
  }

  async getPaginated(options: {
    page?: number; perPage?: number; sortBy?: string; sortDirection?: 'asc' | 'desc';
    filters?: (item: any) => boolean; searchFn?: (item: any) => boolean;
  } = {}): Promise<PaginatedResult<T>> {
    const { page = 1, perPage = 20, sortBy = 'created_at', sortDirection = 'desc', filters, searchFn } = options;

    let collection = this.table.filter((item: any) => !item.deleted_at);
    let allItems = await collection.toArray();

    if (filters) allItems = allItems.filter(filters);
    if (searchFn) allItems = allItems.filter(searchFn);

    allItems.sort((a: any, b: any) => {
      const av = a[sortBy]; const bv = b[sortBy];
      if (av == null && bv == null) return 0;
      if (av == null) return 1; if (bv == null) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    const total = allItems.length;
    const start = (page - 1) * perPage;
    const data = allItems.slice(start, start + perPage);

    return { data, total, page, perPage };
  }

  async create(data: Partial<T> & { id?: string }): Promise<ServiceResponse<T>> {
    try {
      const now = new Date().toISOString();
      const item = {
        ...data,
        id: data.id || uuid(),
        created_at: (data as any).created_at || now,
        updated_at: (data as any).updated_at || now,
      } as unknown as T;
      await this.table.put(item);
      return { success: true, data: item };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async update(id: string, data: Partial<T>): Promise<ServiceResponse<T>> {
    try {
      const existing = await this.table.get(id);
      if (!existing) return { success: false, error: 'Not found' };
      const updated = { ...existing, ...data, id, updated_at: new Date().toISOString() } as T;
      await this.table.put(updated);
      return { success: true, data: updated };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async delete(id: string, soft: boolean = true): Promise<ServiceResponse<boolean>> {
    try {
      if (soft) {
        await this.table.update(id, { updated_at: new Date().toISOString() } as any);
        // For soft delete we set deleted_at via update
        const existing = await this.table.get(id);
        if (existing) {
          await this.table.put({ ...existing, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any as T);
        }
      } else {
        await this.table.delete(id);
      }
      return { success: true, data: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async count(filters?: (item: any) => boolean): Promise<number> {
    let items = await this.table.filter((item: any) => !item.deleted_at).toArray();
    if (filters) items = items.filter(filters);
    return items.length;
  }

  generateId(): string {
    return uuid();
  }
}