import path, { resolve } from 'node:path';
import react from '@vitejs/plugin-react';

/** @type {import('vite').UserConfig} */
export default {
  server: {
    port: 5174,
  },
  plugins: [react()],
  cacheDir: resolve(__dirname, './.vite'),
}
