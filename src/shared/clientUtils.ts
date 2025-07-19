export function isPrivateIP(ip: string): boolean {
  return /^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(ip);
}

export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

export function parsePortsString(portsString: string): number[] {
  return portsString
    .split(',')
    .map((p) => parseInt(p.trim(), 10))
    .filter(isValidPort);
}

export function validateScanConfig(config: any): any {
  const errors: string[] = [];

  if (!config.baseIp || !config.baseIp.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
    errors.push('IP base inválida');
  }

  if (config.startRange < 1 || config.startRange > 254) {
    errors.push('Rango de inicio debe estar entre 1 y 254');
  }

  if (config.endRange < 1 || config.endRange > 254) {
    errors.push('Rango final debe estar entre 1 y 254');
  }

  if (config.startRange > config.endRange) {
    errors.push('Rango de inicio no puede ser mayor al final');
  }

  if (!config.ports || config.ports.length === 0) {
    errors.push('Debe especificar al menos un puerto');
  }

  return { isValid: errors.length === 0, errors };
}

export function estimateScanTime(config: any): number {
  const hostCount = config.endRange - config.startRange + 1;
  const portCount = config.ports?.length || 0;
  const totalScans = hostCount * portCount;
  return Math.ceil((totalScans * (config.timeout || 2000)) / 1000 / (config.batchSize || 50));
}

export function formatEstimatedTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

export function getCommonNetworkConfigs() {
  return [
    { name: '192.168.1.x', baseIp: '192.168.1', description: 'Red doméstica común' },
    { name: '192.168.0.x', baseIp: '192.168.0', description: 'Red doméstica alternativa' },
    { name: '10.0.0.x', baseIp: '10.0.0', description: 'Red empresarial' },
    { name: '172.16.0.x', baseIp: '172.16.0', description: 'Red privada clase B' },
  ];
}

export const NetworkUtils = {
  isPrivateIP,
  isValidPort,
  parsePortsString,
  validateScanConfig,
  estimateScanTime,
  formatEstimatedTime,
  getCommonNetworkConfigs,
};
