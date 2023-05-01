import { contextBridge } from "electron";

import { apis, events } from "./apis";


contextBridge.exposeInMainWorld("apis", apis);
contextBridge.exposeInMainWorld("events", events);
contextBridge.exposeInMainWorld("appInfo", {
  id: process.argv.find((arg) => arg.startsWith("--id="))?.split("=")[1],
});
