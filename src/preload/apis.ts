import { ipcRenderer } from "electron";
import { handlers } from "../main/handlers";

type WithoutFirstParameter<T> = T extends (_: any, ...args: infer P) => infer R
  ? (...args: P) => R
  : T;

type HandlersMap<N extends keyof typeof handlers> = {
  [K in keyof typeof handlers[N]]: WithoutFirstParameter<(typeof handlers)[N][K]>;
}

type Handlers = {
  [N in keyof typeof handlers]: HandlersMap<N>;
}

export const apis = (() => {
  const namespaces = Object.keys(handlers) as (keyof typeof handlers)[];
  const all = namespaces.map((namespace) => {
    const namespaceHandlers = handlers[namespace];
    const namespaceApis = Object.keys(namespaceHandlers).map((name) => {
      const channel = `${namespace}:${name}`;
      return [
        name,
        (...args) => {
          console.log("Invoke handler", channel, "with args:", args);
          return ipcRenderer.invoke(channel, ...args);
        },
      ];
    });
    return [namespace, Object.fromEntries(namespaceApis)];
  });
  return Object.fromEntries(all) as Handlers;
})();

export const events = {
  onTabsUpdated: (callback: (tabs: string[]) => void) => {
    ipcRenderer.on("onTabsUpdated", (_, tabs) => {
      callback(tabs);
    });
  },
  onActiveTabChanged: (callback: (tab: string) => void) => {
    ipcRenderer.on("onActiveTabChanged", (_, tab) => {
      callback(tab);
    });
  },
};

export const appInfo = {
  id: process.argv.find((arg) => arg.startsWith("--id="))?.split("=")[1],
};
