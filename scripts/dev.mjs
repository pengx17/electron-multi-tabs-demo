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
// fixme(xp): report error if app is not running on RENDERER_APP_URL
const RENDERER_APP_URL = (process.env.RENDERER_APP_URL =
  process.env.RENDERER_APP_URL || "http://localhost:5173");

const RENDERER_SHELL_URL = (process.env.RENDERER_SHELL_URL =
  process.env.RENDERER_SHELL_URL || "http://localhost:5174");

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

async function watch() {
  return new Promise((res) => {
    const define = {
      ...common.define,
      "process.env.NODE_ENV": `"${mode}"`,
    };

    if (RENDERER_APP_URL) {
      define["process.env.RENDERER_APP_URL"] = `"${RENDERER_APP_URL}"`;
    }

    if (RENDERER_SHELL_URL) {
      define["process.env.RENDERER_SHELL_URL"] = `"${RENDERER_SHELL_URL}"`;
    }

    let initialBuild = false;

    esbuild
      .context({
        ...common,
        define: define,
        plugins: [
          ...(common.plugins ?? []),
          {
            name: "electron-dev:reload-app-on-change",
            setup(build) {
              build.onEnd(() => {
                if (initialBuild) {
                  console.log(
                    `[electron code] has changed, [re]launching electron...`
                  );
                  spawnOrReloadElectron();
                } else {
                  res();
                  initialBuild = true;
                }
              });
            },
          },
        ],
      })
      .then((context) => {
        context.watch();
      });
  });
}

async function main() {
  await watch();
  spawnOrReloadElectron();
  console.log(`Electron is started, watching for changes...`);
}

main();
