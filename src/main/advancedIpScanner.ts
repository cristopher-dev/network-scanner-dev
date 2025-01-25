import Evilscan from 'evilscan';
import ping from 'ping';
import dns from 'dns';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import { NetworkScanner } from './networkScanner';
import { PortScanner } from './portScanner';
import { HostResolver } from './hostResolver';
import { ServiceDetector } from './serviceDetector';

interface IScanResult {
  ip: string;
  hostname?: string;
  mac?: string;
  ports?: number[];
  os?: string;
  status: 'up' | 'down';
  latency?: number;
  services?: { port: number; name: string }[];
  vendor?: string;
}

interface IScanProgress {
  current: number;
  total: number;
  ip: string;
  timeElapsed: number;
  estimatedTimeRemaining: number;
  speed: number;
}

class ScanError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = 'ScanError';
  }
}

export class AdvancedIpScanner extends EventEmitter {
  private lookup = promisify(dns.lookup);
  private isScanning = false;
  private scanTimeout = 2000; // timeout en ms
  // Método público para establecer el timeout
  public setScanTimeout(timeout: number): void {
    this.scanTimeout = timeout;
  }
  // Agregar manejo de cancelación
  private abortController = new AbortController();
  private cache = new Map<
    string,
    {
      results: IScanResult[];
      timestamp: number;
      ttl: number;
      networkLoad: number;
    }
  >();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  private startTime: number = 0;
  private scannedIps: number = 0;

  private networkScanner = new NetworkScanner();
  private portScanner = new PortScanner();
  private hostResolver = new HostResolver();
  private serviceDetector = new ServiceDetector();

  private getCacheKey(baseIp: string, startRange: number, endRange: number): string {
    return `${baseIp}-${startRange}-${endRange}`;
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_TTL;
  }

  private async shouldUseCachedResults(ip: string): Promise<boolean> {
    const cached = this.cache.get(ip);
    const networkLoad = await this.getCurrentNetworkLoad();
    return (
      (cached &&
        Date.now() - cached.timestamp < 300000 && // 5 minutos
        networkLoad > 0.8) ??
      false
    ); // Alto uso de red
  }

