import ping from 'ping';
import { EventEmitter } from 'events';
import net from 'net';
import dns from 'dns';
import { promisify } from 'util';
import { HostnameResolver } from './hostnameResolver';
import { ScanResult } from '../shared/types';

const lookup = promisify(dns.lookup);

export type { ScanResult as BasicScanResult };

export class BasicNetworkScanner extends EventEmitter {
  private isScanning = false;
  private abortController = new AbortController();

  async scanNetwork(
    baseIp: string,
    startRange: number,
    endRange: number,
    ports: number[] = [80, 443, 22, 21, 25, 53],
    timeout: number = 2000,
  ): Promise<ScanResult[]> {
    if (this.isScanning) {
      throw new Error('Ya hay un escaneo en progreso');
    }

    this.isScanning = true;
    this.abortController = new AbortController();

    const results: ScanResult[] = [];
    const total = endRange - startRange + 1;
    let completed = 0;

    try {
      const promises: Promise<ScanResult | null>[] = [];

      for (let i = startRange; i <= endRange; i++) {
        const ip = `${baseIp}.${i}`;
        promises.push(this.scanHost(ip, ports, timeout));
      }

      // Procesar en lotes para evitar sobrecarga
      const batchSize = 20;
      for (let i = 0; i < promises.length; i += batchSize) {
        const batch = promises.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch);

        for (const result of batchResults) {
          if (result) {
            results.push(result);
          }
          completed++;
          const progress = (completed / total) * 100;
          this.emit('progress', { percentage: progress, current: completed, total });
        }

        // Pequeña pausa entre lotes para no saturar la red
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      return results;
    } finally {
      this.isScanning = false;
    }
  }

  private async scanHost(ip: string, ports: number[], timeout: number): Promise<ScanResult | null> {
    try {
      // Hacer ping primero
      const pingResult = await ping.promise.probe(ip, { timeout: timeout / 1000 });

      if (!pingResult.alive) {
        return null;
      }

      const result: ScanResult = {
        ip,
        status: 'up',
        latency: typeof pingResult.time === 'number' ? pingResult.time : undefined,
        timestamp: Date.now(),
      };

      // Intentar resolver hostname y obtener información del dispositivo
      try {
        const deviceInfo = await HostnameResolver.resolveHostname(ip);
        result.hostname = deviceInfo.hostname;
        result.deviceName = deviceInfo.description;
        result.vendor = deviceInfo.vendor;
      } catch {
        // Intentar resolución DNS básica como fallback
        try {
          const resolved = await lookup(ip);
          result.hostname = resolved.address !== ip ? resolved.address : undefined;
        } catch {
          // Ignorar errores de resolución DNS
        }
      }

      // Escanear puertos básico
      const openPorts: number[] = [];
      const portPromises = ports.map((port) => this.checkPort(ip, port, timeout));
      const portResults = await Promise.allSettled(portPromises);

      portResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          openPorts.push(ports[index]);
        }
      });

      result.ports = openPorts;
      return result;
    } catch (error) {
      console.error(`Error escaneando ${ip}:`, error);
      return null;
    }
  }

  private async checkPort(ip: string, port: number, timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();

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
        resolve(false);
      });
    });
  }

  cancelScan(): void {
    this.abortController.abort();
    this.isScanning = false;
  }

  isCurrentlyScanning(): boolean {
    return this.isScanning;
  }
}
