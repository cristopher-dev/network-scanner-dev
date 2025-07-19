import dns from 'dns';
import { exec } from 'child_process';
import { promisify } from 'util';
import log from 'electron-log';
import NodeCache from 'node-cache';
import { NETWORK_CONSTANTS } from '../shared/constants';

const execAsync = promisify(exec);

// Funciones auxiliares para detectar tipos de dispositivos
function getDeviceTypeFromHostname(hostname?: string): string | null {
  if (!hostname) return null;
  const h = hostname.toLowerCase();
  if (h.includes('router') || h.includes('gateway')) return 'Router';
  if (h.includes('printer') || h.includes('print')) return 'Impresora';
  if (h.includes('camera') || h.includes('cam')) return 'Cámara';
  if (h.includes('phone') || h.includes('iphone') || h.includes('android')) return 'Teléfono';
  return null;
}

function getDeviceTypeFromVendor(vendor?: string): string | null {
  if (!vendor) return null;
  const v = vendor.toLowerCase();
  if (v.includes('apple')) return 'Dispositivo Apple';
  if (v.includes('samsung')) return 'Dispositivo Samsung';
  if (v.includes('cisco') || v.includes('tp-link')) return 'Dispositivo de Red';
  return null;
}

function getDeviceTypeFromIP(ip: string): string | null {
  if (ip.endsWith('.1') || ip.endsWith('.254')) return 'Router/Gateway';
  return null;
}

export interface ModernDeviceInfo {
  ip: string;
  hostname?: string;
  macAddress?: string;
  vendor?: string;
  description?: string;
  deviceType?: string;
  confidence: number; // 0-100
  sources: string[]; // Lista de métodos que proporcionaron información
}

export class ModernHostnameResolver {
  private static readonly cache: NodeCache = new NodeCache({
    stdTTL: NETWORK_CONSTANTS.CACHE_TTL,
    checkperiod: NETWORK_CONSTANTS.CACHE_CHECK_PERIOD,
    useClones: false,
  });

  static async resolveDeviceInfo(ip: string): Promise<ModernDeviceInfo> {
    const cacheKey = `device_${ip}`;
    const cached = this.cache.get<ModernDeviceInfo>(cacheKey);
    if (cached) return cached;
    const device: ModernDeviceInfo = { ip, confidence: 0, sources: [] };
    const [dnsInfo, mdnsInfo, manufacturaInfo] = await Promise.allSettled([
      this.resolveDNS(ip),
      this.resolveMDNS(ip),
      this.resolveManufacturer(ip),
    ]);

    this.applyDNSInfo(device, dnsInfo);
    this.applyMDNSInfo(device, mdnsInfo);
    this.applyManufacturerInfo(device, manufacturaInfo);
    this.assignDeviceType(device);

    this.cache.set(cacheKey, device);
    log.debug(`Dispositivo resuelto ${ip}:`, {
      hostname: device.hostname,
      confidence: device.confidence,
      sources: device.sources.join(', '),
    });
    return device;
  }

  private static applyDNSInfo(device: ModernDeviceInfo, dnsInfo: PromiseSettledResult<any>): void {
    if (dnsInfo.status === 'fulfilled' && dnsInfo.value?.hostname) {
      device.hostname = dnsInfo.value.hostname;
      device.confidence += 30;
      device.sources.push('DNS');
    }
  }

  private static applyMDNSInfo(
    device: ModernDeviceInfo,
    mdnsInfo: PromiseSettledResult<any>,
  ): void {
    if (mdnsInfo.status === 'fulfilled' && mdnsInfo.value) {
      if (mdnsInfo.value.deviceName && !device.hostname) {
        device.hostname = mdnsInfo.value.deviceName;
        device.confidence += 25;
        device.sources.push('mDNS');
      }
      if (mdnsInfo.value.description) {
        device.description = mdnsInfo.value.description;
        device.confidence += 15;
      }
    }
  }

  private static applyManufacturerInfo(
    device: ModernDeviceInfo,
    manufacturaInfo: PromiseSettledResult<any>,
  ): void {
    if (manufacturaInfo.status === 'fulfilled' && manufacturaInfo.value) {
      if (manufacturaInfo.value.macAddress) {
        device.macAddress = manufacturaInfo.value.macAddress;
        device.confidence += 20;
        device.sources.push('ARP');
      }
      if (manufacturaInfo.value.vendor) {
        device.vendor = manufacturaInfo.value.vendor;
        device.confidence += 10;
        device.sources.push('OUI');
      }
    }
  }

  private static assignDeviceType(device: ModernDeviceInfo): void {
    device.deviceType =
      getDeviceTypeFromHostname(device.hostname) ||
      getDeviceTypeFromVendor(device.vendor) ||
      getDeviceTypeFromIP(device.ip) ||
      'Unknown';
    if (device.deviceType !== 'Unknown') device.confidence += 5;
  }

