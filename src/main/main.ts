import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import { isDebug, getAssetsPath, getHtmlPath, getPreloadPath, installExtensions } from './utils';
import { createMenu } from './menu';
import './updater';
import PureNpmScanner from './pureNpmScanner';
import { BasicNetworkScanner } from './basicScanner';
import { SystemDiagnostics } from './diagnostics';
import { NetworkDetector } from './networkDetector';
import Store from 'electron-store';
import log from 'electron-log';

// Detectar automáticamente la red local
const detectNetworkConfig = async () => {
  const networkInfo = await NetworkDetector.detectLocalNetworkWithGateway();
  if (networkInfo) {
    log.info(`Red detectada automáticamente: ${networkInfo.baseIp}.x en ${networkInfo.interface}`);
    if (networkInfo.gateway) {
      log.info(`Gateway detectado: ${networkInfo.gateway}`);
    }
    const scanRange = NetworkDetector.calculateScanRange(networkInfo.address, networkInfo.netmask);
    return {
      baseIp: networkInfo.baseIp,
      startRange: scanRange.start,
      endRange: scanRange.end,
      gateway: networkInfo.gateway,
    };
  } else {
    log.warn('No se pudo detectar la red automáticamente, usando configuración por defecto');
    return {
      baseIp: '192.168.1', // Valor por defecto más común
      startRange: 1,
      endRange: 254,
      gateway: undefined,
    };
  }
};

// Configuración inicial por defecto (se actualizará dinámicamente)
let defaultNetworkConfig: {
  baseIp: string;
  startRange: number;
  endRange: number;
  gateway?: string;
} = {
  baseIp: '192.168.1',
  startRange: 1,
  endRange: 254,
};

// Inicializar configuración de red de forma asíncrona
detectNetworkConfig()
  .then((config) => {
    defaultNetworkConfig = config;
    log.info('Configuración de red inicializada:', config);
  })
  .catch((error) => {
    log.error('Error inicializando configuración de red:', error);
  });

// Modificación del manejo de electron-store
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

// Configuración básica de la ventana
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
      this.setupHandlers(this.window);
      if (isDebug) await this.setupDevelopment(this.window);
    }
    return this.window;
  }

  private static setupHandlers(win: BrowserWindow): void {
    win.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    win.on('closed', () => {
      this.window = null;
    });
  }

  private static async setupDevelopment(win: BrowserWindow): Promise<void> {
    win.webContents.openDevTools();
    await installExtensions();
  }
}

