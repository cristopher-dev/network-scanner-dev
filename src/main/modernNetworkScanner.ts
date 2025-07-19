import { EventEmitter } from 'events';
import ping from 'ping';
import dns from 'dns';
import net from 'net';
import { promisify } from 'util';
import NodeCache from 'node-cache';
import log from 'electron-log';
import systeminformation from 'systeminformation';
import { Netmask } from 'netmask';
import * as ipaddr from 'ipaddr.js';
import { NETWORK_CONSTANTS, SERVICE_NAMES } from '../shared/constants';

import {
  ScanResult,
  ModernScanConfig,
  ExtendedScanResult,
  NetworkInterface,
} from '../shared/types';

const lookup = promisify(dns.lookup);
const reverseLookup = promisify(dns.reverse);

import { isPrivateIP } from '../shared/networkUtils';

export class ModernNetworkScanner extends EventEmitter {
  private readonly cache: NodeCache;
  private isScanning = false;
  private abortController = new AbortController();
  private startTime = 0;
  private scannedHosts = 0;

  constructor() {
    super();
    this.cache = new NodeCache({
      stdTTL: NETWORK_CONSTANTS.ADVANCED_CACHE_TTL,
      checkperiod: NETWORK_CONSTANTS.CACHE_CHECK_PERIOD,
      useClones: false,
    });
  }

  /**
   * Detecta automáticamente las interfaces de red usando systeminformation
   */
  async detectNetworkInterfaces(): Promise<NetworkInterface[]> {
    try {
      const networkInterfaces = await systeminformation.networkInterfaces();
      const defaultGateway = await systeminformation.networkGatewayDefault();

      return networkInterfaces
        .filter((iface) => !iface.internal && iface.ip4 && isPrivateIP(iface.ip4))
        .map((iface) => ({
          interface: iface.iface,
          ip: iface.ip4,
          netmask: iface.ip4subnet,
          gateway: defaultGateway || undefined,
          type: iface.type,
        }));
    } catch (error) {
      log.error('Error detecting network interfaces:', error);
      return [];
    }
  }

  /**
   * Calcula el rango de IPs basado en la máscara de red usando netmask
   */
  calculateNetworkRange(
    ip: string,
    netmask: string,
  ): { start: number; end: number; totalHosts: number } {
    try {
      const network = new Netmask(`${ip}/${netmask}`);
      const baseIp = network.base;
      const broadcast = network.broadcast;

      const baseOctets = baseIp.split('.').map(Number);
      const broadcastOctets = broadcast.split('.').map(Number);

      const start = baseOctets[3] + 1; // Excluir dirección de red
      const end = broadcastOctets[3] - 1; // Excluir broadcast

      return {
        start: Math.max(1, start),
        end: Math.min(254, end),
        totalHosts: end - start + 1,
      };
    } catch (error) {
      log.warn('Error calculating network range, using defaults:', error);
      return { start: 1, end: 254, totalHosts: 254 };
    }
  }

  /**
   * Escanea la red usando técnicas modernas
   */
  async scanNetwork(config: ModernScanConfig): Promise<ScanResult[]> {
    if (this.isScanning) {
      throw new Error('Ya hay un escaneo en progreso');
    }

    // Validar configuración
    this.validateConfig(config);

    this.isScanning = true;
    this.abortController = new AbortController();
    this.startTime = Date.now();
    this.scannedHosts = 0;

    const cacheKey = `${config.baseIp}_${config.startRange}_${config.endRange}`;
    const cached = this.cache.get<ScanResult[]>(cacheKey);

    if (cached) {
      this.emit('cache-hit', cacheKey);
      return cached;
    }

    try {
      const results = await this.performNetworkScan(config);
      this.cache.set(cacheKey, results);

      log.info(`Escaneo completado: ${results.length} hosts encontrados`);
      this.emit('scan-complete', { results, duration: Date.now() - this.startTime });

      return results;
    } catch (error) {
      log.error('Error en escaneo de red:', error);
      this.emit('scan-error', error);
      throw error;
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Realiza el escaneo real con concurrencia controlada
   */
  private async performNetworkScan(config: ModernScanConfig): Promise<ScanResult[]> {
    const total = config.endRange - config.startRange + 1;
    const results: ScanResult[] = [];

    // Crear lotes para controlar concurrencia
    const batchSize = Math.min(config.maxConcurrency, 20);

    for (let i = config.startRange; i <= config.endRange; i += batchSize) {
      if (this.abortController.signal.aborted) {
        throw new Error('Escaneo cancelado');
      }

      const batchEnd = Math.min(i + batchSize - 1, config.endRange);
      const batchPromises: Promise<ScanResult | null>[] = [];

      for (let j = i; j <= batchEnd; j++) {
        const ip = `${config.baseIp}.${j}`;
        batchPromises.push(this.scanSingleHost(ip, config));
      }

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        this.scannedHosts++;
        const progress = (this.scannedHosts / total) * 100;

        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
          this.emit('host-discovered', result.value);
        }

        this.emit('progress', {
          percentage: progress,
          current: this.scannedHosts,
          total,
          ip: `${config.baseIp}.${i + index}`,
          timeElapsed: Date.now() - this.startTime,
        });
      });

      // Pausa pequeña entre lotes para no saturar la red
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    return results;
  }

