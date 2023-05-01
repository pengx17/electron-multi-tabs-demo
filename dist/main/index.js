var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// node_modules/electron-log/src/renderer/electron-log-preload.js
var require_electron_log_preload = __commonJS({
  "node_modules/electron-log/src/renderer/electron-log-preload.js"(exports, module2) {
    "use strict";
    var electron = {};
    try {
      electron = require("electron");
    } catch (e) {
    }
    if (electron.ipcRenderer) {
      initialize(electron);
    }
    if (typeof module2 === "object") {
      module2.exports = initialize;
    }
    function initialize({ contextBridge, ipcRenderer }) {
      if (!ipcRenderer) {
        return;
      }
      ipcRenderer.on("__ELECTRON_LOG_IPC__", (_, message) => {
        window.postMessage({ cmd: "message", ...message });
      });
      ipcRenderer.invoke("__ELECTRON_LOG__", { cmd: "getOptions" }).catch((e) => console.error(new Error(
        `electron-log isn't initialized in the main process. Please call log.initialize() before. ${e.message}`
      )));
      const electronLog = {
        sendToMain(message) {
          try {
            ipcRenderer.send("__ELECTRON_LOG__", message);
          } catch (e) {
            console.error("electronLog.sendToMain ", e, "data:", message);
            ipcRenderer.send("__ELECTRON_LOG__", {
              cmd: "errorHandler",
              error: { message: e?.message, stack: e?.stack },
              errorName: "sendToMain"
            });
          }
        },
        log(...data) {
          electronLog.sendToMain({ data, level: "info" });
        }
      };
      for (const level of ["error", "warn", "info", "verbose", "debug", "silly"]) {
        electronLog[level] = (...data) => electronLog.sendToMain({
          data,
          level
        });
      }
      if (contextBridge && process.contextIsolated) {
        try {
          contextBridge.exposeInMainWorld("__electronLog", electronLog);
        } catch {
        }
      }
      if (typeof window === "object") {
        window.__electronLog = electronLog;
      } else {
        __electronLog = electronLog;
      }
    }
  }
});

// node_modules/electron-log/src/core/scope.js
var require_scope = __commonJS({
  "node_modules/electron-log/src/core/scope.js"(exports, module2) {
    "use strict";
    module2.exports = scopeFactory;
    function scopeFactory(logger2) {
      return Object.defineProperties(scope, {
        defaultLabel: { value: "", writable: true },
        labelPadding: { value: true, writable: true },
        maxLabelLength: { value: 0, writable: true },
        labelLength: {
          get() {
            switch (typeof scope.labelPadding) {
              case "boolean":
                return scope.labelPadding ? scope.maxLabelLength : 0;
              case "number":
                return scope.labelPadding;
              default:
                return 0;
            }
          }
        }
      });
      function scope(label) {
        scope.maxLabelLength = Math.max(scope.maxLabelLength, label.length);
        const newScope = {};
        for (const level of [...logger2.levels, "log"]) {
          newScope[level] = (...d) => logger2.logData(d, { level, scope: label });
        }
        return newScope;
      }
    }
  }
});

// node_modules/electron-log/src/core/Logger.js
var require_Logger = __commonJS({
  "node_modules/electron-log/src/core/Logger.js"(exports, module2) {
    "use strict";
    var scopeFactory = require_scope();
    var _Logger = class {
      functions = {};
      hooks = [];
      isDev = false;
      levels = null;
      logId = null;
      scope = null;
      transports = {};
      variables = {};
      constructor({
        allowUnknownLevel = false,
        errorHandler,
        initializeFn,
        isDev = false,
        levels = ["error", "warn", "info", "verbose", "debug", "silly"],
        logId,
        transportFactories = {},
        variables
      } = {}) {
        this.addLevel = this.addLevel.bind(this);
        this.create = this.create.bind(this);
        this.logData = this.logData.bind(this);
        this.processMessage = this.processMessage.bind(this);
        this.allowUnknownLevel = allowUnknownLevel;
        this.initializeFn = initializeFn;
        this.isDev = isDev;
        this.levels = levels;
        this.logId = logId;
        this.transportFactories = transportFactories;
        this.variables = variables || {};
        this.scope = scopeFactory(this);
        this.addLevel("log", false);
        for (const name of this.levels) {
          this.addLevel(name, false);
        }
        this.errorHandler = errorHandler;
        errorHandler?.setOptions({
          logFn: (...args) => this.error(...args)
        });
        for (const [name, factory] of Object.entries(transportFactories)) {
          this.transports[name] = factory(this);
        }
        _Logger.instances[logId] = this;
      }
      static getInstance({ logId }) {
        return this.instances[logId] || this.instances.default;
      }
      addLevel(level, index = this.levels.length) {
        if (index !== false) {
          this.levels.splice(index, 0, level);
        }
        this[level] = (...args) => this.logData(args, { level });
        this.functions[level] = this[level];
      }
      catchErrors(options) {
        this.processMessage(
          {
            data: ["log.catchErrors is deprecated. Use log.errorHandler instead"],
            level: "warn"
          },
          { transports: ["console"] }
        );
        return this.errorHandler.startCatching(options);
      }
      create(options) {
        if (typeof options === "string") {
          options = { logId: options };
        }
        return new _Logger({
          ...options,
          errorHandler: this.errorHandler,
          initializeFn: this.initializeFn,
          isDev: this.isDev,
          transportFactories: this.transportFactories,
          variables: { ...this.variables }
        });
      }
      compareLevels(passLevel, checkLevel, levels = this.levels) {
        const pass = levels.indexOf(passLevel);
        const check = levels.indexOf(checkLevel);
        if (check === -1 || pass === -1) {
          return true;
        }
        return check <= pass;
      }
      initialize({ preload = true, spyRendererConsole = false } = {}) {
        this.initializeFn({ logger: this, preload, spyRendererConsole });
      }
      logData(data, options = {}) {
        this.processMessage({ data, ...options });
      }
      processMessage(message, { transports = this.transports } = {}) {
        if (message.cmd === "errorHandler") {
          this.errorHandler.handle(message.error, {
            errorName: message.errorName,
            processType: "renderer",
            showDialog: Boolean(message.showDialog)
          });
          return;
        }
        let level = message.level;
        if (!this.allowUnknownLevel) {
          level = this.levels.includes(message.level) ? message.level : "info";
        }
        const normalizedMessage = {
          date: /* @__PURE__ */ new Date(),
          ...message,
          level,
          variables: {
            ...this.variables,
            ...message.variables
          }
        };
        for (const [transName, transFn] of this.transportEntries(transports)) {
          if (typeof transFn !== "function" || transFn.level === false) {
            continue;
          }
          if (!this.compareLevels(transFn.level, message.level)) {
            continue;
          }
          try {
            const transformedMsg = this.hooks.reduce((msg, hook) => {
              return msg ? hook(msg, transFn, transName) : msg;
            }, normalizedMessage);
            if (transformedMsg) {
              transFn({ ...transformedMsg, data: [...transformedMsg.data] });
            }
          } catch (e) {
            this.processInternalErrorFn(e);
          }
        }
      }
      processInternalErrorFn(_e) {
      }
      transportEntries(transports = this.transports) {
        const transportArray = Array.isArray(transports) ? transports : Object.entries(transports);
        return transportArray.map((item) => {
          switch (typeof item) {
            case "string":
              return this.transports[item] ? [item, this.transports[item]] : null;
            case "function":
              return [item.name, item];
            default:
              return Array.isArray(item) ? item : null;
          }
        }).filter(Boolean);
      }
    };
    var Logger = _Logger;
    __publicField(Logger, "instances", {});
    module2.exports = Logger;
  }
});

// node_modules/electron-log/src/renderer/lib/RendererErrorHandler.js
var require_RendererErrorHandler = __commonJS({
  "node_modules/electron-log/src/renderer/lib/RendererErrorHandler.js"(exports, module2) {
    "use strict";
    var consoleError = console.error;
    var RendererErrorHandler = class {
      logFn = null;
      onError = null;
      showDialog = false;
      constructor({ logFn = null } = {}) {
        this.handleError = this.handleError.bind(this);
        this.handleRejection = this.handleRejection.bind(this);
        this.startCatching = this.startCatching.bind(this);
        this.logFn = logFn;
      }
      handle(error, {
        logFn = this.logFn,
        errorName = "",
        onError = this.onError,
        showDialog = this.showDialog
      } = {}) {
        try {
          if (onError?.({ error }) !== false) {
            logFn({ error, errorName, showDialog });
          }
        } catch {
          consoleError(error);
        }
      }
      setOptions({ logFn, onError, showDialog }) {
        if (typeof logFn === "function") {
          this.logFn = logFn;
        }
        if (typeof onError === "function") {
          this.onError = onError;
        }
        if (typeof showDialog === "boolean") {
          this.showDialog = showDialog;
        }
      }
      startCatching({ onError, showDialog } = {}) {
        if (this.isActive) {
          return;
        }
        this.isActive = true;
        this.setOptions({ onError, showDialog });
        window.addEventListener("error", (event) => {
          event.preventDefault?.();
          this.handleError(event.error || event);
        });
        window.addEventListener("unhandledrejection", (event) => {
          event.preventDefault?.();
          this.handleRejection(event.reason || event);
        });
      }
      handleError(error) {
        this.handle(error, { errorName: "Unhandled" });
      }
      handleRejection(reason) {
        const error = reason instanceof Error ? reason : new Error(JSON.stringify(reason));
        this.handle(error, { errorName: "Unhandled rejection" });
      }
    };
    module2.exports = RendererErrorHandler;
  }
});

// node_modules/electron-log/src/renderer/lib/transports/console.js
var require_console = __commonJS({
  "node_modules/electron-log/src/renderer/lib/transports/console.js"(exports, module2) {
    "use strict";
    module2.exports = consoleTransportRendererFactory;
    var consoleMethods = {
      error: console.error,
      warn: console.warn,
      info: console.info,
      verbose: console.info,
      debug: console.debug,
      silly: console.debug,
      log: console.log
    };
    function consoleTransportRendererFactory(logger2) {
      return Object.assign(transport, {
        format: "{h}:{i}:{s}.{ms}{scope} \u203A {text}",
        formatDataFn({
          data = [],
          date = /* @__PURE__ */ new Date(),
          format = transport.format,
          logId = logger2.logId,
          scope = logger2.scopeName,
          ...message
        }) {
          if (typeof format === "function") {
            return format({ ...message, data, date, logId, scope });
          }
          if (typeof format !== "string") {
            return data;
          }
          data.unshift(format);
          if (typeof data[1] === "string" && data[1].match(/%[1cdfiOos]/)) {
            data = [`${data[0]} ${data[1]}`, ...data.slice(2)];
          }
          data[0] = data[0].replace(/\{(\w+)}/g, (substring, name) => {
            switch (name) {
              case "level":
                return message.level;
              case "logId":
                return logId;
              case "scope":
                return scope ? ` (${scope})` : "";
              case "text":
                return "";
              case "y":
                return date.getFullYear().toString(10);
              case "m":
                return (date.getMonth() + 1).toString(10).padStart(2, "0");
              case "d":
                return date.getDate().toString(10).padStart(2, "0");
              case "h":
                return date.getHours().toString(10).padStart(2, "0");
              case "i":
                return date.getMinutes().toString(10).padStart(2, "0");
              case "s":
                return date.getSeconds().toString(10).padStart(2, "0");
              case "ms":
                return date.getMilliseconds().toString(10).padStart(3, "0");
              case "iso":
                return date.toISOString();
              default: {
                return message.variables?.[name] || substring;
              }
            }
          }).trim();
          return data;
        },
        writeFn({ level, data }) {
          const consoleLogFn = consoleMethods[level] || consoleMethods.info;
          setTimeout(() => consoleLogFn(...data));
        }
      });
      function transport(message) {
        transport.writeFn({ ...message, data: transport.formatDataFn(message) });
      }
    }
  }
});

