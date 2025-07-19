import { autoUpdater } from 'electron-updater';
import log from 'electron-log';

autoUpdater.logger = log;
log.transports.file.level = 'info';
log.info('App is starting...');

autoUpdater.on('checking-for-update', () => log.info('Checking for update...'));
autoUpdater.on('update-available', (info) => log.info('Update available.', info));
autoUpdater.on('update-not-available', (info) => log.info('Update not available.', info));
autoUpdater.on('error', (err) => log.error(`Error in auto-updater: ${err.message}`));
autoUpdater.on('download-progress', (p) =>
  log.info(
    `Downloading speed: ${p.bytesPerSecond} - Downloaded ${p.percent}% (${p.transferred}/${p.total})`,
  ),
);
autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded', info);
  autoUpdater.quitAndInstall();
});
