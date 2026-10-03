import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Declare process for environments where @types/node is not installed
declare const process: { env: Record<string, string | undefined> };

const tauriDevHost = process.env['TAURI_DEV_HOST'];
const isDebug = !!process.env['TAURI_ENV_DEBUG'];
const platform = process.env['TAURI_ENV_PLATFORM'];

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // 1. prevent vite from obscuring rust errors
  clearScreen: false,

  server: {
    port: 5173,
    strictPort: true,
    host: tauriDevHost || 'localhost',
    hmr: tauriDevHost
      ? {
          protocol: 'ws' as const,
          host: tauriDevHost,
          port: 5174,
        }
      : undefined,
    watch: {
      // 2. tell vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },

  // 3. access Tauri environment variables
  envPrefix: ['VITE_', 'TAURI_ENV_*'],

  build: {
    // Tauri uses Chromium on Linux/Windows, Safari on macOS
    target: platform === 'windows' ? 'chrome105' : 'safari13',
    // don't minify for debug builds
    minify: isDebug ? false : ('esbuild' as const),
    // produce sourcemaps for debug builds
    sourcemap: isDebug,
  },
});
