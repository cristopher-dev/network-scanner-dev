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
