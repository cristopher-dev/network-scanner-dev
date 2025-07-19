export interface ModernScanConfig {
  baseIp: string;
  startRange: number;
  endRange: number;
  ports: number[];
  timeout: number;
  maxConcurrency: number;
  enableOsDetection: boolean;
  enableServiceDetection: boolean;
}

export interface ExtendedScanResult extends ScanResult {
  services?: Array<{ port: number; name: string }>;
  os?: string;
}

export interface NetworkInterface {
  interface: string;
  ip: string;
  netmask: string;
  gateway?: string;
  type: string;
}
/**
 * Tipos compartidos entre el proceso principal y el renderer
 */

export interface ScanResult {
  ip: string;
  status: 'up' | 'down';
  hostname?: string;
  deviceName?: string;
  vendor?: string;
  latency?: number;
  ports?: number[];
  timestamp: number;
}

export interface NetworkConfig {
  baseIp: string;
  startRange: number;
  endRange: number;
  gateway: string;
}

export interface AvailableNetwork {
  name: string;
  type: 'Ethernet' | 'Wi-Fi' | 'Unknown';
  baseIp: string;
  gateway: string;
  isActive: boolean;
}

export interface DeviceInfo {
  ip: string;
  hostname?: string;
  deviceName?: string;
  vendor?: string;
  macAddress?: string;
  netbiosName?: string;
  description?: string;
}

export interface IScanResult {
  ip: string;
  hostname?: string;
  mac?: string;
  ports?: number[];
  os?: string;
  status: 'up' | 'down';
  latency?: number;
  services?: { port: number; name: string }[];
  vendor?: string;
}

export interface IScanProgress {
  current: number;
  total: number;
  ip: string;
  timeElapsed: number;
  estimatedTimeRemaining: number;
  speed: number;
}

export class ScanError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = 'ScanError';
  }
}
