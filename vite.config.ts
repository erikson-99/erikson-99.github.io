import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => ({
  // Do NOT inject secrets into the client. Use VITE_* for safe, public values only.
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
}));
