import { app, ipcMain } from "electron";
import { getOrCreateAppWindow } from "./window";
import { logger } from "./logger";

type Handler = (e: Electron.IpcMainInvokeEvent, ...args: any[]) => Promise<any>;

export const uiHandlers = {
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
  revealDevTools: async (e) => {
    const window = getOrCreateAppWindow();
    window.revealDevTools(window.fromWebContentId(e.sender.id));
  },
} satisfies Record<string, Handler>;

export const handlers = {
  ui: uiHandlers
}

export const events = {
  onTabsUpdated: () => {
    const window = getOrCreateAppWindow();
    const callback: (tabs: string[]) => void = (tabs) => {
      window.allViews.forEach((view) => {
        view.webContents.send("onTabsUpdated", tabs);
      });
    };
    return window.viewIds$.subscribe((ids) => {
      callback(ids);
    });
  },
  onActiveTabChanged: () => {
    const window = getOrCreateAppWindow();
    const callback: (tab: string) => void = (tab) => {
      window.allViews.forEach((view) => {
        view.webContents.send("onActiveTabChanged", tab);
      });
    };
    return window.activeViewId$.subscribe((id) => {
      callback(id);
    });
  },
};

export function registerHandlers() {
  for (const [namespace, namespaceHandlers] of Object.entries(handlers)) {
    for (const [key, handler] of Object.entries(namespaceHandlers)) {
      const name = `${namespace}:${key}`;
      logger.info(`Register handler "${name}"`);
      ipcMain.handle(name, handler);
    }
  }

  // register events
  for (const [name, handler] of Object.entries(events)) {
    logger.info(`Register event "${name}"`);
    const subscription = handler();
    app.on("before-quit", () => {
      subscription.unsubscribe();
    });
  }
}
