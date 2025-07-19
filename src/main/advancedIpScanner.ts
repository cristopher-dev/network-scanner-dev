import { nodenmap } from 'node-nmap';
import ping from 'ping';
import dns from 'dns';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import NodeCache from 'node-cache';

import { IScanResult, ScanError } from '../shared/types';

export class AdvancedIpScanner extends EventEmitter {
  private readonly lookup = promisify(dns.lookup);
  private isScanning = false;
  private scanTimeout = 2000; // timeout en ms
  private readonly cache: NodeCache;
  private readonly concurrencyLimit = 10; // Límite de concurrencia simple

  // Método público para establecer el timeout
  public setScanTimeout(timeout: number): void {
    this.scanTimeout = timeout;
  }

  // Agregar manejo de cancelación
  private abortController = new AbortController();
  private startTime: number = 0;
  private scannedIps: number = 0;

  constructor() {
    super();

    // Inicializar cache con NodeCache
    this.cache = new NodeCache({
      stdTTL: 300, // 5 minutos
      checkperiod: 120, // Verificar cada 2 minutos
      useClones: false,
    });
  }

  // Implementación simple de límite de concurrencia
  private async runWithConcurrencyLimit<T>(
    tasks: (() => Promise<T>)[],
    limit: number = this.concurrencyLimit,
  ): Promise<T[]> {
    const results: T[] = [];

    for (let i = 0; i < tasks.length; i += limit) {
      const batch = tasks.slice(i, i + limit);
      const batchResults = await Promise.all(batch.map((task) => task()));
      results.push(...batchResults);
    }

    return results;
  }

