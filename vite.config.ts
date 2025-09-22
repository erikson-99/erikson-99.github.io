import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => ({
  // Ensure the app works when served from a sub path (e.g. behind a reverse proxy)
  // or opened directly from the file system. Using a relative base fixes missing
  // asset 404s that resulted in a blank page on localhost and production.
  base: './',
  // Do NOT inject secrets into the client. Use VITE_* for safe, public values only.
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
}));
