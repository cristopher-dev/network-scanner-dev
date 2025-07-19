import { exec } from 'child_process';
import { promisify } from 'util';
import ping from 'ping';

const execAsync = promisify(exec);

export interface DiagnosticResult {
  nmapInstalled: boolean;
  nmapVersion?: string;
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
      nmapInstalled: false,
      pingTest: false,
      systemInfo: {
        platform: process.platform,
        arch: process.arch,
      },
      networkInterfaces: {},
    };

    try {
      // Verificar si nmap está instalado
      try {
        const { stdout } = await execAsync('nmap --version');
        result.nmapInstalled = true;
        result.nmapVersion = stdout.split('\n')[0];
      } catch {
        result.nmapInstalled = false;
        result.error = 'nmap no está instalado en el sistema';
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

  static async checkNmapInstallation(): Promise<boolean> {
    try {
      await execAsync('nmap --version');
      return true;
    } catch {
      return false;
    }
  }

  static getInstallationInstructions(): string {
    const platform = process.platform;

    switch (platform) {
      case 'win32':
        return `
Para instalar nmap en Windows:
1. Descarga nmap desde: https://nmap.org/download.html
2. Ejecuta el instalador como administrador
3. Asegúrate de agregar nmap al PATH del sistema
4. Reinicia la aplicación después de la instalación

Alternativamente, usa Chocolatey:
choco install nmap

O usa Winget:
winget install Insecure.Nmap
        `;
      case 'darwin':
        return `
Para instalar nmap en macOS:
1. Usa Homebrew: brew install nmap
2. O descarga desde: https://nmap.org/download.html
        `;
      case 'linux':
        return `
Para instalar nmap en Linux:
Ubuntu/Debian: sudo apt-get install nmap
CentOS/RHEL: sudo yum install nmap
Fedora: sudo dnf install nmap
        `;
      default:
        return 'Sistema operativo no soportado para las instrucciones automáticas.';
    }
  }
}
