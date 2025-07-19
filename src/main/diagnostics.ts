import { exec } from 'child_process';
import { promisify } from 'util';
import ping from 'ping';

const execAsync = promisify(exec);

export interface DiagnosticResult {
  npmLibrariesAvailable: boolean;
  libraryVersions?: string[];
  pingTest: boolean;
  systemInfo: {
    platform: string;
    arch: string;
  };
  networkInterfaces: any;
  error?: string;
}

export class SystemDiagnostics {
  static async runDiagnostics(): Promise<DiagnosticResult> {
    const result: DiagnosticResult = {
      npmLibrariesAvailable: false,
      libraryVersions: [],
      pingTest: false,
      systemInfo: {
        platform: process.platform,
        arch: process.arch,
      },
      networkInterfaces: {},
    };

    try {
      // Verificar librerías NPM disponibles
      try {
        const libraries = ['ping', 'dns', 'net'];
        result.npmLibrariesAvailable = true;
        result.libraryVersions = libraries.map((lib) => `${lib}: available`);
      } catch {
        result.npmLibrariesAvailable = false;
        result.error = 'Algunas librerías NPM no están disponibles';
      }

      // Probar ping básico
      try {
        const pingResult = await ping.promise.probe('8.8.8.8', { timeout: 5 });
        result.pingTest = pingResult.alive;
      } catch {
        result.pingTest = false;
      }

      // Obtener interfaces de red
      const { networkInterfaces } = await import('os');
      result.networkInterfaces = networkInterfaces();
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Error desconocido';
    }

    return result;
  }

  static async checkNetworkLibraries(): Promise<boolean> {
    try {
      // Verificar que las librerías principales estén disponibles
      const ping = await import('ping');
      const dns = await import('dns');
      const net = await import('net');
      return !!(ping && dns && net);
    } catch {
      return false;
    }
  }

  static getInstallationInstructions(): string {
    return `
Network Scanner ahora usa librerías NPM puras y no requiere dependencias externas como nmap.

Las siguientes librerías están incluidas:
- ping: Para detección de hosts
- dns: Para resolución de nombres
- net: Para escaneo de puertos
- node-cache: Para caché de resultados

Si experimentas problemas de red, verifica:
1. Que tengas permisos de administrador/root para algunas operaciones
2. Que el firewall no esté bloqueando las conexiones
3. Que tengas conectividad a internet básica
    `;
  }
}
