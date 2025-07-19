import dns from 'dns';
import { exec } from 'child_process';
import { promisify } from 'util';
import log from 'electron-log';

const execAsync = promisify(exec);
const reverseLookup = promisify(dns.reverse);

export interface DeviceInfo {
  ip: string;
  hostname?: string;
  macAddress?: string;
  vendor?: string;
  netbiosName?: string;
  description?: string;
}

export class HostnameResolver {
  static async resolveHostname(ip: string): Promise<DeviceInfo> {
    const device: DeviceInfo = { ip };
    try {
      device.hostname = (await this.dnsReverseLookup(ip)) || undefined;
      if (process.platform === 'win32') {
        device.netbiosName = (await this.getNetBIOSName(ip)) || undefined;
        if (!device.hostname && device.netbiosName) device.hostname = device.netbiosName;
      }
      const macInfo = await this.getMacAddressFromARP(ip);
      if (macInfo) {
        device.macAddress = macInfo.mac;
        device.vendor = macInfo.vendor;
      }
      const mdnsName = await this.getMDNSName(ip);
      if (mdnsName) {
        device.description = mdnsName;
        if (!device.hostname) device.hostname = mdnsName;
      }
      if (!device.hostname && !device.netbiosName)
        device.description = await this.generateDeviceDescription(ip, device);
      return device;
    } catch (error) {
      log.error(`Error resolviendo hostname para ${ip}:`, error);
      return device;
    }
  }

  private static async dnsReverseLookup(ip: string): Promise<string | null> {
    try {
      const hostnames = await reverseLookup(ip);
      return hostnames?.[0] || null;
    } catch {
      return null;
    }
  }

  private static async getNetBIOSName(ip: string): Promise<string | null> {
    try {
      const { stdout } = await execAsync(`nbtstat -A ${ip}`, { timeout: 5000 });
      for (const line of stdout.split('\n')) {
        if (line.includes('<00>') && line.includes('UNIQUE')) {
          const name = line.trim().split(/\s+/)[0];
          if (name && name !== ip && !name.includes('.')) return name;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  private static async getMacAddressFromARP(
    ip: string,
  ): Promise<{ mac: string; vendor?: string } | null> {
    try {
      const mac = await this.getMacFromNodeArp(ip);
      if (mac) return { mac, vendor: (await this.getVendorFromMac(mac)) || undefined };
      return await this.getMacAddressFromARPFallback(ip);
    } catch (error) {
      log.warn('Error obteniendo MAC desde ARP', { ip, error });
      return null;
    }
  }

  private static async getMacFromNodeArp(ip: string): Promise<string | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const arp = require('node-arp');
      return new Promise<string | null>((resolve) => {
        arp.getMAC(ip, (err: Error | null, mac?: string) => resolve(err || !mac ? null : mac));
      });
    } catch (error) {
      log.warn('node-arp falló', { ip, error });
      return null;
    }
  }

  private static async getMacAddressFromARPFallback(
    ip: string,
  ): Promise<{ mac: string; vendor?: string } | null> {
    try {
      let command = process.platform === 'win32' ? `arp -a ${ip}` : `arp -n ${ip}`;
      const { stdout } = await execAsync(command, { timeout: 3000 });
      let match;
      if (process.platform === 'win32') {
        match =
          /([a-fA-F0-9]{2}-[a-fA-F0-9]{2}-[a-fA-F0-9]{2}-[a-fA-F0-9]{2}-[a-fA-F0-9]{2}-[a-fA-F0-9]{2})/.exec(
            stdout,
          );
        if (match) {
          const mac = match[1].replace(/-/g, ':');
          return { mac, vendor: (await this.getVendorFromMac(mac)) || undefined };
        }
      } else {
        match =
          /([a-fA-F0-9]{2}:[a-fA-F0-9]{2}:[a-fA-F0-9]{2}:[a-fA-F0-9]{2}:[a-fA-F0-9]{2}:[a-fA-F0-9]{2})/.exec(
            stdout,
          );
        if (match) {
          const mac = match[1];
          return { mac, vendor: (await this.getVendorFromMac(mac)) || undefined };
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  private static async getMDNSName(ip: string): Promise<string | null> {
    try {
      const { stdout } = await execAsync(`ping -c 1 -W 1000 ${ip}`, { timeout: 3000 });
      const match = /PING ([^\s]+)/.exec(stdout);
      return match && match[1] !== ip ? match[1] : null;
    } catch {
      return null;
    }
  }

  private static async getVendorFromMac(mac: string): Promise<string | null> {
    try {
      const oui = mac.substring(0, 8).replace(/:/g, '').toUpperCase().substring(0, 6);
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const macLookup = require('mac-lookup');
        const vendor = await macLookup.lookup(mac);
        if (vendor) return vendor;
      } catch {}
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const ouiData = require('oui-data');
        const ouiEntry = ouiData.find(
          (entry: { oui: string; organization: string }) => entry.oui === oui,
        );
        if (ouiEntry) return ouiEntry.organization;
      } catch {}
      return null;
    } catch {
      return null;
    }
  }

  private static async generateDeviceDescription(ip: string, device: DeviceInfo): Promise<string> {
    try {
      if (ip.endsWith('.1') || ip.endsWith('.254')) return 'Router/Gateway';
      if (device.vendor) return this.getDeviceTypeByVendor(device.vendor);
      return 'Dispositivo de Red';
    } catch {
      return 'Dispositivo Desconocido';
    }
  }

  private static getDeviceTypeByVendor(vendor: string): string {
    const v = vendor.toLowerCase();
    if (v.includes('apple')) return 'Dispositivo Apple';
    if (v.includes('samsung')) return 'Dispositivo Samsung';
    if (v.includes('microsoft')) return 'Dispositivo Microsoft';
    if (v.includes('google')) return 'Dispositivo Google';
    if (v.includes('amazon')) return 'Dispositivo Amazon';
    if (v.includes('huawei') || v.includes('xiaomi')) return 'Dispositivo Móvil';
    if (v.includes('locally administered') || v.includes('private')) return 'Dispositivo Virtual';
    if (['tp-link', 'cisco', 'realtek', 'intel', 'belkin', 'netgear'].some((nv) => v.includes(nv)))
      return 'Dispositivo de Red';
    return `Dispositivo ${vendor}`;
  }

  static async resolveMultipleHostnames(ips: string[]): Promise<DeviceInfo[]> {
    try {
      const results = await Promise.allSettled(ips.map((ip) => this.resolveHostname(ip)));
      return results.map((r, i) => (r.status === 'fulfilled' ? r.value : { ip: ips[i] }));
    } catch {
      return ips.map((ip) => ({ ip }));
    }
  }
}