// node_modules/electron-log/src/renderer/lib/transports/ipc.js
var require_ipc = __commonJS({
  "node_modules/electron-log/src/renderer/lib/transports/ipc.js"(exports, module2) {
    "use strict";
    module2.exports = ipcTransportRendererFactory;
    var RESTRICTED_TYPES = /* @__PURE__ */ new Set([Promise, WeakMap, WeakSet]);
    function ipcTransportRendererFactory(logger2) {
      return Object.assign(transport, {
        depth: 5,
        serializeFn(data, { depth = 5, seen = /* @__PURE__ */ new WeakSet() } = {}) {
          if (depth < 1) {
            return `[${typeof data}]`;
          }
          if (seen.has(data)) {
            return data;
          }
          if (["function", "symbol"].includes(typeof data)) {
            return data.toString();
          }
          if (Object(data) !== data) {
            return data;
          }
          if (RESTRICTED_TYPES.has(data.constructor)) {
            return `[${data.constructor.name}]`;
          }
          if (Array.isArray(data)) {
            return data.map((item) => transport.serializeFn(
              item,
              { level: depth - 1, seen }
            ));
          }
          if (data instanceof Error) {
            return data.stack;
          }
          if (data instanceof Map) {
            return new Map(
              Array.from(data).map(([key, value]) => [
                transport.serializeFn(key, { level: depth - 1, seen }),
                transport.serializeFn(value, { level: depth - 1, seen })
              ])
            );
          }
          if (data instanceof Set) {
            return new Set(
              Array.from(data).map(
                (val) => transport.serializeFn(val, { level: depth - 1, seen })
              )
            );
          }
          seen.add(data);
          return Object.fromEntries(
            Object.entries(data).map(
              ([key, value]) => [
                key,
                transport.serializeFn(value, { level: depth - 1, seen })
              ]
            )
          );
        }
      });
      function transport(message) {
        if (!window.__electronLog) {
          logger2.processMessage(
            {
              data: ["electron-log: logger isn't initialized in the main process"],
              level: "error"
            },
            { transports: ["console"] }
          );
          return;
        }
        try {
          __electronLog.sendToMain(transport.serializeFn(message, {
            depth: transport.depth
          }));
        } catch (e) {
          logger2.transports.console({
            data: ["electronLog.transports.ipc", e, "data:", message.data],
            level: "error"
          });
        }
      }
    }
  }
});

// node_modules/electron-log/src/renderer/index.js
var require_renderer = __commonJS({
  "node_modules/electron-log/src/renderer/index.js"(exports, module2) {
    "use strict";
    var Logger = require_Logger();
    var RendererErrorHandler = require_RendererErrorHandler();
    var transportConsole = require_console();
    var transportIpc = require_ipc();
    module2.exports = createLogger();
    module2.exports.Logger = Logger;
    module2.exports.default = module2.exports;
    function createLogger() {
      const logger2 = new Logger({
        allowUnknownLevel: true,
        errorHandler: new RendererErrorHandler(),
        initializeFn: () => {
        },
        logId: "default",
        transportFactories: {
          console: transportConsole,
          ipc: transportIpc
        },
        variables: {
          processType: "renderer"
        }
      });
      logger2.errorHandler.setOptions({
        logFn({ error, errorName, showDialog }) {
          logger2.transports.console({
            data: [errorName, error].filter(Boolean),
            level: "error"
          });
          logger2.transports.ipc({
            cmd: "errorHandler",
            error: {
              cause: error?.cause,
              code: error?.code,
              name: error?.name,
              message: error?.message,
              stack: error?.stack
            },
            errorName,
            logId: logger2.logId,
            showDialog
          });
        }
      });
      if (typeof window === "object") {
        window.addEventListener("message", (event) => {
          const { cmd, logId, ...message } = event.data || {};
          const instance = Logger.getInstance({ logId });
          if (cmd === "message") {
            instance.processMessage(message, { transports: ["console"] });
          }
        });
      }
      return new Proxy(logger2, {
        get(target, prop) {
          if (typeof target[prop] !== "undefined") {
            return target[prop];
          }
          return (...data) => logger2.logData(data, { level: prop });
        }
      });
    }
  }
});

// node_modules/electron-log/src/main/electronApi.js
var require_electronApi = __commonJS({
  "node_modules/electron-log/src/main/electronApi.js"(exports, module2) {
    "use strict";
    var os = require("os");
    var path = require("path");
    var electron;
    try {
      electron = require("electron");
    } catch {
      electron = null;
    }
    module2.exports = {
      getAppUserDataPath() {
        return getPath("userData");
      },
      getName,
      getPath,
      getVersion,
      getVersions() {
        return {
          app: `${getName()} ${getVersion()}`,
          electron: `Electron ${process.versions.electron}`,
          os: getOsVersion()
        };
      },
      isDev() {
        const app2 = getApp();
        if (app2?.isPackaged !== void 0) {
          return !app2.isPackaged;
        }
        if (typeof process.execPath === "string") {
          const execFileName = path.basename(process.execPath).toLowerCase();
          return execFileName.startsWith("electron");
        }
        return true;
      },
      isElectron() {
        return Boolean(process.versions.electron);
      },
      onEveryWebContentsEvent(message, handler) {
        electron?.WebContents?.getAllWebContents().forEach((webContents) => {
          webContents.on(message, handler);
        });
        electron?.app?.on("web-contents-created", (_, webContents) => {
          webContents.on(message, handler);
        });
      },
      /**
       * Listen to async messages sent from opposite process
       * @param {string} channel
       * @param {function} listener
       */
      onIpc(channel, listener) {
        getIpc()?.on(channel, listener);
      },
      onIpcInvoke(channel, listener) {
        getIpc()?.handle?.(channel, listener);
      },
      /**
       * @param {string} url
       * @param {Function} [logFunction?]
       */
      openUrl(url, logFunction = console.error) {
        getElectronModule("shell")?.openExternal(url).catch(logFunction);
      },
      setPreloadFileForSessions({
        filePath,
        includeFutureSession = true,
        sessions = [electron?.session?.defaultSession]
      }) {
        for (const session of sessions.filter(Boolean)) {
          setPreload(session);
        }
        if (includeFutureSession) {
          electron?.app?.on("session-created", (session) => {
            setPreload(session);
          });
        }
        function setPreload(session) {
          session.setPreloads([...session.getPreloads(), filePath]);
        }
      },
      /**
       * Sent a message to opposite process
       * @param {string} channel
       * @param {any} message
       */
      sendIpc(channel, message) {
        if (process.type === "browser") {
          sendIpcToRenderer(channel, message);
        } else if (process.type === "renderer") {
          sendIpcToMain(channel, message);
        }
      },
      showErrorBox(title, message) {
        const dialog = getElectronModule("dialog");
        if (!dialog)
          return;
        dialog.showErrorBox(title, message);
      },
      whenAppReady() {
        return electron?.app?.whenReady() || Promise.resolve();
      }
    };
    function getApp() {
      return getElectronModule("app");
    }
    function getName() {
      const app2 = getApp();
      if (!app2)
        return null;
      return "name" in app2 ? app2.name : app2.getName();
    }
    function getElectronModule(name) {
      return electron?.[name] || null;
    }
    function getIpc() {
      if (process.type === "browser" && electron?.ipcMain) {
        return electron.ipcMain;
      }
      if (process.type === "renderer" && electron?.ipcRenderer) {
        return electron.ipcRenderer;
      }
      return null;
    }
    function getVersion() {
      const app2 = getApp();
      if (!app2)
        return null;
      return "version" in app2 ? app2.version : app2.getVersion();
    }
    function getOsVersion() {
      let osName = os.type().replace("_", " ");
      let osVersion = os.release();
      if (osName === "Darwin") {
        osName = "macOS";
        osVersion = getMacOsVersion();
      }
      return `${osName} ${osVersion}`;
    }
    function getMacOsVersion() {
      const release = Number(os.release().split(".")[0]);
      if (release <= 19) {
        return `10.${release - 4}`;
      }
      return release - 9;
    }
    function getPath(name) {
      const app2 = getApp();
      if (!app2)
        return null;
      try {
        return app2.getPath(name);
      } catch (e) {
        return null;
      }
    }
    function sendIpcToMain(channel, message) {
      getIpc()?.send(channel, message);
    }
    function sendIpcToRenderer(channel, message) {
      electron?.BrowserWindow?.getAllWindows().forEach((wnd) => {
        if (wnd.webContents?.isDestroyed() === false) {
          wnd.webContents.send(channel, message);
        }
      });
    }
  }
});

// node_modules/electron-log/src/main/initialize.js
var require_initialize = __commonJS({
  "node_modules/electron-log/src/main/initialize.js"(exports, module2) {
    "use strict";
    var fs = require("fs");
    var os = require("os");
    var path = require("path");
    var electronApi = require_electronApi();
    var preloadInitializeFn = require_electron_log_preload();
    module2.exports = {
      initialize({ logger: logger2, preload = true, spyRendererConsole = false }) {
        electronApi.whenAppReady().then(() => {
          if (preload) {
            initializePreload(preload);
          }
          if (spyRendererConsole) {
            initializeSpyRendererConsole(logger2);
          }
        }).catch(logger2.warn);
      }
    };
    function initializePreload(preloadOption) {
      let preloadPath = typeof preloadOption === "string" ? preloadOption : path.resolve(__dirname, "../renderer/electron-log-preload.js");
      if (!fs.existsSync(preloadPath)) {
        preloadPath = path.join(
          electronApi.getAppUserDataPath() || os.tmpdir(),
          "electron-log-preload.js"
        );
        const preloadCode = `
      try {
        (${preloadInitializeFn.toString()})(require('electron'));
      } catch(e) {
        console.error(e);
      }
    `;
        fs.writeFileSync(preloadPath, preloadCode, "utf8");
      }
      electronApi.setPreloadFileForSessions({ filePath: preloadPath });
    }
    function initializeSpyRendererConsole(logger2) {
      const levels = ["verbose", "info", "warning", "error"];
      electronApi.onEveryWebContentsEvent(
        "console-message",
        (event, level, message) => {
          logger2.processMessage({ data: [message], level: levels[level] });
        }
      );
    }
  }
});

// node_modules/electron-log/src/main/transforms/transform.js
var require_transform = __commonJS({
  "node_modules/electron-log/src/main/transforms/transform.js"(exports, module2) {
    "use strict";
    module2.exports = { transform };
    function transform({
      logger: logger2,
      message,
      transport,
      initialData = message?.data || [],
      transforms = transport?.transforms
    }) {
      return transforms.reduce((data, trans) => {
        if (typeof trans === "function") {
          return trans({ data, logger: logger2, message, transport });
        }
        return data;
      }, initialData);
    }
  }
});

