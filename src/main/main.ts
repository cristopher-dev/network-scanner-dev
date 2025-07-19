import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import { isDebug, getAssetsPath, getHtmlPath, getPreloadPath, installExtensions } from './utils';
import { createMenu } from './menu';
import './updater';
import PureNpmScanner from './pureNpmScanner';
import { BasicNetworkScanner } from './basicScanner';
import { SystemDiagnostics } from './diagnostics';
import { NetworkDetector } from './networkDetector';
import { ModernNetworkScanner } from './modernNetworkScanner';
import { ModernNetworkDetector } from './modernNetworkDetector';
import { ModernHostnameResolver } from './modernHostnameResolver';
import Store from 'electron-store';

const defaultNetworkConfig = { baseIp: '192.168.1', startRange: 1, endRange: 254 };
const store = new Store({
  name: 'network-data',
  defaults: {
    scanResults: [],
    scanConfig: {
      timeout: 2000,
      batchSize: 10,
      ports: [20, 21, 22, 23, 25, 53, 80, 443, 445, 3389],
      ...defaultNetworkConfig,
    },
  },
});

const windowConfig = {
  icon: getAssetsPath('icon.ico'),
  width: 1100,
  height: 750,
  webPreferences: {
    devTools: isDebug,
    preload: getPreloadPath('preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
  },
};

class AppWindow {
  private static window: BrowserWindow | null = null;
  static async create(): Promise<BrowserWindow> {
    if (!this.window) {
      this.window = new BrowserWindow(windowConfig);
      await this.window.loadURL(getHtmlPath('index.html'));
      this.window.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
      });
      this.window.on('closed', () => {
        this.window = null;
      });
      if (isDebug) {
        this.window.webContents.openDevTools();
        installExtensions();
      }
    }
    return this.window;
  }
}

