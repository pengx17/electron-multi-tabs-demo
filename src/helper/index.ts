import { EventBasedChannel, AsyncCall } from "async-call-rpc";
import { logger } from "./logger";

type MessageHandler = (e: {
  ports: Electron.MessagePortMain[];
  data: any;
}) => void;

export function add(x: number, y: number) {
  return x + y;
}

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const server = {
  add,
  sleep,
};

const createMessagePortMainChannel = (
  connection: Electron.MessagePortMain
): EventBasedChannel => {
  return {
    on(listener) {
      const f = (e: Electron.MessageEvent) => {
        listener(e.data);
      };
      connection.on("message", f);
      connection.start();
      return () => {
        connection.off("message", f);
        connection.close();
      };
    },
    send(data) {
      connection.postMessage(data);
    },
  };
};

const messageHandler: MessageHandler = (e) => {
  if (e.data.type === "add-view" && e.ports.length === 1) {
    logger.info("Received init-port message");
    const port = e.ports[0];
    AsyncCall(server, {
      channel: createMessagePortMainChannel(port),
    });
  }
};

process.parentPort.on("message", messageHandler);
