/**
 * Rumiland Academy — Electron Main Process
 *
 * - پنجره دسکتاپ مستقل می‌سازد.
 * - فایل داده پایدار (JSON) را در پوشه‌ی کاربر مدیریت می‌کند.
 * - از طریق IPC به renderer امکان خواندن/نوشتن snapshot می‌دهد.
 * - بکاپ دوره‌ای خودکار می‌گیرد.
 */

import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// ================================================================
// STORAGE PATHS
// ================================================================

const DATA_DIR = path.join(os.homedir(), '.rumiland-academy');
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

function ensureDirs(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/** نوشتن امن فایل (اول temp سپس rename) برای جلوگیری از خرابی */
function writeFileAtomic(filePath: string, content: string): void {
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, content, 'utf-8');
  fs.renameSync(tmp, filePath);
}

function saveSnapshot(json: string): { ok: boolean; error?: string } {
  try {
    ensureDirs();

    // بکاپ دورانی: قبل از overwrite، از نسخه قبلی کپی بگیرید (حداکثر 20 تا)
    if (fs.existsSync(DATA_FILE)) {
      const backupName = `data-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      try {
        const backups = fs.readdirSync(BACKUP_DIR).sort();
        while (backups.length >= 20) {
          const oldest = backups.shift();
          if (oldest) fs.unlinkSync(path.join(BACKUP_DIR, oldest));
        }
        fs.copyFileSync(DATA_FILE, path.join(BACKUP_DIR, backupName));
      } catch (backupErr) {
        console.warn('[main] backup rotation failed', backupErr);
      }
    }

    writeFileAtomic(DATA_FILE, json);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

function loadSnapshot(): { ok: boolean; data?: string; error?: string } {
  try {
    ensureDirs();
    if (!fs.existsSync(DATA_FILE)) return { ok: true, data: undefined };
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ================================================================
// IPC REGISTRATION
// ================================================================

function registerIpc(): void {
  ipcMain.handle('rumiland:saveSnapshot', async (_event, json: string) => {
    return saveSnapshot(json);
  });

  ipcMain.handle('rumiland:loadSnapshot', async () => {
    return loadSnapshot();
  });

  ipcMain.handle('rumiland:getStoragePath', async () => {
    return DATA_FILE;
  });
}

// ================================================================
// WINDOW
// ================================================================

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
    backgroundColor: '#0b1020',
    autoHideMenuBar: true,
    title: 'Rumiland Academy',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // لینک‌های خارجی در مرورگر سیستم باز شوند (نه داخل اپ)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ================================================================
// APP LIFECYCLE
// ================================================================

app.whenReady().then(() => {
  ensureDirs();
  registerIpc();
  createWindow();

  // بکاپ خودکار هفتگی: بلافاصله یک بار + سپس هر ۷ روز
  runWeeklyBackup();
  const weeklyTimer = setInterval(runWeeklyBackup, WEEKLY_MS);

  app.on('will-quit', () => {
    clearInterval(weeklyTimer);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// جلوگیری از بسته‌شدن ناگهانی بدون flush داده
app.on('before-quit', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('rumiland:flush-request');
  }
});

// ================================================================
// WEEKLY AUTOMATIC BACKUP
// ================================================================
// هر هفته یک بار (هر ۷ روز) یک نسخه پشتیبان جداگانه با پسوند weekly می‌سازد
// و بکاپ‌های weekly قدیمی‌تر از 30 روز را حذف می‌کند.

const WEEKLY_MS = 7 * 24 * 60 * 60 * 1000; // هر ۷ روز

function runWeeklyBackup(): void {
  try {
    ensureDirs();
    if (!fs.existsSync(DATA_FILE)) return;

    const stamp = new Date().toISOString().split('T')[0];
    const target = path.join(BACKUP_DIR, `weekly-${stamp}.json`);

    // اگر امروز قبلاً بکاپ weekly گرفته شده، تکرار نکن
    if (fs.existsSync(target)) return;

    fs.copyFileSync(DATA_FILE, target);

    // حذف بکاپ‌های weekly قدیمی‌تر از 30 روز
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (const f of fs.readdirSync(BACKUP_DIR)) {
      if (!f.startsWith('weekly-')) continue;
      const full = path.join(BACKUP_DIR, f);
      try {
        const st = fs.statSync(full);
        if (st.mtimeMs < cutoff && Date.now() - st.mtimeMs > WEEKLY_MS) {
          fs.unlinkSync(full);
        }
      } catch { /* ignore */ }
    }

    console.log('[main] weekly backup created:', target);
  } catch (e: any) {
    console.warn('[main] weekly backup failed', e);
  }
}
