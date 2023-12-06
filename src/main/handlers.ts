import { app, ipcMain } from "electron";
import { getAppWindow } from "./window";
import { logger } from "./logger";

type Handler = (e: Electron.IpcMainInvokeEvent, ...args: any[]) => Promise<any>;

export const uiHandlers = {
  addNewTab: async () => {
    const window = getAppWindow();
    window.addAppView();
  },
  removeTab: async (_, id: string) => {
    const window = getAppWindow();
    window.removeView(id);
  },
  showTab: async (_, id: string) => {
    const window = getAppWindow();
    window.showView(id);
  },
  getActiveTab: async () => {
    const window = getAppWindow();
    return window.activeViewId;
  },
  getTabs: async () => {
    const window = getAppWindow();
    return window.viewIds;
  },
  getActiveViewId: async () => {
    const window = getAppWindow();
    return window.activeViewId;
  },
  getCurrentViewId: async (e) => {
    const window = getAppWindow();
    return window.fromWebContentId(e.sender.id);
  },
  revealDevTools: async (e) => {
    const window = getAppWindow();
    window.revealDevTools(window.fromWebContentId(e.sender.id));
  },
} satisfies Record<string, Handler>;

export const handlers = {
  ui: uiHandlers,
};

// event listeners are attached to main event stream which are exposed as Observables
export const events = {
  onTabsUpdated: (fn: (tabs: string[]) => void) => {
    const window = getAppWindow();
    const unsub = window.viewIds$.subscribe((ids) => {
      fn(ids);
    });
    return () => {
      unsub.unsubscribe();
    };
  },
  onActiveTabChanged: (fn: (tab: string) => void) => {
    const window = getAppWindow();
    const unsub = window.activeViewId$.subscribe((id) => {
      fn(id);
    });
    return () => {
      unsub.unsubscribe();
    };
  },
};

export function registerHandlers() {
  logger.info("Register handlers");
  const window = getAppWindow();
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
    const subscription = handler((...args) => {
      window.allViews.forEach((view) => {
        view.webContents.send(name, ...args);
      });
    });
    app.on("before-quit", () => {
      subscription();
    });
  }
}
