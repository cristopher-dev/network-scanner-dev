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
        log.info('MAC info obtenida', { ip, mac: macInfo.mac, vendor: macInfo.vendor });
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
      // Método 1: Usar node-arp (más confiable)
      const mac = await this.getMacFromNodeArp(ip);
      if (mac) {
        const vendor = await this.getVendorFromMac(mac);
        return { mac, vendor: vendor || undefined };
      }

      // Método 2: Fallback al comando arp nativo
      return await this.getMacAddressFromARPFallback(ip);
    } catch (error) {
      log.warn('Error obteniendo MAC desde ARP', { ip, error });
      return null;
    }
  }

  /**
   * Obtiene MAC usando node-arp
   */
  private static async getMacFromNodeArp(ip: string): Promise<string | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const arp = require('node-arp');
      return new Promise<string | null>((resolve) => {
        arp.getMAC(ip, (err: Error | null, mac?: string) => {
          if (err || !mac) {
            resolve(null);
          } else {
            resolve(mac);
          }
        });
      });
    } catch (error) {
      log.warn('node-arp falló', { ip, error });
      return null;
    }
  }

  /**
   * Método fallback para obtener MAC usando comando nativo
   */
  private static async getMacAddressFromARPFallback(
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
      const oui = mac.substring(0, 8).replace(/:/g, '').toUpperCase().substring(0, 6);
      log.info('Buscando fabricante', { mac, oui });

      // Método 1: Usar mac-lookup (requiere conexión a internet)
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const macLookup = require('mac-lookup');
        const vendor = await macLookup.lookup(mac);
        if (vendor) {
          log.info('Vendor encontrado con mac-lookup', { mac, vendor });
          return vendor;
        }
      } catch (error) {
        log.warn('mac-lookup falló, usando base local', { error });
      }

      // Método 2: Usar oui-data (base de datos local completa)
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const ouiData = require('oui-data');
        const ouiEntry = ouiData.find(
          (entry: { oui: string; organization: string }) => entry.oui === oui,
        );
        if (ouiEntry) {
          log.info('Vendor encontrado con oui-data', { mac, vendor: ouiEntry.organization });
          return ouiEntry.organization;
        }
      } catch (error) {
        log.warn('oui-data falló', { error });
      }

      // Método 3: Si no se encuentra en las librerías, devolver null
      log.info('Vendor no encontrado en las bases de datos', { oui });
      return null;
    } catch (error) {
      log.warn('Error obteniendo fabricante', { mac, error });
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
        return this.getDeviceTypeByVendor(device.vendor);
      }

      return 'Dispositivo de Red';
    } catch {
      return 'Dispositivo Desconocido';
    }
  }

  /**
   * Determina el tipo de dispositivo basado en el fabricante
   */
  private static getDeviceTypeByVendor(vendor: string): string {
    const vendorLower = vendor.toLowerCase();

    if (vendorLower.includes('apple')) return 'Dispositivo Apple';
    if (vendorLower.includes('samsung')) return 'Dispositivo Samsung';
    if (vendorLower.includes('microsoft')) return 'Dispositivo Microsoft';
    if (vendorLower.includes('google')) return 'Dispositivo Google';
    if (vendorLower.includes('amazon')) return 'Dispositivo Amazon';
    if (vendorLower.includes('huawei') || vendorLower.includes('xiaomi'))
      return 'Dispositivo Móvil';
    if (vendorLower.includes('locally administered') || vendorLower.includes('private'))
      return 'Dispositivo Virtual';

    // Dispositivos de red
    const networkVendors = ['tp-link', 'cisco', 'realtek', 'intel', 'belkin', 'netgear'];
    if (networkVendors.some((nv) => vendorLower.includes(nv))) {
      return 'Dispositivo de Red';
    }

    return `Dispositivo ${vendor}`;
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
