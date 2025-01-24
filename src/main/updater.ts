import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';
import log from 'electron-log';

// Configuración del logger
const LOG_CONFIG = {
  fileLevel: 'info' as const,
  startMessage: 'App is starting...',
};

class UpdaterManager {
  constructor() {
    this.initLogger();
    this.setupEventListeners();
  }

  private initLogger(): void {
    autoUpdater.logger = log;
    log.transports.file.level = LOG_CONFIG.fileLevel;
    log.info(LOG_CONFIG.startMessage);
  }

  private setupEventListeners(): void {
    autoUpdater.on('checking-for-update', () => {
      log.info('Checking for update...');
    });

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      log.info('Update available.', info);
    });

    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      log.info('Update not available.', info);
    });

    autoUpdater.on('error', (err: Error) => {
      log.error(`Error in auto-updater: ${err.message}`);
    });

    autoUpdater.on('download-progress', (progressInfo: ProgressInfo) => {
      const { bytesPerSecond, percent, transferred, total } = progressInfo;
      log.info(
        `Downloading speed: ${bytesPerSecond} - Downloaded ${percent}% (${transferred}/${total})`,
      );
    });

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      log.info('Update downloaded', info);
      autoUpdater.quitAndInstall();
    });
  }
}

export default new UpdaterManager();
