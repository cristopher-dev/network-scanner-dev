// Extendemos el objeto Window global
declare global {
  interface Window {
    // Definimos las funcionalidades de IPC (Inter-Process Communication)
    ipc: {
      // Método para enviar mensajes
      send(channel: string, data: unknown): void;

      // Método para recibir mensajes
      receive(channel: string, callback: (...args: unknown[]) => void): void;

      // Métodos para almacenamiento local
      set(key: string, value: unknown): void;
      get(key: string): unknown;
    };
  }
}

// Necesario para TypeScript - indica que este archivo es un módulo
export {};
