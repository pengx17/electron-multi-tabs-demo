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

const mainRPC = AsyncCall(
  {},
  {
    strict: {
      unknownMessage: false,
    },
    channel: {
      on(listener) {
        const f = (e: Electron.MessageEvent) => {
          console.log(e.data);
          listener(e.data);
        };
        process.parentPort.on("message", f);
        return () => {
          process.parentPort.off("message", f);
        };
      },
      send(data) {
        process.parentPort.postMessage(data);
      },
    },
  }
);

const server = {
  add,
  sleep,
  async "foo.bar"() {
    console.log("bar!!!");
    await mainRPC["dialog.showOpenDialog"]({
      properties: ["openDirectory"],
      title: "Set Workspace Storage Location",
      buttonLabel: "Select",
      message: "Select a location to store the workspace's database file",
    });
  },
  getAppPath: mainRPC["getAppPath"],
  getPath: mainRPC["getPath"],
  onHB: (listener: () => void) => {
    setInterval(() => {
      listener();
    }, 1000);
  }
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

    // setup connection to renderer
    const rendererPort = e.ports[0];
    AsyncCall(server, {
      channel: createMessagePortMainChannel(rendererPort),
    });
  }
};

process.parentPort.on("message", messageHandler);
