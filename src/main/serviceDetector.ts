export class ServiceDetector {
  async detectServices(ip: string, ports: number[]): Promise<{ port: number; name: string }[]> {
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
}
