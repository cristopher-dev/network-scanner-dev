import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import { isDebug, getAssetsPath, getHtmlPath, getPreloadPath, installExtensions } from './utils';
import { createMenu } from './menu';
import './updater';
import AdvancedIpScanner from './advancedIpScanner';
import Store from 'electron-store';

// Modificación del manejo de electron-store
const store = new Store({
  name: 'network-data',
  defaults: {
    scanResults: [],
    scanConfig: {
      timeout: 2000,
      batchSize: 10,
      ports: [20, 21, 22, 23, 25, 53, 80, 443, 445, 3389],
      baseIp: '192.168.10',
      startRange: 1,
      endRange: 254,
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

  // Crear instancia del scanner
  const scanner = new AdvancedIpScanner();

  ipcMain.on('message', (event) => {
    try {
      event.reply('reply', 'Ipc Example: pong 🏓');
    } catch (error) {
      console.error('Error en el manejo de IPC:', error);
    }
  });

  ipcMain.on('set', (_event, key, value) => store.set(key, value));
  ipcMain.handle('get', (_event, key) => store.get(key));

  // Manejar el escaneo de red
  ipcMain.handle('scan-network', async (_event, scanConfig) => {
    try {
      const scanner = new AdvancedIpScanner();
      const results = await scanner.scanNetwork(
        scanConfig.baseIp,
        scanConfig.startRange,
        scanConfig.endRange,
        scanConfig.ports,
      );
      return results;
    } catch (error) {
      console.error('Error en el escaneo:', error);
      throw error;
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
