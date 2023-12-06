import { app } from "electron";

import { logger } from "./logger";
import { createAppWindow } from "./window";
import { events, handlers, registerHandlers } from "./handlers";
import { spawnHelperProcess } from "./helper-process";

/**
 * Prevent multiple instances
 */
const isSingleInstance = app.requestSingleInstanceLock();
if (!isSingleInstance) {
  logger.info("Another instance is running, exiting...");
  app.quit();
  process.exit(0);
}

/**
 * Shout down background process if all windows was closed
 */
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

/**
 * Create app window when background process will be ready
 */
app
  .whenReady()
  .then(() => {
    const exposedMeta = (() => {
      const handlersMeta = Object.entries(handlers).map(
        ([namespace, namespaceHandlers]) => {
          return [
            namespace,
            Object.keys(namespaceHandlers).map((handlerName) => handlerName),
          ];
        }
      );

      const eventsMeta = Object.keys(events);

      return {
        events: eventsMeta,
        handlers: handlersMeta,
      };
    })();

    return createAppWindow(exposedMeta);
  })
  .then(registerHandlers)
  .then(spawnHelperProcess)
  .catch((e) => console.error("Failed create window:", e));

app.name = "Affine";
