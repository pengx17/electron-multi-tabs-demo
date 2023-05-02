import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

/** @type {import('vite').UserConfig} */
export default {
  server: {
    port: 5173,
  },
  plugins: [react()],
  cacheDir: resolve(__dirname, './.vite'),
}