  /**
   * Escanea un host individual
   */
  private async scanSingleHost(ip: string, config: ModernScanConfig): Promise<ScanResult | null> {
    try {
      // Ping inicial
      const pingResult = await ping.promise.probe(ip, {
        timeout: config.timeout / 1000,
        extra: ['-c', '1'], // Un solo ping
      });

      if (!pingResult.alive) {
        return null;
      }

      const result: ExtendedScanResult = {
        ip,
        status: 'up',
        latency: typeof pingResult.time === 'number' ? pingResult.time : undefined,
        timestamp: Date.now(),
      };

      // Ejecutar tareas en paralelo
      const [hostname, openPorts, osInfo] = await Promise.allSettled([
        this.resolveHostname(ip),
        this.scanPorts(ip, config.ports, config.timeout),
        config.enableOsDetection ? this.detectOS(ip) : Promise.resolve(undefined),
      ]);

      if (hostname.status === 'fulfilled') {
        result.hostname = hostname.value;
      }

      if (openPorts.status === 'fulfilled') {
        result.ports = openPorts.value;

        if (config.enableServiceDetection && openPorts.value.length > 0) {
          result.services = await this.detectServices(ip, openPorts.value);
        }
      }

      if (osInfo.status === 'fulfilled' && osInfo.value) {
        result.os = osInfo.value;
      }

      return result;
    } catch (error) {
      log.debug(`Error escaneando ${ip}:`, error);
      return null;
    }
  }

  /**
   * Resuelve el hostname usando DNS
   */
  private async resolveHostname(ip: string): Promise<string | undefined> {
    try {
      const hostnames = await reverseLookup(ip);
      return hostnames?.[0];
    } catch {
      return undefined;
    }
  }

  /**
   * Escanea puertos usando sockets TCP
   */
  private async scanPorts(ip: string, ports: number[], timeout: number): Promise<number[]> {
    const openPorts: number[] = [];
    const portPromises = ports.map((port) => this.checkSinglePort(ip, port, timeout));

    const results = await Promise.allSettled(portPromises);

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        openPorts.push(ports[index]);
      }
    });

    return openPorts;
  }

  /**
   * Verifica si un puerto específico está abierto
   */
  private async checkSinglePort(ip: string, port: number, timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();

      const timer = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, timeout);

      socket.on('connect', () => {
        clearTimeout(timer);
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        clearTimeout(timer);
        resolve(false);
      });

      socket.connect(port, ip);
    });
  }

  /**
   * Detecta el sistema operativo basado en TTL
   */
  private async detectOS(ip: string): Promise<string | undefined> {
    try {
      const pingResult = await ping.promise.probe(ip, {
        timeout: 2,
        extra: ['-c', '1'],
      });

      if (pingResult.output) {
        const ttlMatch = /ttl[=:]?\s*(\d+)/i.exec(pingResult.output);
        if (ttlMatch) {
          const ttl = parseInt(ttlMatch[1], 10);

          // Heurística basada en TTL común
          if (ttl <= NETWORK_CONSTANTS.TTL_LINUX_UNIX) return 'Linux/Unix';
          if (ttl <= NETWORK_CONSTANTS.TTL_WINDOWS) return 'Windows';
          if (ttl <= NETWORK_CONSTANTS.TTL_SOLARIS_AIX) return 'Solaris/AIX';
        }
      }
    } catch {
      // Ignorar errores
    }

    return undefined;
  }

  /**
   * Detecta servicios básicos en puertos abiertos
   */
  private async detectServices(
    ip: string,
    ports: number[],
  ): Promise<Array<{ port: number; name: string }>> {
    return ports.map((port) => ({
      port,
      name: SERVICE_NAMES[port] || 'Unknown',
    }));
  }

  /**
   * Valida la configuración de escaneo
   */
  private validateConfig(config: ModernScanConfig): void {
    try {
      ipaddr.process(config.baseIp + '.1');
    } catch {
      throw new Error(`IP base inválida: ${config.baseIp}`);
    }

    if (config.startRange < 1 || config.startRange > 254) {
      throw new Error('Rango inicial debe estar entre 1 y 254');
    }

    if (config.endRange < 1 || config.endRange > 254) {
      throw new Error('Rango final debe estar entre 1 y 254');
    }

    if (config.startRange > config.endRange) {
      throw new Error('Rango inicial no puede ser mayor que el final');
    }

    if (!Array.isArray(config.ports) || config.ports.length === 0) {
      throw new Error('Debe especificar al menos un puerto');
    }

    const invalidPorts = config.ports.filter((port) => port < 1 || port > 65535);
    if (invalidPorts.length > 0) {
      throw new Error(`Puertos inválidos: ${invalidPorts.join(', ')}`);
    }
  }

  /**
   * Cancela el escaneo actual
   */
  cancelScan(): void {
    if (this.isScanning) {
      this.abortController.abort();
      log.info('Escaneo cancelado por el usuario');
      this.emit('scan-cancelled');
    }
  }

  /**
   * Obtiene estadísticas del caché
   */
  getCacheStats(): object {
    return this.cache.getStats();
  }

  /**
   * Limpia el caché
   */
  clearCache(): void {
    this.cache.flushAll();
    log.info('Caché limpiado');
  }
}

export default ModernNetworkScanner;