  // Implementación simple de retry
  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000,
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, delay * attempt));
      }
    }
    throw new Error('Max retries exceeded');
  }

  private getCacheKey(baseIp: string, startRange: number, endRange: number): string {
    return `${baseIp}-${startRange}-${endRange}`;
  }

  private isCacheValid(): boolean {
    // NodeCache maneja automáticamente la validez del cache
    return true;
  }

  private async shouldUseCachedResults(): Promise<boolean> {
    // Simplificado: NodeCache maneja TTL automáticamente
    return false;
  }

  async scanNetwork(
    baseIp: string = '192.168.10',
    startRange: number = 1,
    endRange: number = 254,
    ports: number[] = [20, 21, 22, 23, 25, 53, 80, 443, 445, 3389],
    useNmapDirect: boolean = true, // New parameter to use nmap directly
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
    const cached = this.cache.get<IScanResult[]>(cacheKey);

    if (cached) {
      this.emit('cache-hit', cacheKey);
      return cached;
    }

    this.isScanning = true;
    let results: IScanResult[] = [];
    this.startTime = Date.now();
    this.scannedIps = 0;

    try {
      results = await this.executeNetworkScan(baseIp, startRange, endRange, ports, useNmapDirect);
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

    this.cache.set(cacheKey, results);

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
      const pingResult = await ping.promise.probe(ip, {
        timeout: this.scanTimeout / 1000,
      });

      if (!pingResult.alive) return null;

      const result: IScanResult = {
        ip,
        status: 'up',
        latency: typeof pingResult.time === 'number' ? pingResult.time : undefined,
      };

      const [hostname, openPorts, os, mac] = await Promise.all([
        this.resolveHostname(ip),
        this.scanPorts(ip, ports),
        this.detectOS(ip),
        this.getMacAddress(ip),
      ]);

      result.hostname = hostname;
      result.ports = openPorts;
      result.services = await this.detectServices(ip, openPorts);
      result.os = os;
      result.mac = mac;
      result.vendor = await this.getVendorFromMac(mac);

      return result;
    } catch (error) {
      console.error(`Error scanning ${ip}:`, error);
      return null;
    }
  }

  private async getMacAddress(ip: string): Promise<string | undefined> {
    try {
      const scanner = nodenmap({
        target: ip,
        flags: ['-sn'], // Ping scan only to get MAC address
        timeout: this.scanTimeout,
      });

      return new Promise((resolve) => {
        scanner.scanComplete((error, result) => {
          if (error || !result?.hosts || result.hosts.length === 0) {
            resolve(undefined);
            return;
          }

          const host = result.hosts[0];
          resolve(host.mac || undefined);
        });

        scanner.scanTimeout(() => {
          resolve(undefined);
        });

        scanner.startScan().catch(() => {
          resolve(undefined);
        });
      });
    } catch {
      return undefined;
    }
  }

  private async getVendorFromMac(mac?: string): Promise<string | undefined> {
    if (!mac) return undefined;
    // Implementación pendiente - requiere base de datos de fabricantes
    return undefined;
  }

  private async scanPorts(ip: string, ports: number[]): Promise<number[]> {
    return new Promise((resolve, reject) => {
      const openPorts: number[] = [];

      const scanner = nodenmap({
        target: ip,
        ports: ports.join(','),
        flags: ['-sS', '-O'], // SYN scan with OS detection
        timeout: this.scanTimeout,
      });

      scanner.scanComplete((error, result) => {
        if (error) {
          console.error(`Error scanning ports for ${ip}:`, error);
          resolve([]); // Return empty array on error instead of rejecting
          return;
        }

        if (result?.hosts && result.hosts.length > 0) {
          const host = result.hosts[0];
          if (host?.openPorts) {
            const foundPorts = host.openPorts.filter((p) => p.state === 'open').map((p) => p.port);
            openPorts.push(...foundPorts);
          }
        }

        resolve(openPorts);
      });

      scanner.scanTimeout(() => {
        resolve(openPorts);
      });

      scanner.startScan().catch((error) => {
        console.error(`Error starting scan for ${ip}:`, error);
        resolve([]);
      });
    });
  }

  private async detectOS(ip: string): Promise<string | undefined> {
    try {
      const scanner = nodenmap({
        target: ip,
        flags: ['-O', '--osscan-guess'], // OS detection with guessing
        timeout: this.scanTimeout,
      });

      return new Promise((resolve) => {
        scanner.scanComplete((error, result) => {
          if (error || !result?.hosts || result.hosts.length === 0) {
            // Fallback to TTL-based detection
            this.getTTL(ip)
              .then((ttl) => {
                if (ttl === 128) resolve('Windows');
                else if (ttl === 64) resolve('Linux/Unix');
                else if (ttl === 254) resolve('Solaris/AIX');
                else resolve(undefined);
              })
              .catch(() => resolve(undefined));
            return;
          }

          const host = result.hosts[0];
          resolve(host.osNmap || undefined);
        });

        scanner.scanTimeout(() => {
          // Fallback to TTL method on timeout
          this.getTTL(ip)
            .then((ttl) => {
              if (ttl === 128) resolve('Windows');
              else if (ttl === 64) resolve('Linux/Unix');
              else if (ttl === 254) resolve('Solaris/AIX');
              else resolve(undefined);
            })
            .catch(() => resolve(undefined));
        });

        scanner.startScan().catch(() => {
          resolve(undefined);
        });
      });
    } catch {
      // Fallback to TTL-based detection
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
  }

  private async getTTL(ip: string): Promise<number | undefined> {
    try {
      const result = await ping.promise.probe(ip, {
        timeout: this.scanTimeout / 1000,
      });
      const ttlRegex = /ttl=(\d+)/i;
      const match = ttlRegex.exec(result.output);
      const ttl = parseInt(match?.[1] || '');
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

  private processNmapHost(host: any): IScanResult {
    const openPorts = host.openPorts?.filter((p: any) => p.state === 'open') || [];

    return {
      ip: host.ip,
      status: host.status,
      hostname: host.hostname,
      mac: host.mac,
      vendor: host.vendor,
      os: host.osNmap,
      ports: openPorts.map((p: any) => p.port),
      services: openPorts.map((p: any) => ({
        port: p.port,
        name: p.service || 'Unknown',
      })),
      latency: undefined,
    };
  }

  private async scanNetworkWithNmap(
    baseIp: string,
    startRange: number,
    endRange: number,
    ports: number[],
  ): Promise<IScanResult[]> {
    const range = `${baseIp}.${startRange}-${endRange}`;

    return new Promise((resolve) => {
      const scanner = nodenmap({
        target: range,
        ports: ports.join(','),
        flags: ['-sS', '-O', '-A'],
        timeout: this.scanTimeout * 2,
      });

      scanner.scanComplete((error, result) => {
        if (error || !result?.hosts) {
          console.error('Error in network scan:', error);
          resolve([]);
          return;
        }

        const results: IScanResult[] = result.hosts.map((host) => this.processNmapHost(host));
        resolve(results);
      });

      scanner.scanTimeout(() => {
        console.warn('Network scan timed out');
        resolve([]);
      });

      scanner.startScan().catch((error) => {
        console.error('Error starting network scan:', error);
        resolve([]);
      });
    });
  }

  // Agregar método para cancelar escaneo
  cancelScan() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  private async executeNetworkScan(
    baseIp: string,
    startRange: number,
    endRange: number,
    ports: number[],
    useNmapDirect: boolean,
  ): Promise<IScanResult[]> {
    const total = endRange - startRange + 1;
    let results: IScanResult[] = [];

    if (useNmapDirect && total <= 50) {
      console.log('Using nmap direct network scan...');
      results = await this.scanNetworkWithNmap(baseIp, startRange, endRange, ports);
      this.scannedIps = total;
      this.updateProgress(`${baseIp}.${endRange}`, total);
    } else {
      console.log('Using individual host scanning...');
      results = await this.scanIndividualHosts(baseIp, startRange, endRange, ports);
    }

    return results;
  }

  private async scanIndividualHosts(
    baseIp: string,
    startRange: number,
    endRange: number,
    ports: number[],
  ): Promise<IScanResult[]> {
    const results: IScanResult[] = [];
    const total = endRange - startRange + 1;
    const batchSize = 10;

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

    return results;
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

  // Método removido: getCurrentNetworkLoad ya no es necesario
  // El cache ahora usa NodeCache que maneja TTL automáticamente
}

export default AdvancedIpScanner;
