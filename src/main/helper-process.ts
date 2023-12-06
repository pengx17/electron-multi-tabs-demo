import path from "node:path";

import {
  BrowserView,
  MessageChannelMain,
  app,
  dialog,
  utilityProcess,
} from "electron";

import { getAppWindow } from "./window";
import { logger } from "./logger";
import { AsyncCall } from "async-call-rpc/base";

export function spawnHelperProcess() {
  logger.info("spawning utilityProcess ...");
  const helperProcess = utilityProcess.fork(
    path.join(__dirname, "../helper/index.js"),
    null
  );

  const subscriptions = new Map<BrowserView, () => void>();

  function connect(key: string, view: BrowserView) {
    const { port1, port2 } = new MessageChannelMain();
    const webContents = view.webContents;
    webContents.once("dom-ready", () => {
      webContents.postMessage("port", null, [port1]);
    });

    helperProcess.postMessage(
      {
        type: "add-view",
        viewId: key,
      },
      [port2]
    );

    logger.info("connection", key);

    return () => {
      port1.close();
      port2.close();
      subscriptions.delete(view);
      logger.info("closed connection", key);
    };
  }

  helperProcess
    .on("spawn", () => {
      logger.info("spawned new utilityProcess");

      const window = getAppWindow();
      let prevViews = new Set<BrowserView>();

      // whenever a new browser view is created, create a new port pair
      window.allViewsMapping$.subscribe((mapping) => {
        // added views
        [...mapping.entries()]
          .filter(([, view]) => !prevViews.has(view))
          .forEach(([key, view]) => {
            subscriptions.set(view, connect(key, view));
          });

        const views = new Set(mapping.values());
        // removed views
        [...prevViews.values()]
          .filter((view) => !views.has(view))
          .forEach((view) => {
            subscriptions.get(view)?.();
          });
        prevViews = views;
      });
    })
    .on("message", (message) => {
      logger.info("message from utilityProcess", message);
    })
    .on("exit", (code) => {
      logger.info("existing utilityProcess");
      subscriptions.forEach((unsubscribe) => unsubscribe());
    });

  AsyncCall(
    {
      "dialog.showOpenDialog": dialog.showOpenDialog,
      getAppPath: app.getAppPath.bind(app),
      getPath: app.getPath.bind(app),
    },
    {
      channel: {
        on(listener: (data: unknown) => void) {
          helperProcess.addListener("message", listener);
          return () => {
            this.worker.removeListener("message", listener);
          };
        },
        send(data: unknown) {
          helperProcess.postMessage(data);
        },
      },
    }
  );

  // do we need the following?
  app.on("before-quit", () => {
    helperProcess.kill();
  });
}