  /**
   * Resolución DNS tradicional
   */
  private static async resolveDNS(ip: string): Promise<{ hostname?: string }> {
    try {
      const hostnames = await promisify(dns.reverse)(ip);
      const primaryHostname = hostnames?.[0];
      if (!primaryHostname) return {};
      return { hostname: primaryHostname };
    } catch {
      return {};
    }
  }

  /**
   * Resolución mDNS/Bonjour - implementación mejorada
   */
  private static async resolveMDNS(
    ip: string,
  ): Promise<{ deviceName?: string; description?: string }> {
    const methods = [
      () => this.tryPingResolution(ip),
      () => this.tryNslookupResolution(ip),
      () => this.tryNetBiosResolution(ip),
    ];

    for (const method of methods) {
      try {
        const result = await method();
        if (result.deviceName) {
          return result;
        }
      } catch (error) {
        log.debug(`Método de resolución falló para ${ip}:`, error);
      }
    }

    return {};
  }

  private static async tryPingResolution(
    ip: string,
  ): Promise<{ deviceName?: string; description?: string }> {
    const pingCommand =
      process.platform === 'win32' ? `ping -n 1 -w 1000 ${ip}` : `ping -c 1 -W 1000 ${ip}`;
    const { stdout } = await execAsync(pingCommand, { timeout: 3000 });

    if (process.platform === 'win32') {
      const match = /Pinging ([^\s[\]]+)/.exec(stdout);
      if (match && match[1] !== ip && !match[1].startsWith('[')) {
        log.debug(`Hostname encontrado con ping en Windows para ${ip}: ${match[1]}`);
        return { deviceName: match[1], description: 'Windows Device' };
      }
    } else {
      const match = /PING ([^\s]+)/.exec(stdout);
      if (match && match[1] !== ip && match[1].includes('.local')) {
        log.debug(`Hostname encontrado con ping en Unix para ${ip}: ${match[1]}`);
        return { deviceName: match[1], description: 'mDNS Device' };
      }
    }
    return {};
  }

  private static async tryNslookupResolution(
    ip: string,
  ): Promise<{ deviceName?: string; description?: string }> {
    const { stdout } = await execAsync(`nslookup ${ip}`, { timeout: 3000 });
    const nameMatch = /name = ([^\s]+)/.exec(stdout);
    if (nameMatch && nameMatch[1] !== ip) {
      log.debug(`Hostname encontrado con nslookup para ${ip}: ${nameMatch[1]}`);
      return { deviceName: nameMatch[1], description: 'DNS Device' };
    }
    return {};
  }

  private static async tryNetBiosResolution(
    ip: string,
  ): Promise<{ deviceName?: string; description?: string }> {
    if (process.platform !== 'win32') return {};

    const { stdout } = await execAsync(`nbtstat -A ${ip}`, { timeout: 3000 });
    const nameMatch = /([A-Za-z0-9\-_]+)\s+<00>\s+UNIQUE/.exec(stdout);
    if (nameMatch) {
      log.debug(`Hostname encontrado con nbtstat para ${ip}: ${nameMatch[1]}`);
      return { deviceName: nameMatch[1], description: 'NetBIOS Device' };
    }
    return {};
  }

  /**
   * Resolución de fabricante usando MAC address
   */
  private static async resolveManufacturer(
    ip: string,
  ): Promise<{ macAddress?: string; vendor?: string }> {
    try {
      const mac = await this.getMacFromNodeArp(ip);
      if (mac) {
        const vendor = await this.getVendorFromMac(mac);
        return { macAddress: mac, vendor: vendor || undefined };
      }
      return await this.getMacAddressFromARPFallback(ip);
    } catch (error) {
      log.warn('Error obteniendo MAC desde ARP', { ip, error });
      return {};
    }
  }

