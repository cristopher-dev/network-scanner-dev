import dns from 'dns';
import { promisify } from 'util';
import log from 'electron-log';
import NodeCache from 'node-cache';
import {
  getDeviceTypeFromHostname,
  getDeviceTypeFromVendor,
  getDeviceTypeFromIP,
} from '../shared/networkUtils';
import { NETWORK_CONSTANTS } from '../shared/constants';

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
    // Simulación básica, se recomienda implementar con node-arp
    return {};
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