// Manejadores IPC simplificados
const setupIpc = (): void => {
  if (!store) {
    console.error('Store no está inicializado - IPC no estará disponible');
    return;
  }

  // Crear instancias de los scanners
  const scanner = new PureNpmScanner();
  const basicScanner = new BasicNetworkScanner();
  ipcMain.on('message', (event) => {
    try {
      event.reply('reply', 'Ipc Example: pong 🏓');
    } catch (error) {
      console.error('Error en el manejo de IPC:', error);
    }
  });

  ipcMain.on('set', (_event, key, value) => store.set(key, value));
  ipcMain.handle('get', (_event, key) => store.get(key));
  ipcMain.handle('get-scan-config', () => store.get('scanConfig'));
  ipcMain.handle('set-scan-config', (_event, config) => store.set('scanConfig', config));

  // Manejar el escaneo de red
  ipcMain.handle('scan-network', async (event, scanConfig) => {
    try {
      console.log('Iniciando escaneo con configuración:', scanConfig);

      // Usar el scanner puro NPM (sin dependencia de nmap)
      const librariesAvailable = await SystemDiagnostics.checkNetworkLibraries();

      if (!librariesAvailable) {
        console.warn('Algunas librerías de red no están disponibles, usando scanner básico');

        // Configurar eventos de progreso para el scanner básico
        basicScanner.on('progress', (progress: any) => {
          event.sender.send('scan-progress', progress.percentage);
        });

        const results = await basicScanner.scanNetwork(
          scanConfig.baseIp,
          scanConfig.startRange,
          scanConfig.endRange,
          scanConfig.ports,
          scanConfig.timeout,
        );

        console.log(`Escaneo básico completado. ${results.length} hosts encontrados.`);
        return results;
      }
      scanner.on('progress', (progress: any) => {
        event.sender.send(
          'scan-progress',
          progress.percentage || (progress.current / progress.total) * 100,
        );
      });

      scanner.on('host-discovered', (host: any) => {
        console.log('Host descubierto:', host.ip);
      });

      const results = await scanner.scanNetwork(
        scanConfig.baseIp,
        scanConfig.startRange,
        scanConfig.endRange,
        scanConfig.ports,
      );

      console.log(`Escaneo completado. ${results.length} hosts encontrados.`);
      return results;
    } catch (error) {
      console.error('Error en el escaneo:', error);

      // En caso de error con el scanner principal, intentar con el básico
      try {
        console.log('Intentando con el scanner básico como fallback...');

        basicScanner.on('progress', (progress: any) => {
          event.sender.send('scan-progress', progress.percentage);
        });

        const results = await basicScanner.scanNetwork(
          scanConfig.baseIp,
          scanConfig.startRange,
          scanConfig.endRange,
          scanConfig.ports,
          scanConfig.timeout,
        );

        console.log(`Escaneo de fallback completado. ${results.length} hosts encontrados.`);
        return results;
      } catch (fallbackError) {
        console.error('Error en el escaneo de fallback:', fallbackError);
        throw fallbackError;
      }
    }
  });

  // Manejador para obtener redes disponibles
  ipcMain.handle('get-available-networks', async () => {
    try {
      const networks = await NetworkDetector.getAllNetworksWithGateway();
      log.info(`Redes disponibles encontradas: ${networks.length}`);
      return networks;
    } catch (error) {
      log.error('Error obteniendo redes disponibles:', error);
      return [];
    }
  });

  // Manejador para detectar la red actual automáticamente
  ipcMain.handle('detect-current-network', async () => {
    try {
      const networkInfo = await NetworkDetector.detectLocalNetworkWithGateway();
      if (networkInfo) {
        const scanRange = NetworkDetector.calculateScanRange(
          networkInfo.address,
          networkInfo.netmask,
        );
        const result = {
          ...networkInfo,
          startRange: scanRange.start,
          endRange: scanRange.end,
        };
        log.info('Red actual detectada:', result);
        return result;
      }
      return null;
    } catch (error) {
      log.error('Error detectando red actual:', error);
      return null;
    }
  });

  ipcMain.handle('store-save', async (_event, data) => {
    try {
      store.set('scanResults', data.results);
      store.set('scanConfig', data.config);
      return true;
    } catch (error) {
      console.error('Error guardando datos:', error);
      return false;
    }
  });

  // Manejar diagnósticos del sistema
  ipcMain.handle('run-diagnostics', async () => {
    try {
      return await SystemDiagnostics.runDiagnostics();
    } catch (error) {
      console.error('Error en diagnósticos:', error);
      throw error;
    }
  });

  // Obtener instrucciones de instalación
  ipcMain.handle('get-setup-instructions', () => {
    return SystemDiagnostics.getInstallationInstructions();
  });

  ipcMain.handle('store-load', async () => {
    try {
      return {
        results: store.get('scanResults'),
        config: store.get('scanConfig'),
      };
    } catch (error) {
      console.error('Error cargando datos:', error);
      return null;
    }
  });
};

interface ScanResult {
  ip: string;
  status: 'up' | 'down';
  ports?: {
    port: number;
    status: 'open' | 'closed';
  }[];
}

const startApp = async (): Promise<void> => {
  await app.whenReady();
  Menu.setApplicationMenu(createMenu());
  autoUpdater.checkForUpdatesAndNotify();
  setupIpc();
  await AppWindow.create();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await AppWindow.create();
    }
  });
};

startApp().catch(console.error);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
