import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { galleryServicePlugin } from './server/gallery-service.mjs';

export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? '/pretty-pictures/' : '/',
  define: { 'import.meta.env.VITE_GALLERY_MODE': JSON.stringify(mode === 'pages' ? 'static' : 'local') },
  plugins: [react(), ...(mode === 'pages' ? [] : [galleryServicePlugin()])],
  build: { outDir: mode === 'pages' ? 'build-pages' : 'build' },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['src/**/*.test.{js,jsx}', 'tests/**/*.test.{js,jsx}'],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}', 'scripts/*.mjs', 'server/*.mjs'],
      exclude: ['src/**/*.test.{js,jsx}', 'src/main.jsx'],
      reporter: ['text', 'html', 'json-summary'],
      thresholds: { statements: 90, branches: 85, functions: 90, lines: 90 },
    },
  },
}));
