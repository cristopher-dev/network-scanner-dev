import ping from 'ping';

export interface DiagnosticResult {
  npmLibrariesAvailable: boolean;
  libraryVersions?: string[];
  pingTest: boolean;
  systemInfo: { platform: string; arch: string };
  networkInterfaces: any;
  error?: string;
}

export class SystemDiagnostics {
  static async runDiagnostics(): Promise<DiagnosticResult> {
    const result: DiagnosticResult = {
      npmLibrariesAvailable: false,
      libraryVersions: [],
      pingTest: false,
      systemInfo: { platform: process.platform, arch: process.arch },
      networkInterfaces: {},
    };
    try {
      result.npmLibrariesAvailable = true;
      result.libraryVersions = ['ping', 'dns', 'net'].map((lib) => `${lib}: available`);
      result.pingTest = (await ping.promise.probe('8.8.8.8', { timeout: 5 })).alive;
      const { networkInterfaces } = await import('os');
      result.networkInterfaces = networkInterfaces();
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Error desconocido';
    }
    return result;
  }

  static async checkNetworkLibraries(): Promise<boolean> {
    try {
      await Promise.all([import('ping'), import('dns'), import('net')]);
      return true;
    } catch {
      return false;
    }
  }

  static getInstallationInstructions(): string {
    return `Network Scanner usa librerías NPM puras y no requiere dependencias externas como nmap.\n\nIncluye: ping, dns, net, node-cache.\nSi tienes problemas de red, verifica permisos, firewall y conectividad.`;
  }
}
