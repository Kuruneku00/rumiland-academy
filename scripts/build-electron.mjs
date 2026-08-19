/**
 * Rumiland Academy — Electron Build Script
 *
 * تایل‌های TypeScript مربوط به Electron را با esbuild به CommonJS
 * کامپایل می‌کند (زیرا Electron main/preload باید CommonJS باشند).
 */

import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function main() {
  // Main process
  await build({
    entryPoints: [path.join(root, 'electron', 'main.ts')],
    outfile: path.join(root, 'electron', 'main.cjs'),
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    external: ['electron'],
    sourcemap: false,
  });

  // Preload
  await build({
    entryPoints: [path.join(root, 'electron', 'preload.ts')],
    outfile: path.join(root, 'electron', 'preload.cjs'),
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    external: ['electron'],
    sourcemap: false,
  });

  console.log('[electron] main.cjs + preload.cjs built');
}

main().catch((err) => {
  console.error('[electron] build failed', err);
  process.exit(1);
});