// node_modules/electron-log/src/main/transforms/format.js
var require_format = __commonJS({
  "node_modules/electron-log/src/main/transforms/format.js"(exports, module2) {
    "use strict";
    var { transform } = require_transform();
    module2.exports = {
      concatFirstStringElements,
      formatScope,
      formatText,
      formatVariables,
      timeZoneFromOffset,
      format({ message, logger: logger2, transport, data = message?.data }) {
        switch (typeof transport.format) {
          case "string": {
            return transform({
              message,
              logger: logger2,
              transforms: [formatVariables, formatScope, formatText],
              transport,
              initialData: [transport.format, ...data]
            });
          }
          case "function": {
            return transport.format({
              data,
              level: message?.level || "info",
              logger: logger2,
              message,
              transport
            });
          }
          default: {
            return data;
          }
        }
      }
    };
    function concatFirstStringElements({ data }) {
      if (typeof data[0] !== "string" || typeof data[1] !== "string") {
        return data;
      }
      if (data[0].match(/%[1cdfiOos]/)) {
        return data;
      }
      return [`${data[0]} ${data[1]}`, ...data.slice(2)];
    }
    function timeZoneFromOffset(minutesOffset) {
      const minutesPositive = Math.abs(minutesOffset);
      const sign = minutesOffset >= 0 ? "-" : "+";
      const hours = Math.floor(minutesPositive / 60).toString().padStart(2, "0");
      const minutes = (minutesPositive % 60).toString().padStart(2, "0");
      return `${sign}${hours}:${minutes}`;
    }
    function formatScope({ data, logger: logger2, message }) {
      const { defaultLabel, labelLength } = logger2?.scope || {};
      const template = data[0];
      let label = message.scope;
      if (!label) {
        label = defaultLabel;
      }
      let scopeText;
      if (label === "") {
        scopeText = labelLength > 0 ? "".padEnd(labelLength + 3) : "";
      } else if (typeof label === "string") {
        scopeText = ` (${label})`.padEnd(labelLength + 3);
      } else {
        scopeText = "";
      }
      data[0] = template.replace("{scope}", scopeText);
      return data;
    }
    function formatVariables({ data, message }) {
      let template = data[0];
      if (typeof template !== "string") {
        return data;
      }
      template = template.replace("{level}]", `${message.level}]`.padEnd(6, " "));
      const date = message.date || /* @__PURE__ */ new Date();
      data[0] = template.replace(/\{(\w+)}/g, (substring, name) => {
        switch (name) {
          case "level":
            return message.level || "info";
          case "logId":
            return message.logId;
          case "y":
            return date.getFullYear().toString(10);
          case "m":
            return (date.getMonth() + 1).toString(10).padStart(2, "0");
          case "d":
            return date.getDate().toString(10).padStart(2, "0");
          case "h":
            return date.getHours().toString(10).padStart(2, "0");
          case "i":
            return date.getMinutes().toString(10).padStart(2, "0");
          case "s":
            return date.getSeconds().toString(10).padStart(2, "0");
          case "ms":
            return date.getMilliseconds().toString(10).padStart(3, "0");
          case "z":
            return timeZoneFromOffset(date.getTimezoneOffset());
          case "iso":
            return date.toISOString();
          default: {
            return message.variables?.[name] || substring;
          }
        }
      }).trim();
      return data;
    }
    function formatText({ data }) {
      const template = data[0];
      if (typeof template !== "string") {
        return data;
      }
      const textTplPosition = template.lastIndexOf("{text}");
      if (textTplPosition === template.length - 6) {
        data[0] = template.replace(/\s?{text}/, "");
        if (data[0] === "") {
          data.shift();
        }
        return data;
      }
      const templatePieces = template.split("{text}");
      let result = [];
      if (templatePieces[0] !== "") {
        result.push(templatePieces[0]);
      }
      result = result.concat(data.slice(1));
      if (templatePieces[1] !== "") {
        result.push(templatePieces[1]);
      }
      return result;
    }
  }
});

// node_modules/electron-log/src/main/transforms/object.js
var require_object = __commonJS({
  "node_modules/electron-log/src/main/transforms/object.js"(exports, module2) {
    "use strict";
    var util = require("util");
    module2.exports = {
      serialize,
      maxDepth({ data, transport, depth = transport?.depth ?? 6 }) {
        if (!data) {
          return data;
        }
        if (depth < 1) {
          if (Array.isArray(data))
            return "[array]";
          if (typeof data === "object" && data)
            return "[object]";
          return data;
        }
        if (Array.isArray(data)) {
          return data.map((child) => module2.exports.maxDepth({
            data: child,
            depth: depth - 1
          }));
        }
        if (typeof data !== "object") {
          return data;
        }
        if (data && typeof data.toISOString === "function") {
          return data;
        }
        if (data === null) {
          return null;
        }
        if (data instanceof Error) {
          return data;
        }
        const newJson = {};
        for (const i in data) {
          if (!Object.prototype.hasOwnProperty.call(data, i))
            continue;
          newJson[i] = module2.exports.maxDepth({
            data: data[i],
            depth: depth - 1
          });
        }
        return newJson;
      },
      toJSON({ data }) {
        return JSON.parse(JSON.stringify(data, createSerializer()));
      },
      toString({ data, transport }) {
        const inspectOptions = transport?.inspectOptions || {};
        const simplifiedData = data.map((item) => {
          if (item === void 0) {
            return void 0;
          }
          try {
            const str = JSON.stringify(item, createSerializer(), "  ");
            return str === void 0 ? void 0 : JSON.parse(str);
          } catch (e) {
            return item;
          }
        });
        return util.formatWithOptions(inspectOptions, ...simplifiedData);
      }
    };
    function createSerializer(options = {}) {
      const seen = /* @__PURE__ */ new WeakSet();
      return function(key, value) {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) {
            return void 0;
          }
          seen.add(value);
        }
        return serialize(key, value, options);
      };
    }
    function serialize(key, value, options = {}) {
      const serializeMapAndSet = options?.serializeMapAndSet !== false;
      if (value instanceof Error) {
        return value.stack;
      }
      if (!value) {
        return value;
      }
      if (typeof value === "function") {
        return `[function] ${value.toString()}`;
      }
      if (serializeMapAndSet && value instanceof Map && Object.fromEntries) {
        return Object.fromEntries(value);
      }
      if (serializeMapAndSet && value instanceof Set && Array.from) {
        return Array.from(value);
      }
      return value;
    }
  }
});

// node_modules/electron-log/src/main/transforms/style.js
var require_style = __commonJS({
  "node_modules/electron-log/src/main/transforms/style.js"(exports, module2) {
    "use strict";
    module2.exports = {
      transformStyles,
      applyAnsiStyles({ data }) {
        return transformStyles(data, styleToAnsi, resetAnsiStyle);
      },
      removeStyles({ data }) {
        return transformStyles(data, () => "");
      }
    };
    var ANSI_COLORS = {
      unset: "\x1B[0m",
      black: "\x1B[30m",
      red: "\x1B[31m",
      green: "\x1B[32m",
      yellow: "\x1B[33m",
      blue: "\x1B[34m",
      magenta: "\x1B[35m",
      cyan: "\x1B[36m",
      white: "\x1B[37m"
    };
    function styleToAnsi(style) {
      const color = style.replace(/color:\s*(\w+).*/, "$1").toLowerCase();
      return ANSI_COLORS[color] || "";
    }
    function resetAnsiStyle(string) {
      return string + ANSI_COLORS.unset;
    }
    function transformStyles(data, onStyleFound, onStyleApplied) {
      const foundStyles = {};
      return data.reduce((result, item, index, array) => {
        if (foundStyles[index]) {
          return result;
        }
        if (typeof item === "string") {
          let valueIndex = index;
          let styleApplied = false;
          item = item.replace(/%[1cdfiOos]/g, (match) => {
            valueIndex += 1;
            if (match !== "%c") {
              return match;
            }
            const style = array[valueIndex];
            if (typeof style === "string") {
              foundStyles[valueIndex] = true;
              styleApplied = true;
              return onStyleFound(style, item);
            }
            return match;
          });
          if (styleApplied && onStyleApplied) {
            item = onStyleApplied(item);
          }
        }
        result.push(item);
        return result;
      }, []);
    }
  }
});

// node_modules/electron-log/src/main/transports/console.js
var require_console2 = __commonJS({
  "node_modules/electron-log/src/main/transports/console.js"(exports, module2) {
    "use strict";
    var { concatFirstStringElements, format } = require_format();
    var { maxDepth, toJSON } = require_object();
    var { applyAnsiStyles, removeStyles } = require_style();
    var { transform } = require_transform();
    var consoleMethods = {
      error: console.error,
      warn: console.warn,
      info: console.info,
      verbose: console.info,
      debug: console.debug,
      silly: console.debug,
      log: console.log
    };
    module2.exports = consoleTransportFactory;
    var separator = process.platform === "win32" ? ">" : "\u203A";
    var DEFAULT_FORMAT = `%c{h}:{i}:{s}.{ms}{scope}%c ${separator} {text}`;
    Object.assign(consoleTransportFactory, {
      DEFAULT_FORMAT
    });
    function consoleTransportFactory(logger2) {
      return Object.assign(transport, {
        format: DEFAULT_FORMAT,
        level: "silly",
        transforms: [
          addTemplateColors,
          format,
          formatStyles,
          concatFirstStringElements,
          maxDepth,
          toJSON
        ],
        useStyles: process.env.FORCE_STYLES,
        writeFn({ message }) {
          const consoleLogFn = consoleMethods[message.level] || consoleMethods.info;
          consoleLogFn(...message.data);
        }
      });
      function transport(message) {
        const data = transform({ logger: logger2, message, transport });
        transport.writeFn({
          message: { ...message, data }
        });
      }
    }
    function addTemplateColors({ data, message, transport }) {
      if (transport.format !== DEFAULT_FORMAT) {
        return data;
      }
      return [`color:${levelToStyle(message.level)}`, "color:unset", ...data];
    }
    function canUseStyles(useStyleValue, level) {
      if (typeof useStyleValue === "boolean") {
        return useStyleValue;
      }
      const useStderr = level === "error" || level === "warn";
      const stream = useStderr ? process.stderr : process.stdout;
      return stream && stream.isTTY;
    }
    function formatStyles(args) {
      const { message, transport } = args;
      const useStyles = canUseStyles(transport.useStyles, message.level);
      const nextTransform = useStyles ? applyAnsiStyles : removeStyles;
      return nextTransform(args);
    }
    function levelToStyle(level) {
      const map = { error: "red", warn: "yellow", info: "cyan", default: "unset" };
      return map[level] || map.default;
    }
  }
});

