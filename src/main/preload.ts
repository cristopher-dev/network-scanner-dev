import { contextBridge, ipcRenderer } from 'electron';

const validChannels = ['scan-network', 'store-save', 'store-load', 'scan-progress'] as const;
type ValidChannel = (typeof validChannels)[number];

const ipcApi = {
  invoke: (channel: ValidChannel, ...args: unknown[]) => {
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    return Promise.reject(new Error(`Canal no permitido: ${channel}`));
  },
  on: (channel: ValidChannel, callback: (...args: any[]) => void) => {
    if (validChannels.includes(channel)) {
      const subscription = (_event: any, ...args: any[]) => callback(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    }
  }
};

contextBridge.exposeInMainWorld('ipc', ipcApi);

// Tipos globales
declare global {
  interface Window {
    ipc: typeof ipcApi;
  }
}
