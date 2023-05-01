import { spawn } from "node:child_process";

import electronPath from "electron";
import * as esbuild from "esbuild";

import { config } from "./common.mjs";

/** @type 'production' | 'development'' */
const mode = (process.env.NODE_ENV = process.env.NODE_ENV || "development");

/** Messages on stderr that match any of the contained patterns will be stripped from output */
const stderrFilterPatterns = [
  // warning about devtools extension
  // https://github.com/cawa-93/vite-electron-builder/issues/492
  // https://github.com/MarshallOfSound/electron-devtools-installer/issues/143
  /ExtensionLoadWarning/,
];

// hard-coded for now:
// fixme(xp): report error if app is not running on DEV_SERVER_URL
const DEV_SERVER_URL = (process.env.DEV_SERVER_URL =
  process.env.DEV_SERVER_URL || "http://localhost:5173");

/** @type {ChildProcessWithoutNullStreams | null} */
let spawnProcess = null;

function spawnOrReloadElectron() {
  if (spawnProcess !== null) {
    spawnProcess.off("exit", process.exit);
    spawnProcess.kill("SIGINT");
    spawnProcess = null;
  }

  spawnProcess = spawn(String(electronPath), ["."]);

  spawnProcess.stdout.on("data", (d) => {
    let str = d.toString().trim();
    if (str) {
      console.log(str);
    }
  });
  spawnProcess.stderr.on("data", (d) => {
    const data = d.toString().trim();
    if (!data) return;
    const mayIgnore = stderrFilterPatterns.some((r) => r.test(data));
    if (mayIgnore) return;
    console.error(data);
  });

  // Stops the watch script when the application has quit
  spawnProcess.on("exit", process.exit);
}

const common = config();

function watchRenderer() {
  const rendererBuild = spawn('vite');

  rendererBuild.stdout.on("data", (d) => {
    let str = d.toString().trim();
    if (str) {
      console.log(str);
    }
  });
  rendererBuild.stderr.on("data", (d) => {
    const data = d.toString().trim();
    if (!data) return;
    const mayIgnore = stderrFilterPatterns.some((r) => r.test(data));
    if (mayIgnore) return;
    console.error(data);
  });
}

function watchPreload() {
  return new Promise(async (res) => {
    let initialBuild = false;
    const preloadBuild = await esbuild.context({
      ...common.preload,
      plugins: [
        ...(common.preload.plugins ?? []),
        {
          name: "electron-dev:reload-app-on-preload-change",
          setup(build) {
            build.onEnd(() => {
              if (initialBuild) {
                console.log(`[preload] has changed, [re]launching electron...`);
                spawnOrReloadElectron();
              } else {
                res();
                initialBuild = true;
              }
            });
          },
        },
      ],
    });
    // watch will trigger build.onEnd() on first run & on subsequent changes
    await preloadBuild.watch();
  });
}

async function watchMain() {
  return new Promise(async (res) => {
    const define = {
      ...common.main.define,
      "process.env.NODE_ENV": `"${mode}"`,
    };

    if (DEV_SERVER_URL) {
      define["process.env.DEV_SERVER_URL"] = `"${DEV_SERVER_URL}"`;
    }

    let initialBuild = false;

    const mainBuild = await esbuild.context({
      ...common.main,
      define: define,
      plugins: [
        ...(common.main.plugins ?? []),
        {
          name: "electron-dev:reload-app-on-main-change",
          setup(build) {
            build.onEnd(() => {
              if (initialBuild) {
                console.log(`[main] has changed, [re]launching electron...`);
                spawnOrReloadElectron();
              } else {
                res();
              }
            });
          },
        },
      ],
    });
    await mainBuild.watch();
  });
}

async function main() {
  watchRenderer();
  await watchPreload();
  await watchMain();
  spawnOrReloadElectron();
  console.log(`Electron is started, watching for changes...`);
}

main();
