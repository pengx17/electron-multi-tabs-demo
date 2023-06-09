import path from "node:path";

import { MessageChannelMain, utilityProcess } from "electron";

import { getOrCreateAppWindow } from "./window";

export function spawnHelperProcess() {
  // Create Message port pair for Renderer <-> Utility Process.
  const { port1: rendererPort, port2: helperPort } = new MessageChannelMain();

  const window = getOrCreateAppWindow();

  // port should be send to all browser views
  window.views.forEach((view) => {
    view.webContents.postMessage("port", null, [rendererPort]);
  });

  const helperProcess = utilityProcess.fork(
    path.join(__dirname, "../helper/index.js")
  );

  helperProcess
    .on("spawn", () => {
      console.log("spawned new utilityProcess");
      helperProcess.postMessage("port", [helperPort]);
    })
    .on("message", (message) => {
      console.log("message from utilityProcess", message);
    })
    .on("exit", (code) => console.log("existing utilityProcess"));
}
