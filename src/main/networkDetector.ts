import { networkInterfaces } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import log from 'electron-log';

const execAsync = promisify(exec);

export interface NetworkInfo {
  baseIp: string;
  interface: string;
  address: string;
  netmask: string;
  cidr?: string;
  gateway?: string;
}

export class NetworkDetector {
  /**
   * Detecta automáticamente la interfaz de red activa y la configuración de IP
   */
  static detectLocalNetwork(): NetworkInfo | null {
    try {
      const interfaces = networkInterfaces();

      // Priorizar interfaces comunes
      const priorityOrder = ['Wi-Fi', 'Ethernet', 'en0', 'eth0', 'wlan0'];

      for (const interfaceName of priorityOrder) {
        const networkInterface = interfaces[interfaceName];
        if (networkInterface) {
          const ipv4 = this.getIPv4Address(networkInterface);
          if (ipv4) {
            const baseIp = this.extractBaseIp(ipv4.address);
            log.info(`Red detectada en ${interfaceName}: ${ipv4.address}/${ipv4.netmask}`);

            return {
              baseIp,
              interface: interfaceName,
              address: ipv4.address,
              netmask: ipv4.netmask,
              cidr: this.calculateCIDR(ipv4.netmask),
            };
          }
        }
      }

      // Si no se encuentra una interfaz prioritaria, buscar cualquier interfaz IPv4 válida
      for (const [interfaceName, networkInterface] of Object.entries(interfaces)) {
        if (networkInterface) {
          const ipv4 = this.getIPv4Address(networkInterface);
          if (ipv4 && this.isPrivateIP(ipv4.address)) {
            const baseIp = this.extractBaseIp(ipv4.address);
            log.info(`Red detectada en ${interfaceName}: ${ipv4.address}/${ipv4.netmask}`);

            return {
              baseIp,
              interface: interfaceName,
              address: ipv4.address,
              netmask: ipv4.netmask,
              cidr: this.calculateCIDR(ipv4.netmask),
            };
          }
        }
      }

      log.warn('No se pudo detectar una red local válida');
      return null;
    } catch (error) {
      log.error('Error detectando la red local:', error);
      return null;
    }
  }

  /**
   * Obtiene todas las redes disponibles
   */
  static getAllNetworks(): NetworkInfo[] {
    const networks: NetworkInfo[] = [];

    try {
      const interfaces = networkInterfaces();

      for (const [interfaceName, networkInterface] of Object.entries(interfaces)) {
        if (networkInterface) {
          const ipv4 = this.getIPv4Address(networkInterface);
          if (ipv4 && this.isPrivateIP(ipv4.address)) {
            const baseIp = this.extractBaseIp(ipv4.address);
            networks.push({
              baseIp,
              interface: interfaceName,
              address: ipv4.address,
              netmask: ipv4.netmask,
              cidr: this.calculateCIDR(ipv4.netmask),
            });
          }
        }
      }
    } catch (error) {
      log.error('Error obteniendo todas las redes:', error);
    }

    return networks;
  }

