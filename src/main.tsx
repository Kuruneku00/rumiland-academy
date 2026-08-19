/**
 * Rumiland Academy — Application Bootstrap
 */

import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/500.css';
import '@fontsource/vazirmatn/600.css';
import '@fontsource/vazirmatn/700.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { restoreSnapshot, hookAutoPersist, flushPersist, isElectron } from '@/services/persistence';
import './theme/tokens.css';

// Add global animations CSS
const styleEl = document.createElement('style');
styleEl.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes skeletonPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .card-hover:hover {
    box-shadow: var(--shadow-card-hover);
    border-color: rgba(99, 102, 241, 0.15);
    transform: translateY(-1px);
  }
  .btn:hover:not(:disabled) {
    filter: brightness(1.1);
  }
  .icon-btn:hover:not(:disabled) {
    background: var(--color-surface-hover);
    color: var(--color-text-primary);
  }
  .table-row:hover {
    background: var(--color-surface-hover) !important;
  }
`;
document.head.appendChild(styleEl);

async function bootstrap() {
  // بازیابی داده‌های پایدار قبل از رندر (اگر موجود باشد)
  try {
    await restoreSnapshot();
  } catch (e) {
    console.error('[bootstrap] restore failed', e);
  }

  // اتصال همگام‌سازی خودکار: هر تغییر → ذخیره روی دیسک
  hookAutoPersist();

  // ذخیره فوری قبل از خروج از برنامه (Electron)
  if (isElectron()) {
    const bridge = (window as any).__rumilandBridge;
    if (bridge && typeof bridge.onFlushRequest === 'function') {
      bridge.onFlushRequest(() => { flushPersist(); });
    }
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();