import { resolve } from "node:path";

import { fileURLToPath } from "url";

export const root = fileURLToPath(new URL("..", import.meta.url));
export const NODE_MAJOR_VERSION = 18;

/** @return {import('esbuild').BuildOptions} */
export const config = () => {
  return {
    entryPoints: [
      resolve(root, "./src/main/index.ts"),
      resolve(root, "./src/helper/index.ts"),
      resolve(root, "./src/preload/index.ts"),
    ],
    outdir: resolve(root, "./dist"),
    bundle: true,
    target: `node${NODE_MAJOR_VERSION}`,
    platform: "node",
    external: ["electron", "electron-log", "electron-window-state"],
    format: "cjs",
  };
};
