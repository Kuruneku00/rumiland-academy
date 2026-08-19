/**
 * Rumiland Academy — Persistence Layer
 *
 * داده‌ها را خارج از IndexedDB روی دیسک پایدار نگه می‌دارد تا پس از
 * بستن برنامه، پاک شدن کش مرورگر یا ری‌استارت سیستم از بین نروند.
 *
 * دو حالت:
 *   - Electron: از طریق window.__rumilandBridge (IPC) فایل JSON روی دیسک خوانده/نوشته می‌شود.
 *   - Web (fallback): از localStorage به عنوان ذخیره‌سازی جایگزین استفاده می‌شود.
 *
 * ساختار: snapshot کامل دیتابیس به‌صورت { <tableName>: <rows[]> }.
 */

import { db } from '@/db/schema';

const SNAPSHOT_KEY = 'rumiland-academy-snapshot';

// نام جدول‌های Dexie (به ترتیب تعریف در schema)
const TABLE_NAMES = [
  'users',
  'roles',
  'students',
  'teachers',
  'courses',
  'classes',
  'registrations',
  'sessions',
  'attendance',
  'payments',
  'financeTransactions',
  'recurringExpenses',
  'quizzes',
  'quizQuestions',
  'quizResults',
  'questionBank',
  'certificates',
  'announcements',
  'notifications',
  'academySettings',
  'auditLogs',
  'backupRecords',
] as const;

export type Snapshot = Partial<Record<(typeof TABLE_NAMES)[number], any[]>>;

// ================================================================
// DETECT ENVIRONMENT
// ================================================================

interface Bridge {
  saveSnapshot: (json: string) => Promise<{ ok: boolean; error?: string }>;
  loadSnapshot: () => Promise<{ ok: boolean; data?: string; error?: string }>;
  getStoragePath: () => Promise<string>;
}

function getBridge(): Bridge | null {
  const w = window as any;
  return w.__rumilandBridge || null;
}

export function isElectron(): boolean {
  return !!getBridge();
}

// ================================================================
// SNAPSHOT BUILD / APPLY
// ================================================================

/** خواندن همه رکوردهای همه جدول‌ها از Dexie و ساخت snapshot */
export async function buildSnapshot(): Promise<Snapshot> {
  const snapshot: Snapshot = {};
  for (const tableName of TABLE_NAMES) {
    const table = (db as any)[tableName];
    if (!table) continue;
    try {
      const rows = await table.toArray();
      snapshot[tableName] = rows;
    } catch (e) {
      console.warn(`[persistence] failed to read table ${tableName}`, e);
    }
  }
  return snapshot;
}

/** پاک کردن همه داده و ریختن snapshot به داخل Dexie */
export async function applySnapshot(snapshot: Snapshot): Promise<void> {
  for (const tableName of TABLE_NAMES) {
    const table = (db as any)[tableName];
    if (!table) continue;
    const rows = snapshot[tableName];
    if (!Array.isArray(rows)) continue;
    try {
      await table.clear();
      if (rows.length > 0) {
        await table.bulkPut(rows);
      }
    } catch (e) {
      console.warn(`[persistence] failed to apply table ${tableName}`, e);
    }
  }
}

// ================================================================
// SAVE / LOAD
// ================================================================

/** ذخیره snapshot کامل روی دیسک (Electron) یا localStorage (web) */
export async function persistSnapshot(): Promise<boolean> {
  const snapshot = await buildSnapshot();
  const json = JSON.stringify(snapshot);

  const bridge = getBridge();
  if (bridge) {
    try {
      const res = await bridge.saveSnapshot(json);
      return res?.ok === true;
    } catch (e) {
      console.error('[persistence] electron save failed', e);
      return false;
    }
  }

  try {
    localStorage.setItem(SNAPSHOT_KEY, json);
    return true;
  } catch (e) {
    console.error('[persistence] localStorage save failed', e);
    return false;
  }
}

/** بارگذاری snapshot از دیسک/LocalStorage و اعمال روی Dexie. در صورت نبود snapshot کاری نمی‌کند. */
export async function restoreSnapshot(): Promise<boolean> {
  let json: string | null = null;

  const bridge = getBridge();
  if (bridge) {
    try {
      const res = await bridge.loadSnapshot();
      if (res?.ok && res.data) json = res.data;
    } catch (e) {
      console.error('[persistence] electron load failed', e);
    }
  } else {
    try {
      json = localStorage.getItem(SNAPSHOT_KEY);
    } catch (e) {
      console.error('[persistence] localStorage load failed', e);
    }
  }

  if (!json) return false;

  try {
    const snapshot: Snapshot = JSON.parse(json);
    await applySnapshot(snapshot);
    console.log('[persistence] snapshot restored');
    return true;
  } catch (e) {
    console.error('[persistence] failed to parse snapshot', e);
    return false;
  }
}

export async function getStoragePath(): Promise<string> {
  const bridge = getBridge();
  if (bridge) {
    try {
      return await bridge.getStoragePath();
    } catch (e) {
      return '(نامشخص)';
    }
  }
  return '(localStorage — مرورگر)';
}

// ================================================================
// AUTO-PERSIST (debounced)
// ================================================================

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastPersist = Date.now();

/**
 * همگام‌سازی خودکار: بعد از هر تغییر در دیتابیس، با کمی تأخیر
 * (debounce) داده را روی دیسک ذخیره می‌کند.
 */
export function schedulePersist(delayMs = 1500): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    debounceTimer = null;
    try {
      await persistSnapshot();
      lastPersist = Date.now();
    } catch (e) {
      console.error('[persistence] auto-persist failed', e);
    }
  }, delayMs);
}

/**
 * اتصال به رویدادهای Dexie برای همگام‌سازی خودکار.
 * هر بار که داده‌ای create/update/delete می‌شود، ذخیره‌سازی زمان‌بندی می‌شود.
 */
export function hookAutoPersist(): void {
  for (const tableName of TABLE_NAMES) {
    const table = (db as any)[tableName];
    if (!table) continue;
    table.hook('creating', () => schedulePersist());
    table.hook('updating', () => schedulePersist());
    table.hook('deleting', () => schedulePersist());
  }
}

/** ذخیره فوری (بدون debounce) — مثلاً قبل از خروج */
export function flushPersist(): Promise<boolean> {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  return persistSnapshot();
}
