import { nodenmap } from 'node-nmap';
import ping from 'ping';
import { IScanResult } from '../shared/types';
import { NETWORK_CONSTANTS } from '../shared/constants';

export async function scanHost(
  ip: string,
  ports: number[],
  scanTimeout = NETWORK_CONSTANTS.DEFAULT_SCAN_TIMEOUT,
): Promise<IScanResult | null> {
  try {
    const res = await ping.promise.probe(ip, { timeout: scanTimeout / 1000 });
    if (!res.alive) return null;
    return {
      ip,
      status: 'up',
      latency: typeof res.time === 'number' ? res.time : undefined,
      hostname: res.host,
      ports: [],
    };
  } catch {
    return null;
  }
}

export async function scanNetworkWithNmap(
  baseIp: string,
  startRange: number,
  endRange: number,
  ports: number[],
  scanTimeout = NETWORK_CONSTANTS.DEFAULT_SCAN_TIMEOUT,
): Promise<IScanResult[]> {
  const range = `${baseIp}.${startRange}-${endRange}`;

  const mapHostData = (h: any) => {
    const openPorts = h.openPorts || [];
    const filteredPorts = openPorts.filter((p: any) => p.state === 'open');
    const hostPorts = filteredPorts.map((p: any) => p.port);

    return {
      ip: h.ip,
      status: h.status,
      hostname: h.hostname,
      mac: h.mac,
      vendor: h.vendor,
      os: h.osNmap,
      ports: hostPorts,
      services: [],
      latency: undefined,
    };
  };

  return new Promise((resolve) => {
    const scanner = nodenmap({
      target: range,
      ports: ports.join(','),
      flags: ['-sS'],
      timeout: scanTimeout * 2,
    });

    scanner.scanComplete((err: any, result: any) => {
      if (err || !result?.hosts) return resolve([]);
      const hosts = result.hosts.map(mapHostData);
      resolve(hosts);
    });

    scanner.scanTimeout(() => resolve([]));
    scanner.startScan().catch(() => resolve([]));
  });
}
