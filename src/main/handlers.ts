import { app, ipcMain } from "electron";
import { getOrCreateAppWindow } from "./window";
import { logger } from "./logger";

type Handler = (e: Electron.IpcMainInvokeEvent, ...args: any[]) => Promise<any>;

export const handlers = {
  addNewTab: async () => {
    const window = getOrCreateAppWindow();
    window.addAppView();
  },
  removeTab: async (_, id: string) => {
    const window = getOrCreateAppWindow();
    window.removeView(id);
  },
  showTab: async (_, id: string) => {
    const window = getOrCreateAppWindow();
    window.showView(id);
  },
  getActiveTab: async () => {
    const window = getOrCreateAppWindow();
    return window.activeViewId;
  },
  getTabs: async () => {
    const window = getOrCreateAppWindow();
    return window.viewIds;
  },
  getActiveViewId: async () => {
    const window = getOrCreateAppWindow();
    return window.activeViewId;
  },
  getCurrentViewId: async (e) => {
    const window = getOrCreateAppWindow();
    return window.fromWebContentId(e.sender.id);
  },
} satisfies Record<string, Handler>;

export const events = {
  onTabsUpdated: () => {
    const window = getOrCreateAppWindow();
    const callback: (tabs: string[]) => void = (tabs) => {
      window.views.forEach((view) => {
        view.webContents.send("onTabsUpdated", tabs);
      });
    };
    window.onTabsUpdated(callback);
  },
  onActiveTabChanged: () => {
    const window = getOrCreateAppWindow();
    const callback: (tab: string) => void = (tab) => {
      window.views.forEach((view) => {
        view.webContents.send("onActiveTabChanged", tab);
      });
    };
    window.onActiveTabChanged(callback);
  }
};

export function registerHandlers() {
  const window = getOrCreateAppWindow();
  for (const [name, handler] of Object.entries(handlers)) {
    logger.info(`Register handler "${name}"`);
    ipcMain.handle(name, (e, ...args) => {
      logger.info(
        `Invoke handler "${name}" with args: [`,
        ...args,
        "], from",
        window.fromWebContentId(e.sender.id)
      );
      return (handler as Handler)(e, ...args);
    });
  }

  // register events
  for (const [name, handler] of Object.entries(events)) {
    logger.info(`Register event "${name}"`);
    (handler as Function)();
  }
}
