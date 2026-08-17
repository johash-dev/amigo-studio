import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 3998,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:3999',
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 3998,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
