// Extendemos el objeto Window global
declare global {
  interface Window {
    // Definimos las funcionalidades de IPC (Inter-Process Communication)
    ipc: {
      // Método para invocar operaciones asíncronas
      invoke(channel: string, ...args: unknown[]): Promise<any>;

      // Método para escuchar eventos con cleanup automático
      on(channel: string, callback: (...args: any[]) => void): (() => void) | undefined;

      // Métodos legacy (mantenidos por compatibilidad)
      send(channel: string, data: unknown): void;
      receive(channel: string, callback: (...args: unknown[]) => void): void;
      set(key: string, value: unknown): void;
      get(key: string): unknown;
    };
    store: {
      saveNetworkData: (data: any) => Promise<boolean>;
      loadNetworkData: () => Promise<{
        results: any[];
        config: any;
      } | null>;
    };
  }
}

// Necesario para TypeScript - indica que este archivo es un módulo
export {};
