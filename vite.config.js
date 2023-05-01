import path, { resolve } from 'node:path';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

/** @type {import('vite').UserConfig} */
export default {
  plugins: [react()],
  root: path.resolve(__dirname, './src/renderer'),
}
