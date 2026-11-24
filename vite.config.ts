import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: { three: ['three'], react: ['react', 'react-dom', 'react-router-dom'] },
      },
    },
  },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8787', '/uploads': 'http://localhost:8787' },
  },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
} as any);
