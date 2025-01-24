import ping from 'ping';
import dns from 'dns';
import { promisify } from 'util';

export class NetworkScanner {
  private lookup = promisify(dns.lookup);

  async pingHost(ip: string, timeout: number) {
    return await ping.promise.probe(ip, {
      timeout: timeout / 1000,
      min_reply: 1,
    });
  }

  async getMacAddress(ip: string): Promise<string | undefined> {
    // Implementación pendiente - requiere acceso a nivel de sistema
    return undefined;
  }

  async getVendorFromMac(mac?: string): Promise<string | undefined> {
    if (!mac) return undefined;
    // Implementación pendiente - requiere base de datos de fabricantes
    return undefined;
  }

  async detectOS(ip: string, timeout: number): Promise<string | undefined> {
    try {
      const ttl = await this.getTTL(ip, timeout);
      if (ttl === 128) return 'Windows';
      if (ttl === 64) return 'Linux/Unix';
      if (ttl === 254) return 'Solaris/AIX';
      return undefined;
    } catch {
      return undefined;
    }
  }

  private async getTTL(ip: string, timeout: number): Promise<number | undefined> {
    try {
      const result = await ping.promise.probe(ip, {
        timeout: timeout / 1000,
      });
      const ttl = parseInt(result.output.match(/ttl=(\d+)/i)?.[1] || '');
      return isNaN(ttl) ? undefined : ttl;
    } catch {
      return undefined;
    }
  }
}
