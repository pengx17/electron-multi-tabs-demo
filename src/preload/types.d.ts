interface Window {
  apis: typeof import('./apis').apis;
  events: typeof import('./apis').events;
  appInfo: typeof import('./apis').appInfo;
}
