declare module "process" {
  global {
    namespace NodeJS {
      interface Process {
        parentPort: Electron.ParentPort;
      }
    }
  }
}
