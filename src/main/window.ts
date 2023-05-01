import { BrowserView, BrowserWindow } from "electron";
import electronWindowState from "electron-window-state";
import { join } from "node:path";
import { nanoid } from "nanoid";

import { logger } from "./logger";

const IS_DEV: boolean =
  process.env.NODE_ENV === "development" && !process.env.CI;

const DEV_TOOL = process.env.DEV_TOOL === "true";

const TAB_HEIGHT = 40;

class AppWindow {
  // multiple tabs
  views = new Map<string, BrowserView>();
  window: BrowserWindow;
  activeViewId: string;
  listeners: Record<string, ((...args: any[]) => void)[]> = {};

  constructor() {
    this.window = this.createWindow();
  }

  get viewIds() {
    // this is an ordered list
    return [...this.views.keys()];
  }

  createWindow() {
    logger.info("create window");
    const mainWindowState = electronWindowState({
      defaultWidth: 1000,
      defaultHeight: 800,
    });

    const window = new BrowserWindow({
      titleBarStyle: "hiddenInset",
      x: mainWindowState.x,
      y: mainWindowState.y,
      height: mainWindowState.height,
      width: mainWindowState.width,
      visualEffectState: "active",
      vibrancy: "under-window",
      show: false,
    });

    this.window = window;

    window.once("close", (e) => {
      if (window.webContents.isDevToolsOpened()) {
        window.webContents.closeDevTools();
      }
      e.preventDefault();
      window.destroy();
      // TODO: gracefully close the app, for example, ask user to save unsaved changes
    });

    this.addShellView();
    this.addAppView();

    return window;
  }

  addShellView() {
    const pageUrl = process.env.RENDERER_SHELL_URL || "file://./index.html";
    const view = new BrowserView({
      webPreferences: {
        webgl: true,
        contextIsolation: true,
        sandbox: false,
        spellcheck: false,
        preload: join(__dirname, "../preload/index.js"),
        additionalArguments: [`--id=shell`],
      },
    });

    this.views.set("shell", view);

    this.window.on("resize", () => {
      this.resizeView("shell");
    });

    this.window.addBrowserView(view);
    view.webContents.loadURL(pageUrl);
    logger.info("add shell");

    this.resizeView("shell");

    view.webContents.openDevTools();
  }

  resizeView(id: string) {
    const view = this.views.get(id);
    const { width, height } = this.window.getContentBounds();
    if (id === "shell") {
      view.setBounds({ x: 0, y: 0, width, height });
      return;
    }

    if (view) {
      if (this.activeViewId === id) {
        view.setBounds({
          x: 0,
          y: TAB_HEIGHT,
          width,
          height: height - TAB_HEIGHT,
        });
      } else {
        // hide it
        view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
      }
    }
  }

  addAppView() {
    const id = nanoid();
    const pageUrl = process.env.RENDERER_APP_URL || "file://./index.html";
    const view = new BrowserView({
      webPreferences: {
        webgl: true,
        contextIsolation: true,
        sandbox: false,
        spellcheck: false,
        preload: join(__dirname, "../preload/index.js"),
        additionalArguments: [`--id=${id}`],
      },
    });
    this.window.addBrowserView(view);

    this.views.set(id, view);
    this.window.setTopBrowserView(view);

    this.window.on("resize", () => {
      this.resizeView(id);
    });

    view.webContents.loadURL(pageUrl);
    logger.info("add view", id);

    this.window.showInactive();

    this.showView(id);
    this.resizeView(id);
    this.notifyTabsUpdated();
  }

  removeView(id: string) {
    const view = this.views.get(id);
    if (view) {
      this.window.removeBrowserView(view);
      this.views.delete(id);
    }
    this.notifyTabsUpdated();
  }

  toWebContentId(id: string) {
    const view = this.views.get(id);
    if (view) {
      return view.webContents.id;
    }
    return -1;
  }

  fromWebContentId(webContentId: number) {
    for (const [id, view] of this.views.entries()) {
      if (view.webContents.id === webContentId) {
        return id;
      }
    }
    return undefined;
  }

  showView(id: string) {
    this.activeViewId = id;
    const view = this.views.get(id);
    if (view) {
      this.window.setTopBrowserView(view);
    }
    this.revealDevTools(id);
    this.notifyActiveTabChanged();
  }

  closeDevTools() {
    if (this.window.webContents.isDevToolsOpened()) {
      this.window.webContents.closeDevTools();
    }

    for (const [id, view] of this.views) {
      if (view.webContents.isDevToolsOpened() && id !== "shell") {
        view.webContents.closeDevTools();
      }
    }
  }

  revealDevTools(id: string) {
    this.closeDevTools();
    const view = this.views.get(id);
    if (view) {
      view.webContents.openDevTools();
    }
  }

  onTabsUpdated(callback: (tabs: string[]) => void) {
    this.listeners.tabsUpdated = this.listeners.tabsUpdated || [];
    this.listeners.tabsUpdated.push(() => {
      callback(this.viewIds);
    });
  }

  onActiveTabChanged(callback: (tabId: string) => void) {
    this.listeners.activeTabChanged = this.listeners.activeTabChanged || [];
    this.listeners.activeTabChanged.push(() => {
      callback(this.activeViewId);
    });
  }

  notifyTabsUpdated() {
    if (this.listeners.tabsUpdated) {
      this.listeners.tabsUpdated.forEach((callback) => {
        callback(this.viewIds);
      });
    }
  }

  notifyActiveTabChanged() {
    if (this.listeners.activeTabChanged) {
      this.listeners.activeTabChanged.forEach((callback) => {
        callback(this.activeViewId);
      });
    }

    this.views.forEach((_, id) => {
      this.resizeView(id);
    });
  }
}

let window: AppWindow;

export function getOrCreateAppWindow() {
  if (!window) {
    // will create a new browser window on instantiation
    window = new AppWindow();
  }
  return window;
}