// node_modules/electron-log/src/main/transports/file/File.js
var require_File = __commonJS({
  "node_modules/electron-log/src/main/transports/file/File.js"(exports, module2) {
    "use strict";
    var EventEmitter = require("events");
    var fs = require("fs");
    var os = require("os");
    var File = class extends EventEmitter {
      asyncWriteQueue = [];
      bytesWritten = 0;
      hasActiveAsyncWriting = false;
      path = null;
      initialSize = void 0;
      writeOptions = null;
      writeAsync = false;
      constructor({
        path,
        writeOptions = { encoding: "utf8", flag: "a", mode: 438 },
        writeAsync = false
      }) {
        super();
        this.path = path;
        this.writeOptions = writeOptions;
        this.writeAsync = writeAsync;
      }
      get size() {
        return this.getSize();
      }
      clear() {
        try {
          fs.writeFileSync(this.path, "", {
            mode: this.writeOptions.mode,
            flag: "w"
          });
          this.reset();
          return true;
        } catch (e) {
          if (e.code === "ENOENT") {
            return true;
          }
          this.emit("error", e, this);
          return false;
        }
      }
      crop(bytesAfter) {
        try {
          const content = readFileSyncFromEnd(this.path, bytesAfter || 4096);
          this.clear();
          this.writeLine(`[log cropped]${os.EOL}${content}`);
        } catch (e) {
          this.emit(
            "error",
            new Error(`Couldn't crop file ${this.path}. ${e.message}`),
            this
          );
        }
      }
      getSize() {
        if (this.initialSize === void 0) {
          try {
            const stats = fs.statSync(this.path);
            this.initialSize = stats.size;
          } catch (e) {
            this.initialSize = 0;
          }
        }
        return this.initialSize + this.bytesWritten;
      }
      increaseBytesWrittenCounter(text) {
        this.bytesWritten += Buffer.byteLength(text, this.writeOptions.encoding);
      }
      isNull() {
        return false;
      }
      nextAsyncWrite() {
        const file = this;
        if (this.hasActiveAsyncWriting || this.asyncWriteQueue.length === 0) {
          return;
        }
        const text = this.asyncWriteQueue.join("");
        this.asyncWriteQueue = [];
        this.hasActiveAsyncWriting = true;
        fs.writeFile(this.path, text, this.writeOptions, (e) => {
          file.hasActiveAsyncWriting = false;
          if (e) {
            file.emit(
              "error",
              new Error(`Couldn't write to ${file.path}. ${e.message}`),
              this
            );
          } else {
            file.increaseBytesWrittenCounter(text);
          }
          file.nextAsyncWrite();
        });
      }
      reset() {
        this.initialSize = void 0;
        this.bytesWritten = 0;
      }
      toString() {
        return this.path;
      }
      writeLine(text) {
        text += os.EOL;
        if (this.writeAsync) {
          this.asyncWriteQueue.push(text);
          this.nextAsyncWrite();
          return;
        }
        try {
          fs.writeFileSync(this.path, text, this.writeOptions);
          this.increaseBytesWrittenCounter(text);
        } catch (e) {
          this.emit(
            "error",
            new Error(`Couldn't write to ${this.path}. ${e.message}`),
            this
          );
        }
      }
    };
    module2.exports = File;
    function readFileSyncFromEnd(filePath, bytesCount) {
      const buffer = Buffer.alloc(bytesCount);
      const stats = fs.statSync(filePath);
      const readLength = Math.min(stats.size, bytesCount);
      const offset = Math.max(0, stats.size - bytesCount);
      const fd = fs.openSync(filePath, "r");
      const totalBytes = fs.readSync(fd, buffer, 0, readLength, offset);
      fs.closeSync(fd);
      return buffer.toString("utf8", 0, totalBytes);
    }
  }
});

// node_modules/electron-log/src/main/transports/file/NullFile.js
var require_NullFile = __commonJS({
  "node_modules/electron-log/src/main/transports/file/NullFile.js"(exports, module2) {
    "use strict";
    var File = require_File();
    var NullFile = class extends File {
      clear() {
      }
      crop() {
      }
      getSize() {
        return 0;
      }
      isNull() {
        return true;
      }
      writeLine() {
      }
    };
    module2.exports = NullFile;
  }
});

// node_modules/electron-log/src/main/transports/file/FileRegistry.js
var require_FileRegistry = __commonJS({
  "node_modules/electron-log/src/main/transports/file/FileRegistry.js"(exports, module2) {
    "use strict";
    var EventEmitter = require("events");
    var fs = require("fs");
    var path = require("path");
    var File = require_File();
    var NullFile = require_NullFile();
    var FileRegistry = class extends EventEmitter {
      store = {};
      constructor() {
        super();
        this.emitError = this.emitError.bind(this);
      }
      /**
       * Provide a File object corresponding to the filePath
       * @param {string} filePath
       * @param {WriteOptions} [writeOptions]
       * @param {boolean} [writeAsync]
       * @return {File}
       */
      provide({ filePath, writeOptions, writeAsync = false }) {
        let file;
        try {
          filePath = path.resolve(filePath);
          if (this.store[filePath]) {
            return this.store[filePath];
          }
          file = this.createFile({ filePath, writeOptions, writeAsync });
        } catch (e) {
          file = new NullFile({ path: filePath });
          this.emitError(e, file);
        }
        file.on("error", this.emitError);
        this.store[filePath] = file;
        return file;
      }
      /**
       * @param {string} filePath
       * @param {WriteOptions} writeOptions
       * @param {boolean} async
       * @return {File}
       * @private
       */
      createFile({ filePath, writeOptions, writeAsync }) {
        this.testFileWriting(filePath);
        return new File({ path: filePath, writeOptions, writeAsync });
      }
      /**
       * @param {Error} error
       * @param {File} file
       * @private
       */
      emitError(error, file) {
        this.emit("error", error, file);
      }
      /**
       * @param {string} filePath
       * @private
       */
      testFileWriting(filePath) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, "", { flag: "a" });
      }
    };
    module2.exports = FileRegistry;
  }
});

// node_modules/electron-log/src/main/transports/file/packageJson.js
var require_packageJson = __commonJS({
  "node_modules/electron-log/src/main/transports/file/packageJson.js"(exports, module2) {
    "use strict";
    var fs = require("fs");
    var path = require("path");
    module2.exports = {
      readPackageJson,
      tryReadJsonAt
    };
    function readPackageJson() {
      return tryReadJsonAt(require.main && require.main.filename) || tryReadJsonAt(extractPathFromArgs()) || tryReadJsonAt(process.resourcesPath, "app.asar") || tryReadJsonAt(process.resourcesPath, "app") || tryReadJsonAt(process.cwd()) || { name: null, version: null };
    }
    function tryReadJsonAt(...searchPaths) {
      if (!searchPaths[0]) {
        return null;
      }
      try {
        const searchPath = path.join(...searchPaths);
        const fileName = findUp("package.json", searchPath);
        if (!fileName) {
          return null;
        }
        const json = JSON.parse(fs.readFileSync(fileName, "utf8"));
        const name = json.productName || json.name;
        if (!name || name.toLowerCase() === "electron") {
          return null;
        }
        if (json.productName || json.name) {
          return {
            name,
            version: json.version
          };
        }
      } catch (e) {
        return null;
      }
    }
    function findUp(fileName, cwd) {
      let currentPath = cwd;
      while (true) {
        const parsedPath = path.parse(currentPath);
        const root = parsedPath.root;
        const dir = parsedPath.dir;
        if (fs.existsSync(path.join(currentPath, fileName))) {
          return path.resolve(path.join(currentPath, fileName));
        }
        if (currentPath === root) {
          return null;
        }
        currentPath = dir;
      }
    }
    function extractPathFromArgs() {
      const matchedArgs = process.argv.filter((arg) => {
        return arg.indexOf("--user-data-dir=") === 0;
      });
      if (matchedArgs.length === 0 || typeof matchedArgs[0] !== "string") {
        return null;
      }
      const userDataDir = matchedArgs[0];
      return userDataDir.replace("--user-data-dir=", "");
    }
  }
});

// node_modules/electron-log/src/main/transports/file/variables.js
var require_variables = __commonJS({
  "node_modules/electron-log/src/main/transports/file/variables.js"(exports, module2) {
    "use strict";
    var os = require("os");
    var path = require("path");
    var electronApi = require_electronApi();
    var packageJson = require_packageJson();
    module2.exports = {
      getAppData,
      getLibraryDefaultDir,
      getLibraryTemplate,
      getNameAndVersion,
      getPathVariables,
      getUserData
    };
    function getAppData(platform) {
      const appData = electronApi.getPath("appData");
      if (appData) {
        return appData;
      }
      const home = getHome();
      switch (platform) {
        case "darwin": {
          return path.join(home, "Library/Application Support");
        }
        case "win32": {
          return process.env.APPDATA || path.join(home, "AppData/Roaming");
        }
        default: {
          return process.env.XDG_CONFIG_HOME || path.join(home, ".config");
        }
      }
    }
    function getHome() {
      return os.homedir ? os.homedir() : process.env.HOME;
    }
    function getLibraryDefaultDir(platform, appName) {
      if (platform === "darwin") {
        return path.join(getHome(), "Library/Logs", appName);
      }
      return path.join(getUserData(platform, appName), "logs");
    }
    function getLibraryTemplate(platform) {
      if (platform === "darwin") {
        return path.join(getHome(), "Library/Logs", "{appName}");
      }
      return path.join(getAppData(platform), "{appName}", "logs");
    }
    function getNameAndVersion() {
      let name = electronApi.getName() || "";
      let version = electronApi.getVersion();
      if (name.toLowerCase() === "electron") {
        name = "";
        version = "";
      }
      if (name && version) {
        return { name, version };
      }
      const packageValues = packageJson.readPackageJson();
      if (!name) {
        name = packageValues.name;
      }
      if (!version) {
        version = packageValues.version;
      }
      if (!name) {
        name = "Electron";
      }
      return { name, version };
    }
    function getPathVariables(platform) {
      const nameAndVersion = getNameAndVersion();
      const appName = nameAndVersion.name;
      const appVersion = nameAndVersion.version;
      return {
        appData: getAppData(platform),
        appName,
        appVersion,
        electronDefaultDir: electronApi.getPath("logs"),
        home: getHome(),
        libraryDefaultDir: getLibraryDefaultDir(platform, appName),
        libraryTemplate: getLibraryTemplate(platform),
        temp: electronApi.getPath("temp") || os.tmpdir(),
        userData: getUserData(platform, appName)
      };
    }
    function getUserData(platform, appName) {
      if (electronApi.getName() !== appName) {
        return path.join(getAppData(platform), appName);
      }
      return electronApi.getPath("userData") || path.join(getAppData(platform), appName);
    }
  }
});

