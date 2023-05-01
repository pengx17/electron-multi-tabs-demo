import { app } from "electron";

import { logger } from "./logger";
import { getOrCreateAppWindow } from "./window";
import { registerHandlers } from "./handlers";

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
  .then(getOrCreateAppWindow)
  .then(registerHandlers)
  .catch((e) => console.error("Failed create window:", e));

app.name = "Affine";