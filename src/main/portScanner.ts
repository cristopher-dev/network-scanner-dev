import Evilscan from 'evilscan';

export class PortScanner {
  async scanPorts(ip: string, ports: number[], timeout: number): Promise<number[]> {
    return new Promise((resolve) => {
      const openPorts: number[] = [];
      const scanner = new Evilscan({
        target: ip,
        port: ports.join(','),
        timeout: timeout,
        status: 'TROU',
      });

      scanner.on('result', (data: any) => {
        if (data.status === 'open') {
          openPorts.push(data.port);
        }
      });

      scanner.on('done', () => resolve(openPorts));
      scanner.run();
    });
  }
}