const setupIpc = (): void => {
  const scanner = new PureNpmScanner();
  const basicScanner = new BasicNetworkScanner();
  const modernScanner = new ModernNetworkScanner();

  ipcMain.on('message', (event) => {
    try {
      event.reply('reply', 'Ipc Example: pong 🏓');
    } catch {}
  });
  ipcMain.on('set', (_e, k, v) => store.set(k, v));
  ipcMain.handle('get', (_e, k) => store.get(k));
  ipcMain.handle('get-scan-config', () => store.get('scanConfig'));
  ipcMain.handle('set-scan-config', (_e, c) => store.set('scanConfig', c));

  ipcMain.handle('scan-network', async (event, scanConfig) => {
    try {
      const librariesAvailable = await SystemDiagnostics.checkNetworkLibraries();
      if (!librariesAvailable) {
        basicScanner.on('progress', (p: any) => event.sender.send('scan-progress', p.percentage));
        return await basicScanner.scanNetwork(
          scanConfig.baseIp,
          scanConfig.startRange,
          scanConfig.endRange,
          scanConfig.ports,
          scanConfig.timeout,
        );
      }
      scanner.on('progress', (p: any) =>
        event.sender.send('scan-progress', p.percentage || (p.current / p.total) * 100),
      );
      scanner.on('host-discovered', (h: any) => {});
      return await scanner.scanNetwork(
        scanConfig.baseIp,
        scanConfig.startRange,
        scanConfig.endRange,
        scanConfig.ports,
      );
    } catch {
      basicScanner.on('progress', (p: any) => event.sender.send('scan-progress', p.percentage));
      return await basicScanner.scanNetwork(
        scanConfig.baseIp,
        scanConfig.startRange,
        scanConfig.endRange,
        scanConfig.ports,
        scanConfig.timeout,
      );
    }
  });

  ipcMain.handle('get-available-networks', async () => {
    try {
      const modernNetworks = await ModernNetworkDetector.detectAllNetworkInterfaces();
      if (modernNetworks.length > 0)
        return modernNetworks.map((net) => ({
          name: net.interface,
          type: net.type,
          baseIp: net.baseIp,
          gateway: net.gateway,
          isActive: true,
          address: net.address,
          netmask: net.netmask,
          speed: net.speed,
        }));
      return await NetworkDetector.getAllNetworksWithGateway();
    } catch {
      return [];
    }
  });

  ipcMain.handle('detect-current-network', async () => {
    try {
      const modernNetwork = await ModernNetworkDetector.detectPrimaryNetworkInterface();
      if (modernNetwork) {
        const scanRange = ModernNetworkDetector.calculateOptimalScanRange(
          modernNetwork.address,
          modernNetwork.netmask,
        );
        return {
          ...modernNetwork,
          startRange: scanRange.start,
          endRange: scanRange.end,
          totalHosts: scanRange.totalHosts,
          recommendation: scanRange.recommendation,
        };
      }
      const networkInfo = await NetworkDetector.detectLocalNetworkWithGateway();
      if (networkInfo) {
        const scanRange = NetworkDetector.calculateScanRange(
          networkInfo.address,
          networkInfo.netmask,
        );
        return { ...networkInfo, startRange: scanRange.start, endRange: scanRange.end };
      }
      return null;
    } catch {
      return null;
    }
  });

  ipcMain.handle('store-save', async (_e, data) => {
    try {
      store.set('scanResults', data.results);
      store.set('scanConfig', data.config);
      return true;
    } catch {
      return false;
    }
  });
  ipcMain.handle('run-diagnostics', async () => {
    try {
      return await SystemDiagnostics.runDiagnostics();
    } catch {
      throw new Error('Error en diagnósticos');
    }
  });
  ipcMain.handle('get-setup-instructions', () => SystemDiagnostics.getInstallationInstructions());

  ipcMain.handle('modern-scan-network', async (event, scanConfig) => {
    try {
      modernScanner.on('progress', (p: any) => event.sender.send('scan-progress', p.percentage));
      modernScanner.on('host-discovered', (host: any) =>
        event.sender.send('host-discovered', host),
      );
      const modernConfig = {
        baseIp: scanConfig.baseIp,
        startRange: scanConfig.startRange,
        endRange: scanConfig.endRange,
        ports: scanConfig.ports || [22, 80, 443],
        timeout: scanConfig.timeout || 2000,
        maxConcurrency: scanConfig.maxConcurrency || 15,
        enableOsDetection: scanConfig.enableOsDetection || false,
        enableServiceDetection: scanConfig.enableServiceDetection || true,
      };
      return await modernScanner.scanNetwork(modernConfig);
    } catch {
      throw new Error('Error en el escaneo moderno');
    }
  });

  ipcMain.handle('resolve-device-info', async (_e, ip: string) => {
    try {
      return await ModernHostnameResolver.resolveDeviceInfo(ip);
    } catch {
      return { ip, confidence: 0, sources: [] };
    }
  });

  ipcMain.handle('get-network-statistics', async () => {
    try {
      return await ModernNetworkDetector.getNetworkStatistics();
    } catch {
      return { interfaces: [] };
    }
  });

  ipcMain.handle('validate-network-config', async (_e, config) => {
    try {
      return await ModernNetworkDetector.validateNetworkConfig(config);
    } catch {
      return { isValid: false, warnings: ['Error validando configuración'], suggestions: [] };
    }
  });

  ipcMain.handle('clear-caches', async () => {
    try {
      ModernHostnameResolver.clearCache();
      modernScanner.clearCache();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  });

  ipcMain.handle('store-load', async () => {
    try {
      return { results: store.get('scanResults'), config: store.get('scanConfig') };
    } catch {
      return null;
    }
  });
};

const startApp = async (): Promise<void> => {
  await app.whenReady();
  Menu.setApplicationMenu(createMenu());
  autoUpdater.checkForUpdatesAndNotify();
  setupIpc();
  await AppWindow.create();
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) await AppWindow.create();
  });
};

startApp().catch(console.error);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