// node_modules/electron-log/src/main/transports/file/index.js
var require_file = __commonJS({
  "node_modules/electron-log/src/main/transports/file/index.js"(exports, module2) {
    "use strict";
    var fs = require("fs");
    var path = require("path");
    var os = require("os");
    var FileRegistry = require_FileRegistry();
    var variables = require_variables();
    var { transform } = require_transform();
    var { removeStyles } = require_style();
    var { format } = require_format();
    var { toString } = require_object();
    module2.exports = fileTransportFactory;
    var globalRegistry = new FileRegistry();
    function fileTransportFactory(logger2, registry = globalRegistry) {
      let pathVariables;
      if (registry.listenerCount("error") < 1) {
        registry.on("error", (e, file) => {
          logConsole(`Can't write to ${file}`, e);
        });
      }
      return Object.assign(transport, {
        fileName: getDefaultFileName(logger2.variables.processType),
        format: "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}]{scope} {text}",
        getFile,
        inspectOptions: { depth: 5 },
        level: "silly",
        maxSize: 1024 ** 2,
        readAllLogs,
        sync: true,
        transforms: [removeStyles, format, toString],
        writeOptions: { flag: "a", mode: 438, encoding: "utf8" },
        archiveLogFn(file) {
          const oldPath = file.toString();
          const inf = path.parse(oldPath);
          try {
            fs.renameSync(oldPath, path.join(inf.dir, `${inf.name}.old${inf.ext}`));
          } catch (e) {
            logConsole("Could not rotate log", e);
            const quarterOfMaxSize = Math.round(transport.maxSize / 4);
            file.crop(Math.min(quarterOfMaxSize, 256 * 1024));
          }
        },
        resolvePathFn(vars) {
          return path.join(vars.libraryDefaultDir, vars.fileName);
        }
      });
      function transport(message) {
        initializeOnFirstLogging();
        const file = getFile(message);
        const needLogRotation = transport.maxSize > 0 && file.size > transport.maxSize;
        if (needLogRotation) {
          transport.archiveLogFn(file);
          file.reset();
        }
        const content = transform({ logger: logger2, message, transport });
        file.writeLine(content);
      }
      function initializeOnFirstLogging() {
        if (pathVariables) {
          return;
        }
        pathVariables = variables.getPathVariables(process.platform);
        if (typeof transport.archiveLog === "function") {
          transport.archiveLogFn = transport.archiveLog;
          logConsole("archiveLog is deprecated. Use archiveLogFn instead");
        }
        if (typeof transport.resolvePath === "function") {
          transport.resolvePathFn = transport.resolvePath;
          logConsole("resolvePath is deprecated. Use resolvePathFn instead");
        }
      }
      function logConsole(message, error = null, level = "error") {
        const data = [`electron-log.transports.file: ${message}`];
        if (error) {
          data.push(error);
        }
        logger2.transports.console({ data, date: /* @__PURE__ */ new Date(), level });
      }
      function getFile(msg) {
        const vars = { ...pathVariables, fileName: transport.fileName };
        const filePath = transport.resolvePathFn(vars, msg);
        return registry.provide({
          filePath,
          writeAsync: !transport.sync,
          writeOptions: transport.writeOptions
        });
      }
      function readAllLogs({ fileFilter = (f) => f.endsWith(".log") } = {}) {
        const vars = { ...pathVariables, fileName: transport.fileName };
        const logsPath = path.dirname(transport.resolvePathFn(vars));
        return fs.readdirSync(logsPath).map((fileName) => path.join(logsPath, fileName)).filter(fileFilter).map((logPath) => {
          try {
            return {
              path: logPath,
              lines: fs.readFileSync(logPath, "utf8").split(os.EOL)
            };
          } catch {
            return null;
          }
        }).filter(Boolean);
      }
    }
    function getDefaultFileName(processType = process.type) {
      switch (processType) {
        case "renderer":
          return "renderer.log";
        case "worker":
          return "worker.log";
        default:
          return "main.log";
      }
    }
  }
});

// node_modules/electron-log/src/main/transports/remote.js
var require_remote = __commonJS({
  "node_modules/electron-log/src/main/transports/remote.js"(exports, module2) {
    "use strict";
    var http = require("http");
    var https = require("https");
    var { transform } = require_transform();
    var { removeStyles } = require_style();
    var { toJSON, maxDepth } = require_object();
    module2.exports = remoteTransportFactory;
    function remoteTransportFactory(logger2) {
      return Object.assign(transport, {
        client: { name: "electron-application" },
        depth: 6,
        level: false,
        requestOptions: {},
        transforms: [removeStyles, toJSON, maxDepth],
        makeBodyFn({ message }) {
          return JSON.stringify({
            client: transport.client,
            data: message.data,
            date: message.date.getTime(),
            level: message.level,
            scope: message.scope,
            variables: message.variables
          });
        },
        processErrorFn({ error }) {
          logger2.processMessage(
            {
              data: [`electron-log: can't POST ${transport.url}`, error],
              level: "warn"
            },
            { transports: ["console", "file"] }
          );
        },
        sendRequestFn({ serverUrl, requestOptions, body }) {
          const httpTransport = serverUrl.startsWith("https:") ? https : http;
          const request = httpTransport.request(serverUrl, {
            method: "POST",
            ...requestOptions,
            headers: {
              "Content-Type": "application/json",
              "Content-Length": body.length,
              ...requestOptions.headers
            }
          });
          request.write(body);
          request.end();
          return request;
        }
      });
      function transport(message) {
        if (!transport.url) {
          return;
        }
        const body = transport.makeBodyFn({
          logger: logger2,
          message: { ...message, data: transform({ logger: logger2, message, transport }) },
          transport
        });
        const request = transport.sendRequestFn({
          serverUrl: transport.url,
          requestOptions: transport.requestOptions,
          body: Buffer.from(body, "utf8")
        });
        request.on("error", (error) => transport.processErrorFn({
          error,
          logger: logger2,
          message,
          request,
          transport
        }));
      }
    }
  }
});

// node_modules/electron-log/src/main/ErrorHandler.js
var require_ErrorHandler = __commonJS({
  "node_modules/electron-log/src/main/ErrorHandler.js"(exports, module2) {
    "use strict";
    var electronApi = require_electronApi();
    var ErrorHandler = class {
      isActive = false;
      logFn = null;
      onError = null;
      showDialog = true;
      constructor({ logFn = null, onError = null, showDialog = true } = {}) {
        this.createIssue = this.createIssue.bind(this);
        this.handleError = this.handleError.bind(this);
        this.handleRejection = this.handleRejection.bind(this);
        this.setOptions({ logFn, onError, showDialog });
        this.startCatching = this.startCatching.bind(this);
        this.stopCatching = this.stopCatching.bind(this);
      }
      handle(error, {
        logFn = this.logFn,
        onError = this.onError,
        processType = "browser",
        showDialog = this.showDialog,
        errorName = ""
      } = {}) {
        error = normalizeError(error);
        try {
          if (typeof onError === "function") {
            const versions = electronApi.getVersions();
            const createIssue = this.createIssue;
            const result = onError({
              createIssue,
              error,
              errorName,
              processType,
              versions
            });
            if (result === false) {
              return;
            }
          }
          errorName ? logFn(errorName, error) : logFn(error);
          if (showDialog && !errorName.includes("rejection")) {
            electronApi.showErrorBox(
              `A JavaScript error occurred in the ${processType} process`,
              error.stack
            );
          }
        } catch {
          console.error(error);
        }
      }
      setOptions({ logFn, onError, showDialog }) {
        if (typeof logFn === "function") {
          this.logFn = logFn;
        }
        if (typeof onError === "function") {
          this.onError = onError;
        }
        if (typeof showDialog === "boolean") {
          this.showDialog = showDialog;
        }
      }
      startCatching({ onError, showDialog } = {}) {
        if (this.isActive) {
          return;
        }
        this.isActive = true;
        this.setOptions({ onError, showDialog });
        process.on("uncaughtException", this.handleError);
        process.on("unhandledRejection", this.handleRejection);
      }
      stopCatching() {
        this.isActive = false;
        process.removeListener("uncaughtException", this.handleError);
        process.removeListener("unhandledRejection", this.handleRejection);
      }
      createIssue(pageUrl, queryParams) {
        electronApi.openUrl(
          `${pageUrl}?${new URLSearchParams(queryParams).toString()}`
        );
      }
      handleError(error) {
        this.handle(error, { errorName: "Unhandled" });
      }
      handleRejection(reason) {
        const error = reason instanceof Error ? reason : new Error(JSON.stringify(reason));
        this.handle(error, { errorName: "Unhandled rejection" });
      }
    };
    function normalizeError(e) {
      if (e instanceof Error) {
        return e;
      }
      if (e && typeof e === "object") {
        if (e.message) {
          return Object.assign(new Error(e.message), e);
        }
        try {
          return new Error(JSON.stringify(e));
        } catch (serErr) {
          return new Error(`Couldn't normalize error ${String(e)}: ${serErr}`);
        }
      }
      return new Error(`Can't normalize error ${String(e)}`);
    }
    module2.exports = ErrorHandler;
  }
});

// node_modules/electron-log/src/main/index.js
var require_main = __commonJS({
  "node_modules/electron-log/src/main/index.js"(exports, module2) {
    "use strict";
    var electronApi = require_electronApi();
    var { initialize } = require_initialize();
    var transportConsole = require_console2();
    var transportFile = require_file();
    var transportRemote = require_remote();
    var Logger = require_Logger();
    var ErrorHandler = require_ErrorHandler();
    var defaultLogger = new Logger({
      errorHandler: new ErrorHandler(),
      initializeFn: initialize,
      isDev: electronApi.isDev(),
      logId: "default",
      transportFactories: {
        console: transportConsole,
        file: transportFile,
        remote: transportRemote
      },
      variables: {
        processType: "main"
      }
    });
    defaultLogger.processInternalErrorFn = (e) => {
      defaultLogger.transports.console.writeFn({
        data: ["Unhandled electron-log error", e],
        level: "error"
      });
    };
    module2.exports = defaultLogger;
    module2.exports.Logger = Logger;
    module2.exports.default = module2.exports;
    electronApi.onIpc("__ELECTRON_LOG__", (_, message) => {
      if (message.scope) {
        Logger.getInstance(message).scope(message.scope);
      }
      const date = new Date(message.date);
      processMessage({
        ...message,
        date: date.getTime() ? date : /* @__PURE__ */ new Date()
      });
    });
    electronApi.onIpcInvoke("__ELECTRON_LOG__", (_, { cmd = "", logId }) => {
      switch (cmd) {
        case "getOptions": {
          const logger2 = Logger.getInstance({ logId });
          return {
            levels: logger2.levels,
            logId
          };
        }
        default: {
          processMessage({ data: [`Unknown cmd '${cmd}'`], level: "error" });
          return {};
        }
      }
    });
    function processMessage(message) {
      Logger.getInstance(message)?.processMessage(message);
    }
  }
});

// node_modules/electron-log/src/index.js
var require_src = __commonJS({
  "node_modules/electron-log/src/index.js"(exports, module2) {
    "use strict";
    var isRenderer = typeof process === "undefined" || (process.type === "renderer" || process.type === "worker");
    if (isRenderer) {
      require_electron_log_preload();
      module2.exports = require_renderer();
    } else {
      module2.exports = require_main();
    }
  }
});

