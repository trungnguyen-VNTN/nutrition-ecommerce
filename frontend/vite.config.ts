import { rmSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

// public/ holds the favicon, app icons and manifest (shipped) and MSW's development worker
// (never shipped). Vite copies the whole folder, so the worker is removed from the build output.
function dropDevWorker(): Plugin {
  let outDir = 'dist';
  return {
    name: 'drop-msw-worker',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      rmSync(
        fileURLToPath(
          new URL(`./${outDir}/mockServiceWorker.js`, import.meta.url),
        ),
        {
          force: true,
        },
      );
    },
  };
}

export default defineConfig(() => ({
  plugins: [react(), tailwindcss(), dropDevWorker()],
  // Cognito's SRP dependency uses Node's global name in its browser bundle.
  define: { global: 'globalThis' },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:8080' },
  },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  build: {
    rollupOptions: {
      output: {
        // Stable vendor chunks cache across deploys; app code changes more often.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/amazon-cognito|[\\/]buffer[\\/]|@aws-crypto|js-cookie/.test(id))
            return 'vendor-auth';
          if (/[\\/](react|react-dom|react-router|scheduler)[\\/]/.test(id))
            return 'vendor-react';
          if (/@tanstack|[\\/]zod[\\/]/.test(id)) return 'vendor-data';
          return undefined;
        },
      },
    },
  },
}));
