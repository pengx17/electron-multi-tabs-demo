import { resolve } from "node:path";

import { fileURLToPath } from "url";

export const root = fileURLToPath(new URL("..", import.meta.url));
export const NODE_MAJOR_VERSION = 18;

/** @return {Record<string, import('esbuild').BuildOptions>} */
export const config = () => {
  return {
    main: {
      entryPoints: [resolve(root, "./src/main/index.ts")],
      outdir: resolve(root, "./dist/main"),
      bundle: true,
      target: `node${NODE_MAJOR_VERSION}`,
      platform: "node",
      external: ["electron", "electron-log", "electron-window-state"],
      format: "cjs",
    },
    preload: {
      entryPoints: [resolve(root, "./src/preload/index.ts")],
      outdir: resolve(root, "./dist/preload"),
      bundle: true,
      target: `node${NODE_MAJOR_VERSION}`,
      platform: "node",
      external: ["electron"],
      treeShaking: true,
    },
  };
};