// node_modules/graceful-fs/polyfills.js
var require_polyfills = __commonJS({
  "node_modules/graceful-fs/polyfills.js"(exports, module2) {
    var constants = require("constants");
    var origCwd = process.cwd;
    var cwd = null;
    var platform = process.env.GRACEFUL_FS_PLATFORM || process.platform;
    process.cwd = function() {
      if (!cwd)
        cwd = origCwd.call(process);
      return cwd;
    };
    try {
      process.cwd();
    } catch (er) {
    }
    if (typeof process.chdir === "function") {
      chdir = process.chdir;
      process.chdir = function(d) {
        cwd = null;
        chdir.call(process, d);
      };
      if (Object.setPrototypeOf)
        Object.setPrototypeOf(process.chdir, chdir);
    }
    var chdir;
    module2.exports = patch;
    function patch(fs) {
      if (constants.hasOwnProperty("O_SYMLINK") && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
        patchLchmod(fs);
      }
      if (!fs.lutimes) {
        patchLutimes(fs);
      }
      fs.chown = chownFix(fs.chown);
      fs.fchown = chownFix(fs.fchown);
      fs.lchown = chownFix(fs.lchown);
      fs.chmod = chmodFix(fs.chmod);
      fs.fchmod = chmodFix(fs.fchmod);
      fs.lchmod = chmodFix(fs.lchmod);
      fs.chownSync = chownFixSync(fs.chownSync);
      fs.fchownSync = chownFixSync(fs.fchownSync);
      fs.lchownSync = chownFixSync(fs.lchownSync);
      fs.chmodSync = chmodFixSync(fs.chmodSync);
      fs.fchmodSync = chmodFixSync(fs.fchmodSync);
      fs.lchmodSync = chmodFixSync(fs.lchmodSync);
      fs.stat = statFix(fs.stat);
      fs.fstat = statFix(fs.fstat);
      fs.lstat = statFix(fs.lstat);
      fs.statSync = statFixSync(fs.statSync);
      fs.fstatSync = statFixSync(fs.fstatSync);
      fs.lstatSync = statFixSync(fs.lstatSync);
      if (fs.chmod && !fs.lchmod) {
        fs.lchmod = function(path, mode, cb) {
          if (cb)
            process.nextTick(cb);
        };
        fs.lchmodSync = function() {
        };
      }
      if (fs.chown && !fs.lchown) {
        fs.lchown = function(path, uid, gid, cb) {
          if (cb)
            process.nextTick(cb);
        };
        fs.lchownSync = function() {
        };
      }
      if (platform === "win32") {
        fs.rename = typeof fs.rename !== "function" ? fs.rename : function(fs$rename) {
          function rename(from, to, cb) {
            var start = Date.now();
            var backoff = 0;
            fs$rename(from, to, function CB(er) {
              if (er && (er.code === "EACCES" || er.code === "EPERM" || er.code === "EBUSY") && Date.now() - start < 6e4) {
                setTimeout(function() {
                  fs.stat(to, function(stater, st) {
                    if (stater && stater.code === "ENOENT")
                      fs$rename(from, to, CB);
                    else
                      cb(er);
                  });
                }, backoff);
                if (backoff < 100)
                  backoff += 10;
                return;
              }
              if (cb)
                cb(er);
            });
          }
          if (Object.setPrototypeOf)
            Object.setPrototypeOf(rename, fs$rename);
          return rename;
        }(fs.rename);
      }
      fs.read = typeof fs.read !== "function" ? fs.read : function(fs$read) {
        function read(fd, buffer, offset, length, position, callback_) {
          var callback;
          if (callback_ && typeof callback_ === "function") {
            var eagCounter = 0;
            callback = function(er, _, __) {
              if (er && er.code === "EAGAIN" && eagCounter < 10) {
                eagCounter++;
                return fs$read.call(fs, fd, buffer, offset, length, position, callback);
              }
              callback_.apply(this, arguments);
            };
          }
          return fs$read.call(fs, fd, buffer, offset, length, position, callback);
        }
        if (Object.setPrototypeOf)
          Object.setPrototypeOf(read, fs$read);
        return read;
      }(fs.read);
      fs.readSync = typeof fs.readSync !== "function" ? fs.readSync : function(fs$readSync) {
        return function(fd, buffer, offset, length, position) {
          var eagCounter = 0;
          while (true) {
            try {
              return fs$readSync.call(fs, fd, buffer, offset, length, position);
            } catch (er) {
              if (er.code === "EAGAIN" && eagCounter < 10) {
                eagCounter++;
                continue;
              }
              throw er;
            }
          }
        };
      }(fs.readSync);
      function patchLchmod(fs2) {
        fs2.lchmod = function(path, mode, callback) {
          fs2.open(
            path,
            constants.O_WRONLY | constants.O_SYMLINK,
            mode,
            function(err, fd) {
              if (err) {
                if (callback)
                  callback(err);
                return;
              }
              fs2.fchmod(fd, mode, function(err2) {
                fs2.close(fd, function(err22) {
                  if (callback)
                    callback(err2 || err22);
                });
              });
            }
          );
        };
        fs2.lchmodSync = function(path, mode) {
          var fd = fs2.openSync(path, constants.O_WRONLY | constants.O_SYMLINK, mode);
          var threw = true;
          var ret;
          try {
            ret = fs2.fchmodSync(fd, mode);
            threw = false;
          } finally {
            if (threw) {
              try {
                fs2.closeSync(fd);
              } catch (er) {
              }
            } else {
              fs2.closeSync(fd);
            }
          }
          return ret;
        };
      }
      function patchLutimes(fs2) {
        if (constants.hasOwnProperty("O_SYMLINK") && fs2.futimes) {
          fs2.lutimes = function(path, at, mt, cb) {
            fs2.open(path, constants.O_SYMLINK, function(er, fd) {
              if (er) {
                if (cb)
                  cb(er);
                return;
              }
              fs2.futimes(fd, at, mt, function(er2) {
                fs2.close(fd, function(er22) {
                  if (cb)
                    cb(er2 || er22);
                });
              });
            });
          };
          fs2.lutimesSync = function(path, at, mt) {
            var fd = fs2.openSync(path, constants.O_SYMLINK);
            var ret;
            var threw = true;
            try {
              ret = fs2.futimesSync(fd, at, mt);
              threw = false;
            } finally {
              if (threw) {
                try {
                  fs2.closeSync(fd);
                } catch (er) {
                }
              } else {
                fs2.closeSync(fd);
              }
            }
            return ret;
          };
        } else if (fs2.futimes) {
          fs2.lutimes = function(_a, _b, _c, cb) {
            if (cb)
              process.nextTick(cb);
          };
          fs2.lutimesSync = function() {
          };
        }
      }
      function chmodFix(orig) {
        if (!orig)
          return orig;
        return function(target, mode, cb) {
          return orig.call(fs, target, mode, function(er) {
            if (chownErOk(er))
              er = null;
            if (cb)
              cb.apply(this, arguments);
          });
        };
      }
      function chmodFixSync(orig) {
        if (!orig)
          return orig;
        return function(target, mode) {
          try {
            return orig.call(fs, target, mode);
          } catch (er) {
            if (!chownErOk(er))
              throw er;
          }
        };
      }
      function chownFix(orig) {
        if (!orig)
          return orig;
        return function(target, uid, gid, cb) {
          return orig.call(fs, target, uid, gid, function(er) {
            if (chownErOk(er))
              er = null;
            if (cb)
              cb.apply(this, arguments);
          });
        };
      }
      function chownFixSync(orig) {
        if (!orig)
          return orig;
        return function(target, uid, gid) {
          try {
            return orig.call(fs, target, uid, gid);
          } catch (er) {
            if (!chownErOk(er))
              throw er;
          }
        };
      }
      function statFix(orig) {
        if (!orig)
          return orig;
        return function(target, options, cb) {
          if (typeof options === "function") {
            cb = options;
            options = null;
          }
          function callback(er, stats) {
            if (stats) {
              if (stats.uid < 0)
                stats.uid += 4294967296;
              if (stats.gid < 0)
                stats.gid += 4294967296;
            }
            if (cb)
              cb.apply(this, arguments);
          }
          return options ? orig.call(fs, target, options, callback) : orig.call(fs, target, callback);
        };
      }
      function statFixSync(orig) {
        if (!orig)
          return orig;
        return function(target, options) {
          var stats = options ? orig.call(fs, target, options) : orig.call(fs, target);
          if (stats) {
            if (stats.uid < 0)
              stats.uid += 4294967296;
            if (stats.gid < 0)
              stats.gid += 4294967296;
          }
          return stats;
        };
      }
      function chownErOk(er) {
        if (!er)
          return true;
        if (er.code === "ENOSYS")
          return true;
        var nonroot = !process.getuid || process.getuid() !== 0;
        if (nonroot) {
          if (er.code === "EINVAL" || er.code === "EPERM")
            return true;
        }
        return false;
      }
    }
  }
});

// node_modules/graceful-fs/legacy-streams.js
var require_legacy_streams = __commonJS({
  "node_modules/graceful-fs/legacy-streams.js"(exports, module2) {
    var Stream = require("stream").Stream;
    module2.exports = legacy;
    function legacy(fs) {
      return {
        ReadStream,
        WriteStream
      };
      function ReadStream(path, options) {
        if (!(this instanceof ReadStream))
          return new ReadStream(path, options);
        Stream.call(this);
        var self = this;
        this.path = path;
        this.fd = null;
        this.readable = true;
        this.paused = false;
        this.flags = "r";
        this.mode = 438;
        this.bufferSize = 64 * 1024;
        options = options || {};
        var keys = Object.keys(options);
        for (var index = 0, length = keys.length; index < length; index++) {
          var key = keys[index];
          this[key] = options[key];
        }
        if (this.encoding)
          this.setEncoding(this.encoding);
        if (this.start !== void 0) {
          if ("number" !== typeof this.start) {
            throw TypeError("start must be a Number");
          }
          if (this.end === void 0) {
            this.end = Infinity;
          } else if ("number" !== typeof this.end) {
            throw TypeError("end must be a Number");
          }
          if (this.start > this.end) {
            throw new Error("start must be <= end");
          }
          this.pos = this.start;
        }
        if (this.fd !== null) {
          process.nextTick(function() {
            self._read();
          });
          return;
        }
        fs.open(this.path, this.flags, this.mode, function(err, fd) {
          if (err) {
            self.emit("error", err);
            self.readable = false;
            return;
          }
          self.fd = fd;
          self.emit("open", fd);
          self._read();
        });
      }
      function WriteStream(path, options) {
        if (!(this instanceof WriteStream))
          return new WriteStream(path, options);
        Stream.call(this);
        this.path = path;
        this.fd = null;
        this.writable = true;
        this.flags = "w";
        this.encoding = "binary";
        this.mode = 438;
        this.bytesWritten = 0;
        options = options || {};
        var keys = Object.keys(options);
        for (var index = 0, length = keys.length; index < length; index++) {
          var key = keys[index];
          this[key] = options[key];
        }
        if (this.start !== void 0) {
          if ("number" !== typeof this.start) {
            throw TypeError("start must be a Number");
          }
          if (this.start < 0) {
            throw new Error("start must be >= zero");
          }
          this.pos = this.start;
        }
        this.busy = false;
        this._queue = [];
        if (this.fd === null) {
          this._open = fs.open;
          this._queue.push([this._open, this.path, this.flags, this.mode, void 0]);
          this.flush();
        }
      }
    }
  }
});