  /**
   * Detecta el gateway predeterminado del sistema
   */
  static async detectDefaultGateway(): Promise<string | null> {
    try {
      const platform = process.platform;
      let command: string;

      if (platform === 'win32') {
        command = 'route print 0.0.0.0';
      } else if (platform === 'darwin') {
        command = 'route -n get default';
      } else {
        command = 'ip route show default';
      }

      const { stdout } = await execAsync(command);

      if (platform === 'win32') {
        // En Windows, buscar la línea que contiene 0.0.0.0
        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.includes('0.0.0.0') && line.includes('0.0.0.0')) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3) {
              const gateway = parts[2];
              if (this.isValidIP(gateway)) {
                log.info(`Gateway detectado: ${gateway}`);
                return gateway;
              }
            }
          }
        }
      } else if (platform === 'darwin') {
        // En macOS, buscar la línea "gateway:"
        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.includes('gateway:')) {
            const gateway = line.split(':')[1]?.trim();
            if (gateway && this.isValidIP(gateway)) {
              log.info(`Gateway detectado: ${gateway}`);
              return gateway;
            }
          }
        }
      } else {
        // En Linux, buscar "default via"
        const match = stdout.match(/default via (\d+\.\d+\.\d+\.\d+)/);
        if (match && match[1]) {
          const gateway = match[1];
          log.info(`Gateway detectado: ${gateway}`);
          return gateway;
        }
      }

      log.warn('No se pudo detectar el gateway predeterminado');
      return null;
    } catch (error) {
      log.error('Error detectando gateway:', error);
      return null;
    }
  }

  /**
   * Detecta la red local con información del gateway
   */
  static async detectLocalNetworkWithGateway(): Promise<NetworkInfo | null> {
    try {
      const networkInfo = this.detectLocalNetwork();
      if (!networkInfo) return null;

      const gateway = await this.detectDefaultGateway();

      return {
        ...networkInfo,
        gateway: gateway || undefined,
      };
    } catch (error) {
      log.error('Error detectando red con gateway:', error);
      return null;
    }
  }

  /**
   * Obtiene todas las redes con información de gateway
   */
  static async getAllNetworksWithGateway(): Promise<NetworkInfo[]> {
    try {
      const networks = this.getAllNetworks();
      const gateway = await this.detectDefaultGateway();

      return networks.map((network) => ({
        ...network,
        gateway: gateway || undefined,
      }));
    } catch (error) {
      log.error('Error obteniendo redes con gateway:', error);
      return this.getAllNetworks();
    }
  }

  private static getIPv4Address(
    networkInterface: any[],
  ): { address: string; netmask: string } | null {
    for (const addr of networkInterface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return {
          address: addr.address,
          netmask: addr.netmask,
        };
      }
    }
    return null;
  }

  private static extractBaseIp(ipAddress: string): string {
    const parts = ipAddress.split('.');
    return `${parts[0]}.${parts[1]}.${parts[2]}`;
  }

  private static isPrivateIP(ip: string): boolean {
    const parts = ip.split('.').map(Number);

    // Verificar rangos de IP privadas
    return (
      // 10.0.0.0/8
      parts[0] === 10 ||
      // 172.16.0.0/12
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      // 192.168.0.0/16
      (parts[0] === 192 && parts[1] === 168)
    );
  }

  private static calculateCIDR(netmask: string): string {
    const parts = netmask.split('.').map(Number);
    let cidr = 0;

    for (const part of parts) {
      cidr += this.countBits(part);
    }

    return `/${cidr}`;
  }

  private static countBits(num: number): number {
    let count = 0;
    while (num) {
      count += num & 1;
      num >>= 1;
    }
    return count;
  }

  /**
   * Valida si una cadena es una dirección IP válida
   */
  private static isValidIP(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;

    return parts.every((part) => {
      const num = parseInt(part, 10);
      return !isNaN(num) && num >= 0 && num <= 255;
    });
  }

  /**
   * Calcula el rango de IPs para escanear basado en la máscara de red
   */
  static calculateScanRange(address: string, netmask: string): { start: number; end: number } {
    const addressParts = address.split('.').map(Number);
    const netmaskParts = netmask.split('.').map(Number);

    // Para la mayoría de redes domésticas (255.255.255.0), escanear de 1 a 254
    if (netmask === '255.255.255.0') {
      return { start: 1, end: 254 };
    }

    // Para otras máscaras, calcular el rango basado en la máscara
    const cidrBits = parseInt(this.calculateCIDR(netmask).slice(1), 10);
    const hostBits = 32 - cidrBits;
    const maxHosts = Math.pow(2, hostBits) - 2; // -2 para network y broadcast

    return { start: 1, end: Math.min(maxHosts, 254) };
  }
}
