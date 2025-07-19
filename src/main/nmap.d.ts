declare module 'node-nmap' {
  export interface NmapScanOptions {
    range?: string[];
    target?: string;
    ports?: string;
    flags?: string[];
    timeout?: number;
    verbose?: boolean;
  }

  export interface NmapHost {
    ip: string;
    hostname?: string;
    status: 'up' | 'down';
    mac?: string;
    openPorts?: Array<{
      port: number;
      service: string;
      state: string;
    }>;
    vendor?: string;
    osNmap?: string;
  }

  export interface NmapResult {
    hosts: NmapHost[];
    runtime: {
      time: number;
      timestr: string;
    };
  }

  export class NmapScan {
    constructor(options: NmapScanOptions);
    startScan(): Promise<NmapResult>;
    scanComplete(callback: (error: Error | null, result?: NmapResult) => void): void;
    scanTimeout(callback: (error: Error) => void): void;
    scanProgress(callback: (data: any) => void): void;
  }

  export function nodenmap(options: NmapScanOptions): NmapScan;
}
