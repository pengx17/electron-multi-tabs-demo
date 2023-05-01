import { ipcRenderer } from "electron";
import { handlers } from "../main/handlers";

type WithoutFirstParameter<T> = T extends (_: any, ...args: infer P) => infer R
  ? (...args: P) => R
  : T;

type HandlerMapWithoutEvent = {
  [K in keyof typeof handlers]: WithoutFirstParameter<(typeof handlers)[K]>;
};

export const apis = (() => {
  const all = Object.keys(handlers).map((name) => {
    return [
      name,
      (...args) => {
        console.log("Invoke handler", name, "with args:", args);
        return ipcRenderer.invoke(name, ...args);
      },
    ];
  });
  return Object.fromEntries(all) as HandlerMapWithoutEvent;
})();

export const events = {
  onTabsUpdated: (callback: (tabs: string[]) => void) => {
    ipcRenderer.on("onTabsUpdated", (_, tabs) => {
      console.log("onTabsUpdated", tabs);
      callback(tabs);
    });
  },
  onActiveTabChanged: (callback: (tab: string) => void) => {
    ipcRenderer.on("onActiveTabChanged", (_, tab) => {
      callback(tab);
    });
  }
};

export const appInfo = {
  id: process.argv.find((arg) => arg.startsWith("--id="))?.split("=")[1],
};
