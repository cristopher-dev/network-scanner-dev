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
   * Resolución mDNS/Bonjour (simulada - requiere librerías adicionales)
   */
  private static async resolveMDNS(
    ip: string,
  ): Promise<{ deviceName?: string; description?: string }> {
    // Simulación básica, se recomienda implementar con mdns/bonjour
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
        arp.getMAC(ip, (err: Error | null, mac?: string) => resolve(err || !mac ? null : mac));
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
      let command = process.platform === 'win32' ? `arp -a ${ip}` : `arp -n ${ip}`;
      const { stdout } = await execAsync(command, { timeout: 3000 });
      let match;
      if (process.platform === 'win32') {
        match =
          /([a-fA-F0-9]{2}-[a-fA-F0-9]{2}-[a-fA-F0-9]{2}-[a-fA-F0-9]{2}-[a-fA-F0-9]{2}-[a-fA-F0-9]{2})/.exec(
            stdout,
          );
        if (match) {
          const mac = match[1].replace(/-/g, ':');
          const vendor = await this.getVendorFromMac(mac);
          return { macAddress: mac, vendor: vendor || undefined };
        }
      } else {
        match =
          /([a-fA-F0-9]{2}:[a-fA-F0-9]{2}:[a-fA-F0-9]{2}:[a-fA-F0-9]{2}:[a-fA-F0-9]{2}:[a-fA-F0-9]{2})/.exec(
            stdout,
          );
        if (match) {
          const mac = match[1];
          const vendor = await this.getVendorFromMac(mac);
          return { macAddress: mac, vendor: vendor || undefined };
        }
      }
      return {};
    } catch {
      return {};
    }
  }

  private static async getVendorFromMac(mac: string): Promise<string | null> {
    try {
      const oui = mac.substring(0, 8).replace(/:/g, '').toUpperCase().substring(0, 6);
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const macLookup = require('mac-lookup');
        const vendor = await macLookup.lookup(mac);
        if (vendor) return vendor;
      } catch {}
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const ouiData = require('oui-data');
        const ouiEntry = ouiData.find(
          (entry: { oui: string; organization: string }) => entry.oui === oui,
        );
        if (ouiEntry) return ouiEntry.organization;
      } catch {}
      return null;
    } catch {
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
