import { contextBridge, ipcRenderer } from 'electron';

// Canales IPC permitidos
const validChannels = ['message', 'reply', 'set', 'get', 'scan-network'] as const;
type ValidChannel = (typeof validChannels)[number];

// API segura para IPC
interface IpcApi {
  send: (channel: ValidChannel, args: unknown) => void;
  receive: (channel: ValidChannel, callback: (...args: unknown[]) => void) => void;
  set: (key: string, value: unknown) => void;
  get: (key: string) => Promise<unknown>;
  invoke: (channel: ValidChannel, ...args: unknown[]) => Promise<unknown>;
  on: (channel: string, callback: (...args: any[]) => void) => () => void;
}

// API de comunicación con el proceso principal
const ipcApi: IpcApi = {
  send: (channel, args) => {
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, args);
    }
  },

  receive: (channel, callback) => {
    if (validChannels.includes(channel)) {
      ipcRenderer.once(channel, (_event, ...args) => callback(...args));
    }
  },

  set: (key, value) => ipcRenderer.send('set', key, value),

  get: (key) => ipcRenderer.invoke('get', key),

  invoke: (channel, ...args) => {
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    return Promise.reject(new Error(`Canal no permitido: ${channel}`));
  },

  on: (channel, callback) => {
    ipcRenderer.on(channel, (_, ...args) => callback(...args));
    return () => ipcRenderer.removeListener(channel, callback);
  },
};

// Exposición del API al proceso de renderizado
contextBridge.exposeInMainWorld('ipc', ipcApi);

const allowedChannels = ['toMain'];

contextBridge.exposeInMainWorld('api', {
  send: (channel: string, data: any) => {
    // whitelist channels
    if (allowedChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel: string, func: (...args: any[]) => void) => {
    const responseChannels = ['fromMain'];
    if (responseChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
});

// Tipos globales
declare global {
  interface Window {
    ipc: IpcApi;
  }
}
