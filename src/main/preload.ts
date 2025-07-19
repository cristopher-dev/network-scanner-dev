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
  },
  // Legacy methods for compatibility
  send: (channel: string, data: unknown) => {
    ipcRenderer.send(channel, data);
  },
  receive: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, callback);
  },
  set: (key: string, value: unknown) => {
    ipcRenderer.send('set', key, value);
  },
  get: (key: string) => {
    return ipcRenderer.invoke('get', key);
  },
};

const storeApi = {
  saveNetworkData: (data: any) => {
    return ipcRenderer.invoke('store-save', data);
  },
  loadNetworkData: () => {
    return ipcRenderer.invoke('store-load');
  },
};

contextBridge.exposeInMainWorld('ipc', ipcApi);
contextBridge.exposeInMainWorld('store', storeApi);

// Tipos globales
declare global {
  interface Window {
    ipc: typeof ipcApi;
    store: typeof storeApi;
  }
}
