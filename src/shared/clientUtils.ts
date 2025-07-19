import { NETWORK_CONSTANTS, NETWORK_CONFIGS } from './constants';

export function isPrivateIP(ip: string): boolean {
  return /^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(ip);
}

export function isValidPort(port: number): boolean {
  return (
    Number.isInteger(port) &&
    port >= NETWORK_CONSTANTS.PORT_MIN &&
    port <= NETWORK_CONSTANTS.PORT_MAX
  );
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

  if (
    config.startRange < NETWORK_CONSTANTS.IP_RANGE_MIN ||
    config.startRange > NETWORK_CONSTANTS.IP_RANGE_MAX
  ) {
    errors.push(
      `Rango de inicio debe estar entre ${NETWORK_CONSTANTS.IP_RANGE_MIN} y ${NETWORK_CONSTANTS.IP_RANGE_MAX}`,
    );
  }

  if (
    config.endRange < NETWORK_CONSTANTS.IP_RANGE_MIN ||
    config.endRange > NETWORK_CONSTANTS.IP_RANGE_MAX
  ) {
    errors.push(
      `Rango final debe estar entre ${NETWORK_CONSTANTS.IP_RANGE_MIN} y ${NETWORK_CONSTANTS.IP_RANGE_MAX}`,
    );
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
  return Math.ceil(
    (totalScans * (config.timeout || NETWORK_CONSTANTS.DEFAULT_SCAN_TIMEOUT)) /
      1000 /
      (config.batchSize || NETWORK_CONSTANTS.DEFAULT_BATCH_SIZE),
  );
}

export function formatEstimatedTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

export function getCommonNetworkConfigs() {
  return NETWORK_CONFIGS;
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
