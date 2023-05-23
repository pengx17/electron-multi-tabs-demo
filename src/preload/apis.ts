import { ipcRenderer } from "electron";
import type { handlers, events as mainEvents } from "../main/handlers";

type WithoutFirstParameter<T> = T extends (_: any, ...args: infer P) => infer R
  ? (...args: P) => R
  : T;

type HandlersMap<N extends keyof typeof handlers> = {
  [K in keyof (typeof handlers)[N]]: WithoutFirstParameter<
    (typeof handlers)[N][K]
  >;
};

type Handlers = {
  [N in keyof typeof handlers]: HandlersMap<N>;
};

type Events = {
  [N in keyof typeof mainEvents]: (typeof mainEvents)[N];
};

type HandlersMeta = {
  handlers: [string, string[]][];
  events: string[];
};

const meta: HandlersMeta = (() => {
  const val = process.argv
    .find((arg) => arg.startsWith("--exposed-meta="))
    ?.split("=")[1];

  return val ? JSON.parse(val) : null;
})();

export const apis: Handlers = (() => {
  const { handlers: handlersMeta } = meta;

  const all = handlersMeta.map(([namespace, functionNames]) => {
    const namespaceApis = functionNames.map((name) => {
      const channel = `${namespace}:${name}`;
      return [
        name,
        (...args: any[]) => {
          console.log("Invoke handler", channel, "with args:", args);
          return ipcRenderer.invoke(channel, ...args);
        },
      ];
    });
    return [namespace, Object.fromEntries(namespaceApis)];
  });

  return Object.fromEntries(all);
})();

export const events: Events = (() => {
  const { events: eventNames } = meta;
  const all = eventNames.map((name) => {
    return [
      name,
      (callback: (...args: any[]) => void) => {
        const fn = (_, ...args) => {
          callback(...args);
        };
        ipcRenderer.on(name, fn);
        return () => {
          ipcRenderer.off(name, fn);
        };
      },
    ] satisfies [string, (callback: (...args: any[]) => void) => () => void];
  });
  return Object.fromEntries(all) as Events;
})();

export const appInfo = {
  id: process.argv.find((arg) => arg.startsWith("--id="))?.split("=")[1],
};
