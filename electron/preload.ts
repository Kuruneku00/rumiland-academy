/**
 * Rumiland Academy — Electron Preload
 *
 * یک bridge امن بین renderer و main با استفاده از contextBridge.
 * renderer تنها به API صریح زیر دسترسی دارد.
 */

import { contextBridge, ipcRenderer } from 'electron';

const bridge = {
  saveSnapshot: (json: string) => ipcRenderer.invoke('rumiland:saveSnapshot', json),
  loadSnapshot: () => ipcRenderer.invoke('rumiland:loadSnapshot'),
  getStoragePath: () => ipcRenderer.invoke('rumiland:getStoragePath'),

  // گرهای flush برای ذخیره فوری قبل از خروج
  onFlushRequest: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('rumiland:flush-request', listener);
    return () => ipcRenderer.removeListener('rumiland:flush-request', listener);
  },
};

contextBridge.exposeInMainWorld('__rumilandBridge', bridge);
