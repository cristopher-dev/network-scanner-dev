import dns from 'dns';
import { promisify } from 'util';

export class HostResolver {
  private lookup = promisify(dns.lookup);

  async resolveHostname(ip: string): Promise<string | undefined> {
    try {
      const { address } = await this.lookup(ip);
      return address;
    } catch {
      return undefined;
    }
  }
}
