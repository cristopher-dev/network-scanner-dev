import { EventEmitter } from 'events';
import ping from 'ping';
import dns from 'dns';
import { promisify } from 'util';
import NodeCache from 'node-cache';
import { exec } from 'child_process';
import net from 'net';
import log from 'electron-log';

const lookup = promisify(dns.lookup);
const execAsync = promisify(exec);

interface IScanResult {
  ip: string;
  status: 'up' | 'down';
  latency?: number;
  hostname?: string;
  mac?: string;
  vendor?: string;
  os?: string;
  ports?: number[];
  services?: { port: number; name: string }[];
  timestamp?: number;
}

interface IScanProgress {
  current: number;
  total: number;
  ip?: string;
  percentage?: number;
  timeElapsed?: number;
  estimatedTimeRemaining?: number;
  speed?: number;
}

class ScanError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'ScanError';
    this.code = code;
  }
}

export class PureNpmScanner extends EventEmitter {
  private readonly lookup = promisify(dns.lookup);
  private isScanning = false;
  private scanTimeout = 2000;
  private readonly cache: NodeCache;
  private readonly concurrencyLimit = 15;
  private abortController = new AbortController();
  private startTime: number = 0;
  private scannedIps: number = 0;

  constructor() {
    super();
    this.cache = new NodeCache({
      stdTTL: 300, // 5 minutos
      checkperiod: 120,
      useClones: false,
    });
  }

