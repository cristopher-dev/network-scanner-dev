import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import { isDebug, getAssetsPath, getHtmlPath, getPreloadPath, installExtensions } from './utils';
import { createMenu } from './menu';
import './updater';
import AdvancedIpScanner from './advancedIpScanner';

// Modificación del manejo de electron-store
let store: any;

const initStore = async () => {
  try {
    const Store = await import('electron-store');
    store = new Store.default();
  } catch (error) {
    console.error('Error al inicializar electron-store:', error);
  }
};

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
  ipcMain.handle(
    'scan-network',
    async (_event, baseIp: string, start: number, end: number, ports?: number[]) => {
      try {
        return await scanner.scanNetwork(baseIp, start, end, ports);
      } catch (error) {
        console.error('Error durante el escaneo:', error);
        throw error;
      }
    },
  );
};

const startApp = async (): Promise<void> => {
  await app.whenReady();
  await initStore(); // Inicializar store
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
