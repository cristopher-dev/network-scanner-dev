import { contextBridge, ipcRenderer } from 'electron';

const validChannels = ['scan-network', 'store-save', 'store-load'] as const;
type ValidChannel = (typeof validChannels)[number];

const ipcApi = {
  invoke: (channel: ValidChannel, ...args: unknown[]) => {
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    return Promise.reject(new Error(`Canal no permitido: ${channel}`));
  },
};

contextBridge.exposeInMainWorld('ipc', ipcApi);

// Tipos globales
declare global {
  interface Window {
    ipc: typeof ipcApi;
  }
}
