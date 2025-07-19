import dns from 'dns';
import { promisify } from 'util';
import log from 'electron-log';
import NodeCache from 'node-cache';

const reverseLookup = promisify(dns.reverse);
const lookup = promisify(dns.lookup);

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
  private static cache: NodeCache = new NodeCache({
    stdTTL: 600, // 10 minutos
    checkperiod: 120,
    useClones: false,
  });

  /**
   * Resuelve información completa del dispositivo usando múltiples métodos
   */
  static async resolveDeviceInfo(ip: string): Promise<ModernDeviceInfo> {
    const cacheKey = `device_${ip}`;
    const cached = this.cache.get<ModernDeviceInfo>(cacheKey);

    if (cached) {
      return cached;
    }

    const device: ModernDeviceInfo = {
      ip,
      confidence: 0,
      sources: [],
    };

    // Ejecutar todos los métodos de resolución en paralelo
    const [dnsInfo, mdnsInfo, manufacturaInfo] = await Promise.allSettled([
      this.resolveDNS(ip),
      this.resolveMDNS(ip),
      this.resolveManufacturer(ip),
    ]);

    // Consolidar información DNS
    if (dnsInfo.status === 'fulfilled' && dnsInfo.value) {
      if (dnsInfo.value.hostname) {
        device.hostname = dnsInfo.value.hostname;
        device.confidence += 30;
        device.sources.push('DNS');
      }
    }

    // Consolidar información mDNS
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

    // Consolidar información del fabricante
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

    // Determinar tipo de dispositivo basado en información disponible
    device.deviceType = this.determineDeviceType(device);
    if (device.deviceType !== 'Unknown') {
      device.confidence += 5;
    }

    // Guardar en caché
    this.cache.set(cacheKey, device);

    log.debug(`Dispositivo resuelto ${ip}:`, {
      hostname: device.hostname,
      confidence: device.confidence,
      sources: device.sources.join(', '),
    });

    return device;
  }

  /**
   * Resolución DNS tradicional
   */
  private static async resolveDNS(ip: string): Promise<{
    hostname?: string;
    aliases?: string[];
  }> {
    try {
      // Reverse DNS lookup
      const hostnames = await reverseLookup(ip);
      const primaryHostname = hostnames?.[0];

      if (!primaryHostname) {
        return {};
      }

      // Forward lookup para verificar
      try {
        const resolved = await lookup(primaryHostname);
        if (resolved.address === ip) {
          return {
            hostname: primaryHostname,
            aliases: hostnames.slice(1),
          };
        }
      } catch {
        // Si el forward lookup falla, aún podemos usar el hostname
        return { hostname: primaryHostname };
      }

      return {};
    } catch (error) {
      log.debug(`DNS resolution failed for ${ip}:`, error);
      return {};
    }
  }

  /**
   * Resolución mDNS/Bonjour (simulada - requiere librerías adicionales)
   */
  private static async resolveMDNS(ip: string): Promise<{
    deviceName?: string;
    description?: string;
    services?: string[];
  }> {
    try {
      // Implementación básica usando ping con análisis de respuesta
      // En una implementación completa, se usaría una librería como 'mdns' o 'bonjour'

      // Por ahora, retornamos información básica si detectamos patrones conocidos
      return this.detectDevicePatterns(ip);
    } catch (error) {
      log.debug(`mDNS resolution failed for ${ip}:`, error);
      return {};
    }
  }

  /**
   * Resolución de fabricante usando MAC address
   */
  private static async resolveManufacturer(ip: string): Promise<{
    macAddress?: string;
    vendor?: string;
  }> {
    try {
      // Intentar obtener MAC desde tabla ARP del sistema
      const macAddress = await this.getMacFromARP(ip);

      if (!macAddress) {
        return {};
      }

      // Obtener fabricante usando OUI lookup
      const vendor = this.getVendorFromOUI(macAddress);

      return {
        macAddress,
        vendor,
      };
    } catch (error) {
      log.debug(`Manufacturer resolution failed for ${ip}:`, error);
      return {};
    }
  }

  /**
   * Obtiene dirección MAC desde tabla ARP
   */
  private static async getMacFromARP(ip: string): Promise<string | undefined> {
    try {
      // Usar node-arp si está disponible
      const nodeArp = (await import('node-arp').catch(() => null)) as any;

      if (nodeArp) {
        return new Promise<string | undefined>((resolve) => {
          nodeArp.getMAC(ip, (err: Error | null, mac?: string) => {
            resolve(err ? undefined : mac);
          });
        });
      }

      // Fallback: parse ARP table manually (implementación básica)
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Obtiene fabricante desde OUI (Organizationally Unique Identifier)
   */
  private static getVendorFromOUI(macAddress: string): string | undefined {
    try {
      // Obtener los primeros 3 octetos (OUI)
      const oui = macAddress.replace(/[:-]/g, '').substring(0, 6).toUpperCase();

      // Base de datos básica de OUIs comunes
      const commonOUIs: Record<string, string> = {
        '001D4F': 'Apple',
        '001DD8': 'Apple',
        '001D7E': 'Apple',
        '001E52': 'Apple',
        '001EC2': 'Apple',
        '001F5B': 'Apple',
        '0050E4': 'Apple',
        AC87A3: 'Apple',
        F4F15E: 'Apple',
        E0338E: 'Apple',
        C86F1D: 'Apple',
        '6C709F': 'Apple',
        '60334B': 'Apple',
        '50B7C3': 'Apple',
        '24F677': 'Apple',
        '1499E2': 'Apple',
        D8004D: 'Apple',
        '4C32CF': 'Apple',
        B4BFF6: 'Apple',
        A0999B: 'Apple',
        '9C84BF': 'Apple',
        C4E1A1: 'Apple',
        A4516F: 'Apple',
        '7CF05F': 'Apple',
        '68D93C': 'Apple',
        '44D884': 'Apple',
        '3C2EF9': 'Apple',
        '380195': 'Apple',
        '34159E': 'Apple',
        '3090AB': 'Apple',
        '2CF0A2': 'Apple',
        '28E14C': 'Apple',
        '28A02B': 'Apple',
        '204747': 'Apple',
        '1CE62B': 'Apple',
        '1C1AC0': 'Apple',
        '18E7F4': 'Apple',
        '1C91EC': 'Apple',
        '18AF61': 'Apple',
        '040CCE': 'Apple',
        '00F76F': 'Apple',
        '00254B': 'Apple',
        '00264A': 'Apple',

        '001B44': 'Samsung',
        '0018AF': 'Samsung',
        '002566': 'Samsung',
        '0026CC': 'Samsung',
        '00E04C': 'Samsung',
        '4C8B30': 'Samsung',
        '5C0A5B': 'Samsung',
        '689423': 'Samsung',
        '6C2F2C': 'Samsung',
        '7816D9': 'Samsung',
        '8851FB': 'Samsung',
        '8C77F2': 'Samsung',
        '9C3AE6': 'Samsung',
        AC3743: 'Samsung',
        B85510: 'Samsung',
        C4576E: 'Samsung',
        CC07AB: 'Samsung',
        D05099: 'Samsung',
        DC71E8: 'Samsung',
        E09467: 'Samsung',
        E8508B: 'Samsung',
        EC9A74: 'Samsung',
        FCAA14: 'Samsung',

        '0026B0': 'Intel',
        '0026C6': 'Intel',
        '0026C7': 'Intel',
        '001C23': 'Intel',
        '00D0B7': 'Intel',
        '080027': 'Intel',
        '000E35': 'Intel',
        '001517': 'Intel',
        '001F3A': 'Intel',
        '0024D6': 'Intel',
        '3C970E': 'Intel',
        '84A6C8': 'Intel',
        A0A8CD: 'Intel',
        CCAF78: 'Intel',

        '0050F2': 'Microsoft',
        '7C1E52': 'Microsoft',
        '000D3A': 'Microsoft',

        '001A79': 'Google',
        '001E8C': 'Google',
        '6C659A': 'Google',

        '0017F2': 'Amazon',
        '747548': 'Amazon',
        '68B599': 'Amazon',
        '44650D': 'Amazon',
        '38F73D': 'Amazon',

        '000B6B': 'Dell',
        '001143': 'Dell',
        '0015C5': 'Dell',
        '001921': 'Dell',
        '001E4F': 'Dell',
        '0024E8': 'Dell',
        '002564': 'Dell',
        '78F3B0': 'Dell',
        D4AE52: 'Dell',

        '001560': 'HP',
        '001A4B': 'HP',
        '001E0B': 'HP',
        '0023D1': 'HP',
        '00238C': 'HP',
        '002481': 'HP',
        '0025B3': 'HP',
        '009C02': 'HP',
        '5CF9DD': 'HP',
        '70F087': 'HP',
      };

      return commonOUIs[oui] || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Detecta patrones de dispositivos conocidos
   */
  private static async detectDevicePatterns(ip: string): Promise<{
    deviceName?: string;
    description?: string;
    services?: string[];
  }> {
    // Implementación básica de detección de patrones
    // En una versión completa, esto incluiría análisis de puertos y servicios

    // Detectar rangos comunes de routers
    const lastOctet = parseInt(ip.split('.')[3]);

    if (lastOctet === 1) {
      return {
        description: 'Posible router/gateway',
        deviceName: 'Router',
      };
    }

    if (lastOctet >= 100 && lastOctet <= 150) {
      return {
        description: 'Rango típico DHCP - dispositivo cliente',
      };
    }

    return {};
  }

  /**
   * Determina el tipo de dispositivo basado en información disponible
   */
  private static determineDeviceType(device: ModernDeviceInfo): string {
    const { hostname, vendor, ip } = device;

    // Análisis basado en hostname
    if (hostname) {
      const deviceTypeFromHostname = this.getDeviceTypeFromHostname(hostname);
      if (deviceTypeFromHostname !== 'Unknown') {
        return deviceTypeFromHostname;
      }
    }

    // Análisis basado en fabricante
    if (vendor) {
      const deviceTypeFromVendor = this.getDeviceTypeFromVendor(vendor);
      if (deviceTypeFromVendor !== 'Unknown') {
        return deviceTypeFromVendor;
      }
    }

    // Análisis basado en IP
    return this.getDeviceTypeFromIP(ip);
  }

  private static getDeviceTypeFromHostname(hostname: string): string {
    const hostnameLower = hostname.toLowerCase();

    if (hostnameLower.includes('router') || hostnameLower.includes('gateway')) {
      return 'Router';
    }
    if (hostnameLower.includes('printer') || hostnameLower.includes('print')) {
      return 'Printer';
    }
    if (hostnameLower.includes('phone') || hostnameLower.includes('mobile')) {
      return 'Mobile Device';
    }
    if (hostnameLower.includes('desktop') || hostnameLower.includes('pc')) {
      return 'Desktop Computer';
    }
    if (hostnameLower.includes('laptop') || hostnameLower.includes('notebook')) {
      return 'Laptop';
    }
    if (hostnameLower.includes('server')) {
      return 'Server';
    }

    return 'Unknown';
  }

  private static getDeviceTypeFromVendor(vendor: string): string {
    const vendorLower = vendor.toLowerCase();

    if (vendorLower.includes('apple')) {
      return 'Apple Device';
    }
    if (vendorLower.includes('samsung')) {
      return 'Samsung Device';
    }
    if (vendorLower.includes('intel')) {
      return 'Intel Device';
    }

    return 'Unknown';
  }

  private static getDeviceTypeFromIP(ip: string): string {
    const lastOctet = parseInt(ip.split('.')[3]);
    if (lastOctet === 1 || lastOctet === 254) {
      return 'Network Infrastructure';
    }

    return 'Unknown';
  }

  /**
   * Resuelve múltiples IPs en paralelo con control de concurrencia
   */
  static async resolveBatch(
    ips: string[],
    maxConcurrency: number = 10,
  ): Promise<ModernDeviceInfo[]> {
    const results: ModernDeviceInfo[] = [];

    for (let i = 0; i < ips.length; i += maxConcurrency) {
      const batch = ips.slice(i, i + maxConcurrency);
      const batchPromises = batch.map((ip) => this.resolveDeviceInfo(ip));

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          log.warn(`Failed to resolve ${batch[index]}:`, result.reason);
          results.push({
            ip: batch[index],
            confidence: 0,
            sources: [],
          });
        }
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
  static getCacheStats(): {
    keys: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
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