  private static async getMacFromNodeArp(ip: string): Promise<string | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const arp = require('node-arp');
      return new Promise<string | null>((resolve) => {
        arp.getMAC(ip, (err: Error | null, mac?: string) => {
          if (err || !mac) {
            log.debug(`node-arp no pudo obtener MAC para ${ip}:`, err);
            resolve(null);
          } else {
            // Normalizar formato MAC
            const normalizedMac = mac.toLowerCase().replace(/-/g, ':');
            log.debug(`MAC obtenida para ${ip}: ${normalizedMac}`);
            resolve(normalizedMac);
          }
        });
      });
    } catch (error) {
      log.warn('node-arp falló', { ip, error });
      return null;
    }
  }

  private static async getMacAddressFromARPFallback(
    ip: string,
  ): Promise<{ macAddress?: string; vendor?: string }> {
    try {
      // Primero intentar hacer ping para asegurar que el dispositivo está en la tabla ARP
      const pingCommand =
        process.platform === 'win32' ? `ping -n 1 -w 1000 ${ip}` : `ping -c 1 -W 1000 ${ip}`;
      try {
        await execAsync(pingCommand, { timeout: 3000 });
      } catch {
        // Ignorar errores de ping, continuar con ARP
      }

      let command = process.platform === 'win32' ? `arp -a ${ip}` : `arp -n ${ip}`;
      const { stdout } = await execAsync(command, { timeout: 5000 });

      log.debug(`Salida ARP para ${ip}:`, stdout);

      let match;
      if (process.platform === 'win32') {
        // Buscar patrones de MAC en Windows (con guiones)
        match = new RegExp(
          `${ip.replace(/\./g, '\\.')}\\s+([a-fA-F0-9]{2}-[a-fA-F0-9]{2}-[a-fA-F0-9]{2}-[a-fA-F0-9]{2}-[a-fA-F0-9]{2}-[a-fA-F0-9]{2})`,
        ).exec(stdout);
        if (match) {
          const mac = match[1].replace(/-/g, ':').toLowerCase();
          log.debug(`MAC encontrada en Windows para ${ip}: ${mac}`);
          const vendor = await this.getVendorFromMac(mac);
          return { macAddress: mac, vendor: vendor || undefined };
        }
      } else {
        // Buscar patrones de MAC en Linux/macOS (con dos puntos)
        match = new RegExp(
          `${ip.replace(/\./g, '\\.')}\\s+[a-zA-Z]+\\s+([a-fA-F0-9]{2}:[a-fA-F0-9]{2}:[a-fA-F0-9]{2}:[a-fA-F0-9]{2}:[a-fA-F0-9]{2}:[a-fA-F0-9]{2})`,
        ).exec(stdout);
        if (match) {
          const mac = match[1].toLowerCase();
          log.debug(`MAC encontrada en Unix para ${ip}: ${mac}`);
          const vendor = await this.getVendorFromMac(mac);
          return { macAddress: mac, vendor: vendor || undefined };
        }
      }

      log.debug(`No se encontró MAC para ${ip} en la tabla ARP`);
      return {};
    } catch (error) {
      log.warn(`Error ejecutando ARP para ${ip}:`, error);
      return {};
    }
  }

  private static async getVendorFromMac(mac: string): Promise<string | null> {
    try {
      const oui = mac.substring(0, 8).replace(/:/g, '').toUpperCase().substring(0, 6);

      // Intentar con mac-lookup primero
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const macLookup = require('mac-lookup');
        const vendor = await macLookup.lookup(mac);
        if (vendor?.trim()) {
          log.debug(`Fabricante encontrado con mac-lookup para ${mac}: ${vendor}`);
          return vendor.trim();
        }
      } catch (error) {
        log.debug(`mac-lookup falló para ${mac}:`, error);
      }

      // Fallback a oui-data
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const ouiData = require('oui-data');
        const ouiEntry = ouiData.find(
          (entry: { oui: string; organization: string }) => entry.oui === oui,
        );
        if (ouiEntry?.organization) {
          log.debug(`Fabricante encontrado con oui-data para ${mac}: ${ouiEntry.organization}`);
          return ouiEntry.organization;
        }
      } catch (error) {
        log.debug(`oui-data falló para ${mac}:`, error);
      }

      log.debug(`No se encontró fabricante para MAC ${mac} (OUI: ${oui})`);
      return null;
    } catch (error) {
      log.warn(`Error obteniendo fabricante para MAC ${mac}:`, error);
      return null;
    }
  }

  /**
   * Obtiene dirección MAC desde tabla ARP
   */

  /**
   * Resuelve múltiples IPs en paralelo con control de concurrencia
   */
  static async resolveBatch(ips: string[], maxConcurrency = 10): Promise<ModernDeviceInfo[]> {
    const results: ModernDeviceInfo[] = [];
    for (let i = 0; i < ips.length; i += maxConcurrency) {
      const batch = ips.slice(i, i + maxConcurrency);
      const batchPromises = batch.map((ip) => this.resolveDeviceInfo(ip));
      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') results.push(result.value);
        else results.push({ ip: batch[index], confidence: 0, sources: [] });
      });
    }
    return results;
  }

  /**
   * Limpia el caché de resolución
   */
  static clearCache(): void {
    this.cache.flushAll();
    log.info('Cache de resolución de hostname limpiado');
  }

  /**
   * Obtiene estadísticas del caché
   */
  static getCacheStats(): { keys: number; hits: number; misses: number; hitRate: number } {
    const stats = this.cache.getStats();
    return {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: stats.hits / (stats.hits + stats.misses) || 0,
    };
  }
}

export default ModernHostnameResolver;
