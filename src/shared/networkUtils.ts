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