  public setScanTimeout(timeout: number): void {
    this.scanTimeout = timeout;
  }

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

  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 2,
    delay: number = 500,
  ): Promise<T> {
    let lastError: Error;
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }
    throw lastError!;
  }

  private getCacheKey(baseIp: string, startRange: number, endRange: number): string {
    return `scan_${baseIp}_${startRange}_${endRange}`;
  }

  async scanNetwork(
    baseIp: string = '192.168.1',
    startRange: number = 1,
    endRange: number = 254,
    ports: number[] = [20, 21, 22, 23, 25, 53, 80, 443, 445, 3389],
  ): Promise<IScanResult[]> {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    if (this.isScanning) {
      throw new Error('Scan already in progress');
    }

    // Validaciones
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
      results = await this.executeNetworkScan(baseIp, startRange, endRange, ports);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        log.info('Scan cancelled');
      }
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

  private async executeNetworkScan(
    baseIp: string,
    startRange: number,
    endRange: number,
    ports: number[],
  ): Promise<IScanResult[]> {
    const total = endRange - startRange + 1;
    log.info(`Starting scan of ${total} hosts using pure NPM libraries`);

    const results = await this.scanIndividualHosts(baseIp, startRange, endRange, ports);
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
    const batchSize = this.concurrencyLimit;

    const tasks: (() => Promise<IScanResult | null>)[] = [];

    for (let i = startRange; i <= endRange; i++) {
      const ip = `${baseIp}.${i}`;
      tasks.push(() => this.scanHost(ip, ports));
    }

    // Procesar en lotes para controlar la concurrencia
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map((task) => task()));

      for (const result of batchResults) {
        if (result) {
          results.push(result);
          this.emit('host-discovered', result);
        }
        this.scannedIps++;
        this.updateProgress(`${baseIp}.${startRange + this.scannedIps - 1}`, total);
      }

      // Pequeña pausa entre lotes
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    return results;
  }

  private async scanHost(ip: string, ports: number[]): Promise<IScanResult | null> {
    try {
      // Ping host primero
      const pingResult = await ping.promise.probe(ip, {
        timeout: this.scanTimeout / 1000,
      });

      if (!pingResult.alive) return null;

      const result: IScanResult = {
        ip,
        status: 'up',
        latency: typeof pingResult.time === 'number' ? pingResult.time : undefined,
        timestamp: Date.now(),
      };

      // Ejecutar tareas en paralelo
      const [hostname, openPorts, os, mac] = await Promise.all([
        this.resolveHostname(ip),
        this.scanPorts(ip, ports),
        this.detectOS(ip),
        this.getMacAddress(ip),
      ]);

      result.hostname = hostname;
      result.ports = openPorts;
      result.services = this.detectServices(openPorts);
      result.os = os;
      result.mac = mac;
      result.vendor = await this.getVendorFromMac(mac);

      return result;
    } catch (error) {
      log.error(`Error scanning ${ip}:`, error);
      return null;
    }
  }

  private async resolveHostname(ip: string): Promise<string | undefined> {
    try {
      const result = await this.retryOperation(
        async () => {
          return new Promise<string>((resolve, reject) => {
            dns.reverse(ip, (err, hostnames) => {
              if (err || !hostnames || hostnames.length === 0) {
                reject(err || new Error('No hostname found'));
              } else {
                resolve(hostnames[0]);
              }
            });
          });
        },
        1,
        300,
      );
      return result;
    } catch {
      return undefined;
    }
  }

  private async scanPorts(ip: string, ports: number[]): Promise<number[]> {
    const openPorts: number[] = [];
    const portTasks = ports.map((port) => async () => {
      const isOpen = await this.checkPort(ip, port);
      return isOpen ? port : null;
    });

    const results = await this.runWithConcurrencyLimit(portTasks, 5);

    for (const port of results) {
      if (port !== null) {
        openPorts.push(port);
      }
    }

    return openPorts.sort((a, b) => a - b);
  }

  private async checkPort(ip: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = this.scanTimeout / 2;

      const timer = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, timeout);

      socket.connect(port, ip, () => {
        clearTimeout(timer);
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        clearTimeout(timer);
        socket.destroy();
        resolve(false);
      });
    });
  }

  private async detectOS(ip: string): Promise<string | undefined> {
    try {
      // Usar TTL para detección básica de OS
      const ttl = await this.getTTL(ip);
      if (ttl) {
        if (ttl <= 64) return 'Linux/Unix';
        if (ttl <= 128) return 'Windows';
        if (ttl <= 255) return 'Solaris/AIX';
      }
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

      if (result.output) {
        const ttlMatch = /ttl[=:]?\s*(\d+)/i.exec(result.output);
        if (ttlMatch) {
          return parseInt(ttlMatch[1], 10);
        }
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  private async getMacAddress(ip: string): Promise<string | undefined> {
    try {
      // Intentar obtener MAC desde ARP table
      const arpResult = await this.getArpEntry(ip);
      return arpResult;
    } catch {
      return undefined;
    }
  }

  private async getArpEntry(ip: string): Promise<string | undefined> {
    try {
      const platform = process.platform;
      let command: string;

      if (platform === 'win32') {
        command = `arp -a ${ip}`;
      } else if (platform === 'darwin') {
        command = `arp -n ${ip}`;
      } else {
        command = `arp -n ${ip}`;
      }

      const { stdout } = await execAsync(command);

      // Extraer MAC address del output
      const macMatch =
        /([0-9a-f]{2}[:-][0-9a-f]{2}[:-][0-9a-f]{2}[:-][0-9a-f]{2}[:-][0-9a-f]{2}[:-][0-9a-f]{2})/i.exec(
          stdout,
        );
      return macMatch ? macMatch[1].toLowerCase() : undefined;
    } catch {
      return undefined;
    }
  }

  private async getVendorFromMac(mac?: string): Promise<string | undefined> {
    if (!mac) return undefined;

    try {
      // Usar OUI lookup básico
      const oui = mac.replace(/[:-]/g, '').substring(0, 6).toUpperCase();
      // Aquí podrías integrar con una base de datos OUI o API
      // Por simplicidad, devolvemos undefined
      return undefined;
    } catch {
      return undefined;
    }
  }

  private detectServices(ports: number[]): { port: number; name: string }[] {
    const commonServices: Record<number, string> = {
      20: 'FTP-Data',
      21: 'FTP',
      22: 'SSH',
      23: 'Telnet',
      25: 'SMTP',
      53: 'DNS',
      67: 'DHCP',
      68: 'DHCP',
      80: 'HTTP',
      110: 'POP3',
      143: 'IMAP',
      443: 'HTTPS',
      445: 'SMB',
      993: 'IMAPS',
      995: 'POP3S',
      3389: 'RDP',
      5432: 'PostgreSQL',
      3306: 'MySQL',
      1433: 'MSSQL',
      8080: 'HTTP-Alt',
      8443: 'HTTPS-Alt',
    };

    return ports.map((port) => ({
      port,
      name: commonServices[port] || 'Unknown',
    }));
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
      percentage: (this.scannedIps / total) * 100,
    });
  }

  cancelScan(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.isScanning = false;
  }

  isCurrentlyScanning(): boolean {
    return this.isScanning;
  }
}

export default PureNpmScanner;