  async scanNetwork(
    baseIp: string = '192.168.10',
    startRange: number = 1,
    endRange: number = 254,
    ports: number[] = [20, 21, 22, 23, 25, 53, 80, 443, 445, 3389],
  ): Promise<IScanResult[]> {
    // Agregar signal para cancelación
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    if (this.isScanning) {
      throw new Error('Scan already in progress');
    }

    // Validaciones iniciales
    if (startRange < 1 || startRange > 254) {
      throw new ScanError('Rango inicial inválido', 'INVALID_START_RANGE');
    }
    if (endRange < 1 || endRange > 254) {
      throw new ScanError('Rango final inválido', 'INVALID_END_RANGE');
    }
    if (startRange > endRange) {
      throw new ScanError('El rango inicial no puede ser mayor al final', 'INVALID_RANGE');
    }

    const cacheKey = this.getCacheKey(baseIp, startRange, endRange);
    const cached = this.cache.get(cacheKey);

    if (cached && this.isCacheValid(cached.timestamp)) {
      this.emit('cache-hit', cacheKey);
      return cached.results;
    }

    this.isScanning = true;
    const results: IScanResult[] = [];
    const total = endRange - startRange + 1;
    const batchSize = 10; // Número máximo de escaneos concurrentes
    this.startTime = Date.now();
    this.scannedIps = 0;

    try {
      for (let i = startRange; i <= endRange; i += batchSize) {
        const batch = [];
        const end = Math.min(i + batchSize - 1, endRange);

        for (let j = i; j <= end; j++) {
          const ip = `${baseIp}.${j}`;
          this.scannedIps++;
          this.updateProgress(ip, total);
          batch.push(this.scanHost(ip, ports));
        }

        const completedScans = await Promise.all(batch);
        results.push(...completedScans.filter((scan): scan is IScanResult => scan !== null));
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Scan cancelled');
      }
      // Logging mejorado
      const err = error instanceof Error ? error : new Error('Unknown error');
      this.emit('error', {
        message: err.message,
        code: 'unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    } finally {
      this.isScanning = false;
    }

    this.cache.set(cacheKey, {
      results,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL,
      networkLoad: await this.getCurrentNetworkLoad(),
    });

    return results;
  }

  async scan(ip: string, ports: number[]): Promise<IScanResult> {
    const pingResult = await ping.promise.probe(ip);

    const result: IScanResult = {
      ip,
      status: pingResult.alive ? 'up' : 'down',
      latency: typeof pingResult.time === 'number' ? pingResult.time : undefined,
      ports: [],
      hostname: pingResult.host,
    };

    if (pingResult.alive) {
      result.ports = await this.scanPorts(ip, ports);
    }

    return result;
  }

  private async scanHost(ip: string, ports: number[]): Promise<IScanResult | null> {
    try {
      const pingResult = await this.networkScanner.pingHost(ip, this.scanTimeout);

      if (!pingResult.alive) return null;

      const result: IScanResult = {
        ip,
        status: 'up',
        latency: typeof pingResult.time === 'number' ? pingResult.time : undefined,
      };

      const [hostname, openPorts, os, mac] = await Promise.all([
        this.hostResolver.resolveHostname(ip),
        this.portScanner.scanPorts(ip, ports, this.scanTimeout),
        this.networkScanner.detectOS(ip, this.scanTimeout),
        this.networkScanner.getMacAddress(ip),
      ]);

      result.hostname = hostname;
      result.ports = openPorts;
      result.services = await this.serviceDetector.detectServices(ip, openPorts);
      result.os = os;
      result.mac = mac;
      result.vendor = await this.networkScanner.getVendorFromMac(mac);

      return result;
    } catch (error) {
      console.error(`Error scanning ${ip}:`, error);
      return null;
    }
  }

  private async getMacAddress(ip: string): Promise<string | undefined> {
    // Implementación pendiente - requiere acceso a nivel de sistema
    return undefined;
  }

  private async getVendorFromMac(mac?: string): Promise<string | undefined> {
    if (!mac) return undefined;
    // Implementación pendiente - requiere base de datos de fabricantes
    return undefined;
  }

  private async scanPorts(ip: string, ports: number[]): Promise<number[]> {
    return new Promise((resolve) => {
      const openPorts: number[] = [];
      const scanner = new Evilscan({
        target: ip,
        port: ports.join(','),
        timeout: this.scanTimeout,
        status: 'TROU',
      });

      scanner.on('result', (data: any) => {
        if (data.status === 'open') {
          openPorts.push(data.port);
        }
      });

      scanner.on('done', () => resolve(openPorts));
      scanner.run();
    });
  }

  private async detectOS(ip: string): Promise<string | undefined> {
    try {
      const ttl = await this.getTTL(ip);
      if (ttl === 128) return 'Windows';
      if (ttl === 64) return 'Linux/Unix';
      if (ttl === 254) return 'Solaris/AIX';
      return undefined;
    } catch {
      return undefined;
    }
  }

  private async getTTL(ip: string): Promise<number | undefined> {
    try {
      const result = await ping.promise.probe(ip, {
        timeout: this.scanTimeout / 1000,
      });
      const ttl = parseInt(result.output.match(/ttl=(\d+)/i)?.[1] || '');
      return isNaN(ttl) ? undefined : ttl;
    } catch {
      return undefined;
    }
  }

  private async resolveHostname(ip: string): Promise<string | undefined> {
    try {
      const { address } = await this.lookup(ip);
      return address;
    } catch {
      return undefined;
    }
  }

  private async detectServices(
    ip: string,
    ports: number[],
  ): Promise<{ port: number; name: string }[]> {
    const commonServices: Record<number, string> = {
      21: 'FTP',
      22: 'SSH',
      23: 'Telnet',
      25: 'SMTP',
      53: 'DNS',
      80: 'HTTP',
      443: 'HTTPS',
      445: 'SMB',
      3389: 'RDP',
    };

    return ports.map((port) => ({
      port,
      name: commonServices[port] || 'Unknown',
    }));
  }

  // Agregar método para cancelar escaneo
  cancelScan() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  private updateProgress(ip: string, total: number): void {
    const timeElapsed = Date.now() - this.startTime;
    const speed = this.scannedIps / (timeElapsed / 1000);
    const remaining = total - this.scannedIps;
    const estimatedTimeRemaining = (remaining / speed) * 1000;

    this.emit('progress', {
      current: this.scannedIps,
      total,
      ip,
      timeElapsed,
      estimatedTimeRemaining,
      speed,
    });
  }

  private async getCurrentNetworkLoad(): Promise<number> {
    // Implementación básica: retorna un valor entre 0 y 1
    // Esto debería reemplazarse con una implementación real que mida el uso de red
    return Math.random();
  }
}

export default AdvancedIpScanner;
