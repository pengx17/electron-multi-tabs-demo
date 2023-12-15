import { BrowserView, BrowserWindow } from "electron";
import electronWindowState from "electron-window-state";
import { nanoid } from "nanoid";
import { join } from "node:path";
import { BehaviorSubject, combineLatest, map } from "rxjs";

import { logger } from "./logger";

const TAB_HEIGHT = 40;

class AppWindow {
  // multiple tabs
  window: BrowserWindow;
  shellView: BrowserView;
  #views$ = new BehaviorSubject<Map<string, BrowserView>>(
    new Map<string, BrowserView>()
  );
  #activeViewId$ = new BehaviorSubject<string>(null);

  viewsMapping$ = this.#views$.asObservable();
  viewIds$ = this.#views$.pipe(map((views) => Array.from(views.keys())));
  allViewsMapping$ = this.viewsMapping$.pipe(
    map((views) => {
      return new Map(views.entries()).set("shell", this.shellView);
    })
  );
  activeViewId$ = this.#activeViewId$.asObservable();

  constructor(public exposedMeta: any) {
    this.window = this.createWindow();
  }

  get views() {
    return this.#views$.value;
  }

  get allViews() {
    // all views including shell view
    return [this.shellView, ...this.views.values()];
  }

  get viewIds() {
    return Array.from(this.views.keys());
  }

  get activeViewId() {
    return this.#activeViewId$.value;
  }

  getViewById(id: string) {
    if (id === "shell") {
      return this.shellView;
    } else {
      return this.views.get(id);
    }
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

    window.setWindowButtonVisibility?.(false);

    window.once("close", (e) => {
      if (window.webContents.isDevToolsOpened()) {
        window.webContents.closeDevTools();
      }
      e.preventDefault();
      window.destroy();
      // TODO: gracefully close the app, for example, ask user to save unsaved changes
    });

    this.#views$.next(this.views);

    this.addShellView();
    this.addAppView();

    // local listeners
    this.#activeViewId$.subscribe(() => {
      // resize all views
      this.views.forEach((_, id) => {
        this.resizeView(id);
      });
    });

    combineLatest([this.#views$, this.#activeViewId$]).subscribe(
      ([views, activeViewId]) => {
        const viewIds = Array.from(views.keys());
        if (!viewIds.includes(activeViewId)) {
          this.#activeViewId$.next(viewIds.at(-1));
        }
      }
    );

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
        additionalArguments: [
          `--id=shell`,
          `--exposed-meta=` + JSON.stringify(this.exposedMeta),
        ],
      },
    });

    this.shellView = view;

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
    const { width, height } = this.window.getContentBounds();
    const view = this.getViewById(id);
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
        additionalArguments: [
          `--id=${id}`,
          `--exposed-meta=` + JSON.stringify(this.exposedMeta),
        ],
      },
    });
    this.window.addBrowserView(view);

    this.#views$.next(this.views.set(id, view));
    this.window.setTopBrowserView(view);

    this.window.on("resize", () => {
      this.resizeView(id);
    });

    view.webContents.loadURL(pageUrl);
    logger.info("add view", id);

    this.window.showInactive();

    this.showView(id);
    this.resizeView(id);
  }

  removeView(id: string) {
    const view = this.getViewById(id);
    if (view) {
      this.window.removeBrowserView(view);
      this.#views$.next(this.views.delete(id) && this.views);
    }
  }

  toWebContentId(id: string) {
    const view = this.getViewById(id);
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
    this.#activeViewId$.next(id);
    const view = this.views.get(id);
    if (view) {
      this.window.setTopBrowserView(view);
    }
    // this.revealDevTools(id);
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
    const view = this.getViewById(id);
    if (view) {
      view.webContents.openDevTools();
    }
  }
}

let window: AppWindow;

export function getAppWindow() {
  return window;
}

export function createAppWindow(exposedMeta: any) {
  if (!window) {
    // will create a new browser window on instantiation
    window = new AppWindow(exposedMeta);
  }
  return window;
}
