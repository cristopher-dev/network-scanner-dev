import { contextBridge, ipcRenderer } from 'electron';

const channels = [
  'scan-network',
  'store-save',
  'store-load',
  'scan-progress',
  'get-available-networks',
  'detect-current-network',
  'get',
  'set',
  'get-scan-config',
  'set-scan-config',
  'run-diagnostics',
  'get-setup-instructions',
] as const;
type Channel = (typeof channels)[number];

const ipc = {
  invoke: (channel: Channel, ...args: unknown[]) =>
    channels.includes(channel)
      ? ipcRenderer.invoke(channel, ...args)
      : Promise.reject(new Error(`Canal no permitido: ${channel}`)),
  on: (channel: Channel, cb: (...args: any[]) => void) =>
    channels.includes(channel)
      ? (ipcRenderer.on(channel, (_e, ...a) => cb(...a)),
        () => ipcRenderer.removeAllListeners(channel))
      : undefined,
  get: (key: string) => ipcRenderer.invoke('get', key),
  set: (key: string, value: unknown) => ipcRenderer.send('set', key, value),
};

const store = {
  saveNetworkData: (data: any) => ipcRenderer.invoke('store-save', data),
  loadNetworkData: () => ipcRenderer.invoke('store-load'),
};

contextBridge.exposeInMainWorld('ipc', ipc);
contextBridge.exposeInMainWorld('store', store);

declare global {
  interface Window {
    ipc: typeof ipc;
    store: typeof store;
  }
}
