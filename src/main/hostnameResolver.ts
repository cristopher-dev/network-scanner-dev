import dns from 'dns';
import { exec } from 'child_process';
import { promisify } from 'util';
import log from 'electron-log';

const execAsync = promisify(exec);
const reverseLookup = promisify(dns.reverse);

export interface DeviceInfo {
  ip: string;
  hostname?: string;
  macAddress?: string;
  vendor?: string;
  netbiosName?: string;
  description?: string;
}

export class HostnameResolver {
  /**
   * Resuelve el hostname de una IP usando múltiples métodos
   */
  static async resolveHostname(ip: string): Promise<DeviceInfo> {
    const device: DeviceInfo = { ip };

    try {
      // Método 1: DNS Reverse Lookup
      const hostname = await this.dnsReverseLookup(ip);
      if (hostname) {
        device.hostname = hostname;
      }

      // Método 2: NetBIOS (solo Windows)
      if (process.platform === 'win32') {
        const netbiosName = await this.getNetBIOSName(ip);
        if (netbiosName) {
          device.netbiosName = netbiosName;
          if (!device.hostname) {
            device.hostname = netbiosName;
          }
        }
      }

      // Método 3: ARP Table (para obtener MAC)
      const macInfo = await this.getMacAddressFromARP(ip);
      if (macInfo) {
        device.macAddress = macInfo.mac;
        device.vendor = macInfo.vendor;
      }

      // Método 4: mDNS/Bonjour (para dispositivos Apple y otros)
      const mdnsName = await this.getMDNSName(ip);
      if (mdnsName) {
        device.description = mdnsName;
        if (!device.hostname) {
          device.hostname = mdnsName;
        }
      }

      // Si no se encontró nombre, intentar generar descripción
      if (!device.hostname && !device.netbiosName) {
        device.description = await this.generateDeviceDescription(ip, device);
      }

      log.info(`Hostname resuelto para ${ip}:`, device);
      return device;
    } catch (error) {
      log.error(`Error resolviendo hostname para ${ip}:`, error);
      return device;
    }
  }

  /**
   * DNS Reverse Lookup
   */
  private static async dnsReverseLookup(ip: string): Promise<string | null> {
    try {
      const hostnames = await reverseLookup(ip);
      return hostnames && hostnames.length > 0 ? hostnames[0] : null;
    } catch {
      return null;
    }
  }

