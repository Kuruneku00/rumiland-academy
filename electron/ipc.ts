/**
 * Rumiland Academy — IPC Channel Names & Types
 *
 * یک تعریف واحد از نام‌های کانال IPC برای هماهنگی بین main و preload.
 */

export const IPC_CHANNELS = {
  SAVE_SNAPSHOT: 'rumiland:saveSnapshot',
  LOAD_SNAPSHOT: 'rumiland:loadSnapshot',
  GET_STORAGE_PATH: 'rumiland:getStoragePath',
  FLUSH_REQUEST: 'rumiland:flush-request',
} as const;

export interface SaveSnapshotResult {
  ok: boolean;
  error?: string;
}

export interface LoadSnapshotResult {
  ok: boolean;
  data?: string;
  error?: string;
}