// node_modules/graceful-fs/clone.js
var require_clone = __commonJS({
  "node_modules/graceful-fs/clone.js"(exports, module2) {
    "use strict";
    module2.exports = clone;
    var getPrototypeOf = Object.getPrototypeOf || function(obj) {
      return obj.__proto__;
    };
    function clone(obj) {
      if (obj === null || typeof obj !== "object")
        return obj;
      if (obj instanceof Object)
        var copy = { __proto__: getPrototypeOf(obj) };
      else
        var copy = /* @__PURE__ */ Object.create(null);
      Object.getOwnPropertyNames(obj).forEach(function(key) {
        Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key));
      });
      return copy;
    }
  }
});

// node_modules/graceful-fs/graceful-fs.js
var require_graceful_fs = __commonJS({
  "node_modules/graceful-fs/graceful-fs.js"(exports, module2) {
    var fs = require("fs");
    var polyfills = require_polyfills();
    var legacy = require_legacy_streams();
    var clone = require_clone();
    var util = require("util");
    var gracefulQueue;
    var previousSymbol;
    if (typeof Symbol === "function" && typeof Symbol.for === "function") {
      gracefulQueue = Symbol.for("graceful-fs.queue");
      previousSymbol = Symbol.for("graceful-fs.previous");
    } else {
      gracefulQueue = "___graceful-fs.queue";
      previousSymbol = "___graceful-fs.previous";
    }
    function noop() {
    }
    function publishQueue(context, queue2) {
      Object.defineProperty(context, gracefulQueue, {
        get: function() {
          return queue2;
        }
      });
    }
    var debug = noop;
    if (util.debuglog)
      debug = util.debuglog("gfs4");
    else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ""))
      debug = function() {
        var m = util.format.apply(util, arguments);
        m = "GFS4: " + m.split(/\n/).join("\nGFS4: ");
        console.error(m);
      };
    if (!fs[gracefulQueue]) {
      queue = global[gracefulQueue] || [];
      publishQueue(fs, queue);
      fs.close = function(fs$close) {
        function close(fd, cb) {
          return fs$close.call(fs, fd, function(err) {
            if (!err) {
              resetQueue();
            }
            if (typeof cb === "function")
              cb.apply(this, arguments);
          });
        }
        Object.defineProperty(close, previousSymbol, {
          value: fs$close
        });
        return close;
      }(fs.close);
      fs.closeSync = function(fs$closeSync) {
        function closeSync(fd) {
          fs$closeSync.apply(fs, arguments);
          resetQueue();
        }
        Object.defineProperty(closeSync, previousSymbol, {
          value: fs$closeSync
        });
        return closeSync;
      }(fs.closeSync);
      if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || "")) {
        process.on("exit", function() {
          debug(fs[gracefulQueue]);
          require("assert").equal(fs[gracefulQueue].length, 0);
        });
      }
    }
    var queue;
    if (!global[gracefulQueue]) {
      publishQueue(global, fs[gracefulQueue]);
    }
    module2.exports = patch(clone(fs));
    if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs.__patched) {
      module2.exports = patch(fs);
      fs.__patched = true;
    }
    function patch(fs2) {
      polyfills(fs2);
      fs2.gracefulify = patch;
      fs2.createReadStream = createReadStream;
      fs2.createWriteStream = createWriteStream;
      var fs$readFile = fs2.readFile;
      fs2.readFile = readFile;
      function readFile(path, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$readFile(path, options, cb);
        function go$readFile(path2, options2, cb2, startTime) {
          return fs$readFile(path2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$readFile, [path2, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$writeFile = fs2.writeFile;
      fs2.writeFile = writeFile;
      function writeFile(path, data, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$writeFile(path, data, options, cb);
        function go$writeFile(path2, data2, options2, cb2, startTime) {
          return fs$writeFile(path2, data2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$writeFile, [path2, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$appendFile = fs2.appendFile;
      if (fs$appendFile)
        fs2.appendFile = appendFile;
      function appendFile(path, data, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$appendFile(path, data, options, cb);
        function go$appendFile(path2, data2, options2, cb2, startTime) {
          return fs$appendFile(path2, data2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$appendFile, [path2, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$copyFile = fs2.copyFile;
      if (fs$copyFile)
        fs2.copyFile = copyFile;
      function copyFile(src, dest, flags, cb) {
        if (typeof flags === "function") {
          cb = flags;
          flags = 0;
        }
        return go$copyFile(src, dest, flags, cb);
        function go$copyFile(src2, dest2, flags2, cb2, startTime) {
          return fs$copyFile(src2, dest2, flags2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$copyFile, [src2, dest2, flags2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$readdir = fs2.readdir;
      fs2.readdir = readdir;
      var noReaddirOptionVersions = /^v[0-5]\./;
      function readdir(path, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        var go$readdir = noReaddirOptionVersions.test(process.version) ? function go$readdir2(path2, options2, cb2, startTime) {
          return fs$readdir(path2, fs$readdirCallback(
            path2,
            options2,
            cb2,
            startTime
          ));
        } : function go$readdir2(path2, options2, cb2, startTime) {
          return fs$readdir(path2, options2, fs$readdirCallback(
            path2,
            options2,
            cb2,
            startTime
          ));
        };
        return go$readdir(path, options, cb);
        function fs$readdirCallback(path2, options2, cb2, startTime) {
          return function(err, files) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([
                go$readdir,
                [path2, options2, cb2],
                err,
                startTime || Date.now(),
                Date.now()
              ]);
            else {
              if (files && files.sort)
                files.sort();
              if (typeof cb2 === "function")
                cb2.call(this, err, files);
            }
          };
        }
      }
      if (process.version.substr(0, 4) === "v0.8") {
        var legStreams = legacy(fs2);
        ReadStream = legStreams.ReadStream;
        WriteStream = legStreams.WriteStream;
      }
      var fs$ReadStream = fs2.ReadStream;
      if (fs$ReadStream) {
        ReadStream.prototype = Object.create(fs$ReadStream.prototype);
        ReadStream.prototype.open = ReadStream$open;
      }
      var fs$WriteStream = fs2.WriteStream;
      if (fs$WriteStream) {
        WriteStream.prototype = Object.create(fs$WriteStream.prototype);
        WriteStream.prototype.open = WriteStream$open;
      }
      Object.defineProperty(fs2, "ReadStream", {
        get: function() {
          return ReadStream;
        },
        set: function(val) {
          ReadStream = val;
        },
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(fs2, "WriteStream", {
        get: function() {
          return WriteStream;
        },
        set: function(val) {
          WriteStream = val;
        },
        enumerable: true,
        configurable: true
      });
      var FileReadStream = ReadStream;
      Object.defineProperty(fs2, "FileReadStream", {
        get: function() {
          return FileReadStream;
        },
        set: function(val) {
          FileReadStream = val;
        },
        enumerable: true,
        configurable: true
      });
      var FileWriteStream = WriteStream;
      Object.defineProperty(fs2, "FileWriteStream", {
        get: function() {
          return FileWriteStream;
        },
        set: function(val) {
          FileWriteStream = val;
        },
        enumerable: true,
        configurable: true
      });
      function ReadStream(path, options) {
        if (this instanceof ReadStream)
          return fs$ReadStream.apply(this, arguments), this;
        else
          return ReadStream.apply(Object.create(ReadStream.prototype), arguments);
      }
      function ReadStream$open() {
        var that = this;
        open(that.path, that.flags, that.mode, function(err, fd) {
          if (err) {
            if (that.autoClose)
              that.destroy();
            that.emit("error", err);
          } else {
            that.fd = fd;
            that.emit("open", fd);
            that.read();
          }
        });
      }
      function WriteStream(path, options) {
        if (this instanceof WriteStream)
          return fs$WriteStream.apply(this, arguments), this;
        else
          return WriteStream.apply(Object.create(WriteStream.prototype), arguments);
      }
      function WriteStream$open() {
        var that = this;
        open(that.path, that.flags, that.mode, function(err, fd) {
          if (err) {
            that.destroy();
            that.emit("error", err);
          } else {
            that.fd = fd;
            that.emit("open", fd);
          }
        });
      }
      function createReadStream(path, options) {
        return new fs2.ReadStream(path, options);
      }
      function createWriteStream(path, options) {
        return new fs2.WriteStream(path, options);
      }
      var fs$open = fs2.open;
      fs2.open = open;
      function open(path, flags, mode, cb) {
        if (typeof mode === "function")
          cb = mode, mode = null;
        return go$open(path, flags, mode, cb);
        function go$open(path2, flags2, mode2, cb2, startTime) {
          return fs$open(path2, flags2, mode2, function(err, fd) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$open, [path2, flags2, mode2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      return fs2;
    }
    function enqueue(elem) {
      debug("ENQUEUE", elem[0].name, elem[1]);
      fs[gracefulQueue].push(elem);
      retry();
    }
    var retryTimer;
    function resetQueue() {
      var now = Date.now();
      for (var i = 0; i < fs[gracefulQueue].length; ++i) {
        if (fs[gracefulQueue][i].length > 2) {
          fs[gracefulQueue][i][3] = now;
          fs[gracefulQueue][i][4] = now;
        }
      }
      retry();
    }
    function retry() {
      clearTimeout(retryTimer);
      retryTimer = void 0;
      if (fs[gracefulQueue].length === 0)
        return;
      var elem = fs[gracefulQueue].shift();
      var fn = elem[0];
      var args = elem[1];
      var err = elem[2];
      var startTime = elem[3];
      var lastTime = elem[4];
      if (startTime === void 0) {
        debug("RETRY", fn.name, args);
        fn.apply(null, args);
      } else if (Date.now() - startTime >= 6e4) {
        debug("TIMEOUT", fn.name, args);
        var cb = args.pop();
        if (typeof cb === "function")
          cb.call(null, err);
      } else {
        var sinceAttempt = Date.now() - lastTime;
        var sinceStart = Math.max(lastTime - startTime, 1);
        var desiredDelay = Math.min(sinceStart * 1.2, 100);
        if (sinceAttempt >= desiredDelay) {
          debug("RETRY", fn.name, args);
          fn.apply(null, args.concat([startTime]));
        } else {
          fs[gracefulQueue].push(elem);
        }
      }
      if (retryTimer === void 0) {
        retryTimer = setTimeout(retry, 0);
      }
    }
  }
});

// node_modules/jsonfile/index.js
var require_jsonfile = __commonJS({
  "node_modules/jsonfile/index.js"(exports, module2) {
    var _fs;
    try {
      _fs = require_graceful_fs();
    } catch (_) {
      _fs = require("fs");
    }
    function readFile(file, options, callback) {
      if (callback == null) {
        callback = options;
        options = {};
      }
      if (typeof options === "string") {
        options = { encoding: options };
      }
      options = options || {};
      var fs = options.fs || _fs;
      var shouldThrow = true;
      if ("throws" in options) {
        shouldThrow = options.throws;
      }
      fs.readFile(file, options, function(err, data) {
        if (err)
          return callback(err);
        data = stripBom(data);
        var obj;
        try {
          obj = JSON.parse(data, options ? options.reviver : null);
        } catch (err2) {
          if (shouldThrow) {
            err2.message = file + ": " + err2.message;
            return callback(err2);
          } else {
            return callback(null, null);
          }
        }
        callback(null, obj);
      });
    }
    function readFileSync(file, options) {
      options = options || {};
      if (typeof options === "string") {
        options = { encoding: options };
      }
      var fs = options.fs || _fs;
      var shouldThrow = true;
      if ("throws" in options) {
        shouldThrow = options.throws;
      }
      try {
        var content = fs.readFileSync(file, options);
        content = stripBom(content);
        return JSON.parse(content, options.reviver);
      } catch (err) {
        if (shouldThrow) {
          err.message = file + ": " + err.message;
          throw err;
        } else {
          return null;
        }
      }
    }
    function stringify(obj, options) {
      var spaces;
      var EOL = "\n";
      if (typeof options === "object" && options !== null) {
        if (options.spaces) {
          spaces = options.spaces;
        }
        if (options.EOL) {
          EOL = options.EOL;
        }
      }
      var str = JSON.stringify(obj, options ? options.replacer : null, spaces);
      return str.replace(/\n/g, EOL) + EOL;
    }
    function writeFile(file, obj, options, callback) {
      if (callback == null) {
        callback = options;
        options = {};
      }
      options = options || {};
      var fs = options.fs || _fs;
      var str = "";
      try {
        str = stringify(obj, options);
      } catch (err) {
        if (callback)
          callback(err, null);
        return;
      }
      fs.writeFile(file, str, options, callback);
    }
    function writeFileSync(file, obj, options) {
      options = options || {};
      var fs = options.fs || _fs;
      var str = stringify(obj, options);
      return fs.writeFileSync(file, str, options);
    }
    function stripBom(content) {
      if (Buffer.isBuffer(content))
        content = content.toString("utf8");
      content = content.replace(/^\uFEFF/, "");
      return content;
    }
    var jsonfile = {
      readFile,
      readFileSync,
      writeFile,
      writeFileSync
    };
    module2.exports = jsonfile;
  }
});

// node_modules/electron-window-state/node_modules/mkdirp/index.js
var require_mkdirp = __commonJS({
  "node_modules/electron-window-state/node_modules/mkdirp/index.js"(exports, module2) {
    var path = require("path");
    var fs = require("fs");
    var _0777 = parseInt("0777", 8);
    module2.exports = mkdirP.mkdirp = mkdirP.mkdirP = mkdirP;
    function mkdirP(p, opts, f, made) {
      if (typeof opts === "function") {
        f = opts;
        opts = {};
      } else if (!opts || typeof opts !== "object") {
        opts = { mode: opts };
      }
      var mode = opts.mode;
      var xfs = opts.fs || fs;
      if (mode === void 0) {
        mode = _0777;
      }
      if (!made)
        made = null;
      var cb = f || /* istanbul ignore next */
      function() {
      };
      p = path.resolve(p);
      xfs.mkdir(p, mode, function(er) {
        if (!er) {
          made = made || p;
          return cb(null, made);
        }
        switch (er.code) {
          case "ENOENT":
            if (path.dirname(p) === p)
              return cb(er);
            mkdirP(path.dirname(p), opts, function(er2, made2) {
              if (er2)
                cb(er2, made2);
              else
                mkdirP(p, opts, cb, made2);
            });
            break;
          default:
            xfs.stat(p, function(er2, stat) {
              if (er2 || !stat.isDirectory())
                cb(er, made);
              else
                cb(null, made);
            });
            break;
        }
      });
    }
    mkdirP.sync = function sync(p, opts, made) {
      if (!opts || typeof opts !== "object") {
        opts = { mode: opts };
      }
      var mode = opts.mode;
      var xfs = opts.fs || fs;
      if (mode === void 0) {
        mode = _0777;
      }
      if (!made)
        made = null;
      p = path.resolve(p);
      try {
        xfs.mkdirSync(p, mode);
        made = made || p;
      } catch (err0) {
        switch (err0.code) {
          case "ENOENT":
            made = sync(path.dirname(p), opts, made);
            sync(p, opts, made);
            break;
          default:
            var stat;
            try {
              stat = xfs.statSync(p);
            } catch (err1) {
              throw err0;
            }
            if (!stat.isDirectory())
              throw err0;
            break;
        }
      }
      return made;
    };
  }
});

// node_modules/electron-window-state/index.js
var require_electron_window_state = __commonJS({
  "node_modules/electron-window-state/index.js"(exports, module2) {
    "use strict";
    var path = require("path");
    var electron = require("electron");
    var jsonfile = require_jsonfile();
    var mkdirp = require_mkdirp();
    module2.exports = function(options) {
      const app2 = electron.app || electron.remote.app;
      const screen = electron.screen || electron.remote.screen;
      let state;
      let winRef;
      let stateChangeTimer;
      const eventHandlingDelay = 100;
      const config = Object.assign({
        file: "window-state.json",
        path: app2.getPath("userData"),
        maximize: true,
        fullScreen: true
      }, options);
      const fullStoreFileName = path.join(config.path, config.file);
      function isNormal(win) {
        return !win.isMaximized() && !win.isMinimized() && !win.isFullScreen();
      }
      function hasBounds() {
        return state && Number.isInteger(state.x) && Number.isInteger(state.y) && Number.isInteger(state.width) && state.width > 0 && Number.isInteger(state.height) && state.height > 0;
      }
      function resetStateToDefault() {
        const displayBounds = screen.getPrimaryDisplay().bounds;
        state = {
          width: config.defaultWidth || 800,
          height: config.defaultHeight || 600,
          x: 0,
          y: 0,
          displayBounds
        };
      }
      function windowWithinBounds(bounds) {
        return state.x >= bounds.x && state.y >= bounds.y && state.x + state.width <= bounds.x + bounds.width && state.y + state.height <= bounds.y + bounds.height;
      }
      function ensureWindowVisibleOnSomeDisplay() {
        const visible = screen.getAllDisplays().some((display) => {
          return windowWithinBounds(display.bounds);
        });
        if (!visible) {
          return resetStateToDefault();
        }
      }
      function validateState() {
        const isValid = state && (hasBounds() || state.isMaximized || state.isFullScreen);
        if (!isValid) {
          state = null;
          return;
        }
        if (hasBounds() && state.displayBounds) {
          ensureWindowVisibleOnSomeDisplay();
        }
      }
      function updateState(win) {
        win = win || winRef;
        if (!win) {
          return;
        }
        try {
          const winBounds = win.getBounds();
          if (isNormal(win)) {
            state.x = winBounds.x;
            state.y = winBounds.y;
            state.width = winBounds.width;
            state.height = winBounds.height;
          }
          state.isMaximized = win.isMaximized();
          state.isFullScreen = win.isFullScreen();
          state.displayBounds = screen.getDisplayMatching(winBounds).bounds;
        } catch (err) {
        }
      }
      function saveState(win) {
        if (win) {
          updateState(win);
        }
        try {
          mkdirp.sync(path.dirname(fullStoreFileName));
          jsonfile.writeFileSync(fullStoreFileName, state);
        } catch (err) {
        }
      }
      function stateChangeHandler() {
        clearTimeout(stateChangeTimer);
        stateChangeTimer = setTimeout(updateState, eventHandlingDelay);
      }
      function closeHandler() {
        updateState();
      }
      function closedHandler() {
        unmanage();
        saveState();
      }
      function manage(win) {
        if (config.maximize && state.isMaximized) {
          win.maximize();
        }
        if (config.fullScreen && state.isFullScreen) {
          win.setFullScreen(true);
        }
        win.on("resize", stateChangeHandler);
        win.on("move", stateChangeHandler);
        win.on("close", closeHandler);
        win.on("closed", closedHandler);
        winRef = win;
      }
      function unmanage() {
        if (winRef) {
          winRef.removeListener("resize", stateChangeHandler);
          winRef.removeListener("move", stateChangeHandler);
          clearTimeout(stateChangeTimer);
          winRef.removeListener("close", closeHandler);
          winRef.removeListener("closed", closedHandler);
          winRef = null;
        }
      }
      try {
        state = jsonfile.readFileSync(fullStoreFileName);
      } catch (err) {
      }
      validateState();
      state = Object.assign({
        width: config.defaultWidth || 800,
        height: config.defaultHeight || 600
      }, state);
      return {
        get x() {
          return state.x;
        },
        get y() {
          return state.y;
        },
        get width() {
          return state.width;
        },
        get height() {
          return state.height;
        },
        get displayBounds() {
          return state.displayBounds;
        },
        get isMaximized() {
          return state.isMaximized;
        },
        get isFullScreen() {
          return state.isFullScreen;
        },
        saveState,
        unmanage,
        manage,
        resetStateToDefault
      };
    };
  }
});

// src/main/index.ts
var import_electron3 = require("electron");

// src/main/logger.ts
var import_electron = require("electron");
var import_electron_log = __toESM(require_src());
var logger = import_electron_log.default;

// src/main/window.ts
var import_electron2 = require("electron");
var import_electron_window_state = __toESM(require_electron_window_state());
var import_path = require("path");
var IS_DEV = !process.env.CI;
var DEV_TOOL = process.env.DEV_TOOL === "true";
async function createWindow() {
  logger.info("create window");
  const mainWindowState = (0, import_electron_window_state.default)({
    defaultWidth: 1e3,
    defaultHeight: 800
  });
  const browserWindow2 = new import_electron2.BrowserWindow({
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 24, y: 18 },
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    minWidth: 640,
    transparent: true,
    visualEffectState: "active",
    vibrancy: "under-window",
    height: mainWindowState.height,
    show: false,
    // Use 'ready-to-show' event to show window
    webPreferences: {
      webgl: true,
      contextIsolation: true,
      sandbox: false,
      webviewTag: false,
      // The webview tag is not recommended. Consider alternatives like iframe or Electron's BrowserView. https://www.electronjs.org/docs/latest/api/webview-tag#warning
      spellcheck: false,
      // FIXME: enable?
      preload: (0, import_path.join)(__dirname, "../preload/index.js")
    }
  });
  mainWindowState.manage(browserWindow2);
  browserWindow2.on("ready-to-show", () => {
    if (IS_DEV) {
      browserWindow2.showInactive();
    } else {
      browserWindow2.show();
    }
    logger.info("main window is ready to show");
    if (DEV_TOOL) {
      browserWindow2.webContents.openDevTools();
    }
  });
  browserWindow2.on("close", (e) => {
    e.preventDefault();
    browserWindow2.destroy();
  });
  const pageUrl = "http://localhost:5173";
  await browserWindow2.loadURL(pageUrl);
  logger.info("main window is loaded at" + pageUrl);
  return browserWindow2;
}
var browserWindow;
async function restoreOrCreateWindow() {
  browserWindow = import_electron2.BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
  if (browserWindow === void 0) {
    browserWindow = await createWindow();
  }
  if (browserWindow.isMinimized()) {
    browserWindow.restore();
    logger.info("restore main window");
  }
  return browserWindow;
}

// src/main/index.ts
var isSingleInstance = import_electron3.app.requestSingleInstanceLock();
if (!isSingleInstance) {
  logger.info("Another instance is running, exiting...");
  import_electron3.app.quit();
  process.exit(0);
}
import_electron3.app.on("second-instance", () => {
  restoreOrCreateWindow();
});
import_electron3.app.on("open-url", async (_, _url) => {
});
import_electron3.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    import_electron3.app.quit();
  }
});
import_electron3.app.on("activate", restoreOrCreateWindow);
import_electron3.app.whenReady().then(restoreOrCreateWindow).catch((e) => console.error("Failed create window:", e));
