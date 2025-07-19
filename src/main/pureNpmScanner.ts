import { EventEmitter } from 'events';
import ping from 'ping';
import net from 'net';

export interface IScanResult {
  ip: string;
  status: 'up' | 'down';
  ports?: number[];
}

export class PureNpmScanner extends EventEmitter {
  private isScanning = false;
  private scanTimeout = 2000;
  private concurrencyLimit = 10;

  async scanNetwork(
    baseIp: string = '192.168.1',
    startRange: number = 1,
    endRange: number = 254,
    ports: number[] = [80, 443],
  ): Promise<IScanResult[]> {
    if (this.isScanning) throw new Error('Scan already in progress');
    this.isScanning = true;
    const results: IScanResult[] = [];
    try {
      const tasks = [];
      for (let i = startRange; i <= endRange; i++) {
        const ip = `${baseIp}.${i}`;
        tasks.push(() => this.scanHost(ip, ports));
      }
      for (let i = 0; i < tasks.length; i += this.concurrencyLimit) {
        const batch = tasks.slice(i, i + this.concurrencyLimit);
        const batchResults = await Promise.all(batch.map((t) => t()));
        for (const r of batchResults) if (r) results.push(r);
      }
      return results;
    } finally {
      this.isScanning = false;
    }
  }

  private async scanHost(ip: string, ports: number[]): Promise<IScanResult | null> {
    try {
      const pingResult = await ping.promise.probe(ip, { timeout: this.scanTimeout / 1000 });
      if (!pingResult.alive) return null;
      const openPorts: number[] = [];
      await Promise.all(
        ports.map(async (port) => {
          if (await this.checkPort(ip, port)) openPorts.push(port);
        }),
      );
      return { ip, status: 'up', ports: openPorts };
    } catch {
      return null;
    }
  }

  private async checkPort(ip: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timer = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, this.scanTimeout / 2);
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
}

export default PureNpmScanner;