  /**
   * Obtiene el nombre NetBIOS (Windows)
   */
  private static async getNetBIOSName(ip: string): Promise<string | null> {
    try {
      const { stdout } = await execAsync(`nbtstat -A ${ip}`, { timeout: 5000 });
      const lines = stdout.split('\n');

      for (const line of lines) {
        if (line.includes('<00>') && line.includes('UNIQUE')) {
          const name = line.trim().split(/\s+/)[0];
          if (name && name !== ip && !name.includes('.')) {
            return name;
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Obtiene información de la tabla ARP
   */
  private static async getMacAddressFromARP(
    ip: string,
  ): Promise<{ mac: string; vendor?: string } | null> {
    try {
      let command: string;
      if (process.platform === 'win32') {
        command = `arp -a ${ip}`;
      } else if (process.platform === 'darwin') {
        command = `arp -n ${ip}`;
      } else {
        command = `arp -n ${ip}`;
      }

      const { stdout } = await execAsync(command, { timeout: 3000 });

      if (process.platform === 'win32') {
        // Windows: "192.168.1.1      aa-bb-cc-dd-ee-ff     dynamic"
        const match =
          /([a-fA-F0-9]{2}-[a-fA-F0-9]{2}-[a-fA-F0-9]{2}-[a-fA-F0-9]{2}-[a-fA-F0-9]{2}-[a-fA-F0-9]{2})/.exec(
            stdout,
          );
        if (match) {
          const mac = match[1].replace(/-/g, ':');
          const vendor = await this.getVendorFromMac(mac);
          return { mac, vendor: vendor || undefined };
        }
      } else {
        // Unix/Mac: "192.168.1.1 (192.168.1.1) at aa:bb:cc:dd:ee:ff [ether] on eth0"
        const match =
          /([a-fA-F0-9]{2}:[a-fA-F0-9]{2}:[a-fA-F0-9]{2}:[a-fA-F0-9]{2}:[a-fA-F0-9]{2}:[a-fA-F0-9]{2})/.exec(
            stdout,
          );
        if (match) {
          const mac = match[1];
          const vendor = await this.getVendorFromMac(mac);
          return { mac, vendor: vendor || undefined };
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Obtiene el nombre mDNS/Bonjour
   */
  private static async getMDNSName(ip: string): Promise<string | null> {
    try {
      // Intentar ping con resolución de nombre
      const { stdout } = await execAsync(`ping -c 1 -W 1000 ${ip}`, { timeout: 3000 });
      const match = /PING ([^\s]+)/.exec(stdout);
      if (match && match[1] !== ip) {
        return match[1];
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Obtiene el fabricante basado en la MAC address
   */
  private static async getVendorFromMac(mac: string): Promise<string | null> {
    try {
      // Obtener los primeros 3 octetos (OUI)
      const oui = mac.substring(0, 8).replace(/:/g, '').toUpperCase();

      // Base de datos simple de algunos fabricantes comunes
      const vendors: Record<string, string> = {
        '00E04C': 'Realtek',
        '8C8590': 'Apple',
        AC87A3: 'Apple',
        F0766F: 'Apple',
        '20C9D0': 'Apple',
        E8E0B7: 'Apple',
        E4B318: 'Apple',
        '3035AD': 'Apple',
        '002655': 'Apple',
        '001F5B': 'Apple',
        '001EC2': 'Apple',
        '001451': 'Apple',
        '000D93': 'Apple',
        '001124': 'Apple',
        '0017F2': 'Apple',
        '001B63': 'Apple',
        '002436': 'Apple',
        '002332': 'Apple',
        '00254B': 'Apple',
        '7CD1C3': 'Apple',
        A4B197: 'Apple',
        B8E856: 'Apple',
        C82A14: 'Apple',
        DC2B61: 'Apple',
        E0F847: 'Apple',
        F0DBE2: 'Apple',
        F8D027: 'Apple',
        '5CF5DA': 'Apple',
        '84F3EB': 'Apple',
        F81EDF: 'Apple',
        '7831C1': 'Apple',
        '3C2EFF': 'Apple',
        '2CF0EE': 'Apple',
        A4C361: 'Apple',
        B065BD: 'Apple',
        D03311: 'Apple',
        '44D884': 'Apple',
        '68A86D': 'Apple',
        '70CD60': 'Apple',
        '28CFE9': 'Apple',
        '40CBC0': 'Apple',
        '64B0A6': 'Apple',
        '6C96CF': 'Apple',
        '787B8A': 'Apple',
        '9027E4': 'Apple',
        A88808: 'Apple',
        BC9FEF: 'Apple',
        E42B34: 'Apple',
        F099BF: 'Apple',
        '38892C': 'Apple',
        '40B395': 'Apple',
        '18E7F4': 'TP-Link',
        '1C61B4': 'TP-Link',
        '509A4C': 'TP-Link',
        '6C5AB0': 'TP-Link',
        AC84C6: 'TP-Link',
        E8DE27: 'TP-Link',
        F4F26D: 'TP-Link',
        '18E829': 'Samsung',
        '002454': 'Samsung',
        E8E8B7: 'Samsung',
        '5C0A5B': 'Samsung',
        '2C44FD': 'Samsung',
        '40B0FA': 'Samsung',
        '88329B': 'Samsung',
        C85195: 'Samsung',
        DCF7C4: 'Samsung',
        E8039A: 'Samsung',
        F0257D: 'Samsung',
        '001D25': 'Cisco',
        '0050E4': 'Cisco',
        '0018BA': 'Cisco',
        '001E4A': 'Cisco',
        '002155': 'Microsoft',
        '7CFD9B': 'Microsoft',
      };

      return vendors[oui] || null;
    } catch {
      return null;
    }
  }

  /**
   * Genera una descripción del dispositivo basada en puertos abiertos y características
   */
  private static async generateDeviceDescription(ip: string, device: DeviceInfo): Promise<string> {
    try {
      // Si es el gateway
      if (ip.endsWith('.1') || ip.endsWith('.254')) {
        return 'Router/Gateway';
      }

      // Basado en el fabricante
      if (device.vendor) {
        switch (device.vendor.toLowerCase()) {
          case 'apple':
            return 'Dispositivo Apple';
          case 'samsung':
            return 'Dispositivo Samsung';
          case 'tp-link':
          case 'cisco':
            return 'Dispositivo de Red';
          case 'microsoft':
            return 'Dispositivo Microsoft';
        }
      }

      return 'Dispositivo de Red';
    } catch {
      return 'Dispositivo Desconocido';
    }
  }

  /**
   * Resuelve múltiples hostnames en paralelo
   */
  static async resolveMultipleHostnames(ips: string[]): Promise<DeviceInfo[]> {
    try {
      const promises = ips.map((ip) => this.resolveHostname(ip));
      const results = await Promise.allSettled(promises);

      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          log.error(`Error resolviendo ${ips[index]}:`, result.reason);
          return { ip: ips[index] };
        }
      });
    } catch (error) {
      log.error('Error en resolución múltiple:', error);
      return ips.map((ip) => ({ ip }));
    }
  }
}
