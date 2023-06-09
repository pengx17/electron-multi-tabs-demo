type MessageHandler = (e: {
  ports: Electron.MessagePortMain[];
  data: any;
}) => void;

let rendererConnection: Electron.MessagePortMain | null = null;

const messageHandler: MessageHandler = (e) => {
  console.log(e);
  rendererConnection = e.ports[0];
  beginWork(e.data);
};

process.parentPort.on("message", messageHandler);

function beginWork(data: any) {
  // After work
  rendererConnection?.postMessage({ result: data });
}
