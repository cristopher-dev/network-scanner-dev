import log from 'electron-log';
import systeminformation from 'systeminformation';
import * as ipaddr from 'ipaddr.js';
export interface ModernNetworkInfo {
  baseIp: string;
  interface: string;
  address: string;
  netmask: string;
  type: string;
}

export class ModernNetworkDetector {
  static async detectAllNetworkInterfaces(): Promise<ModernNetworkInfo[]> {
    try {
      const networkInterfaces = await systeminformation.networkInterfaces();
      const results: ModernNetworkInfo[] = [];
      for (const iface of networkInterfaces) {
        if (iface.internal || !iface.ip4 || !this.isPrivateIP(iface.ip4)) {
          continue;
        }
        results.push({
          baseIp: this.extractBaseIp(iface.ip4),
          interface: iface.iface,
          address: iface.ip4,
          netmask: iface.ip4subnet,
          type: iface.type || 'Unknown',
        });
      }
      log.info(`Detectadas ${results.length} interfaces de red válidas`);
      return results;
    } catch (error) {
      log.error('Error detectando interfaces de red:', error);
      return [];
    }
  }

  static async detectPrimaryNetworkInterface(): Promise<ModernNetworkInfo | null> {
    try {
      const interfaces = await this.detectAllNetworkInterfaces();
      if (interfaces.length === 0) return null;
      const priorityOrder = ['Ethernet', 'Wireless', 'WiFi'];
      for (const priority of priorityOrder) {
        const iface = interfaces.find((i) => i.type.toLowerCase().includes(priority.toLowerCase()));
        if (iface) {
          log.info(`Interfaz primaria detectada: ${iface.interface} (${iface.type})`);
          return iface;
        }
      }
      log.info(`Interfaz primaria por defecto: ${interfaces[0].interface}`);
      return interfaces[0];
    } catch (error) {
      log.error('Error detectando interfaz primaria:', error);
      return null;
    }
  }

  private static isPrivateIP(ip: string): boolean {
    try {
      const addr = ipaddr.process(ip);
      const range = addr.range();
      return range === 'private' || range === 'loopback';
    } catch {
      return false;
    }
  }

  private static extractBaseIp(ipAddress: string): string {
    const parts = ipAddress.split('.');
    return `${parts[0]}.${parts[1]}.${parts[2]}`;
  }
}

export default ModernNetworkDetector;
