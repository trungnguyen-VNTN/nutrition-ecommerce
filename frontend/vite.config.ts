import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  // Cognito's SRP dependency uses Node's global name in its browser bundle.
  define: { global: 'globalThis' },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // The only public asset is MSW's development worker. Never ship it.
  publicDir: command === 'serve' ? 'public' : false,
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
