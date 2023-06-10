import { shell } from 'electron';
import log from 'electron-log';

log.initialize();

export const logger = log.scope('main');

export function revealLogFile() {
  const filePath = log.transports.file.getFile().path;
  shell.showItemInFolder(filePath);
}
