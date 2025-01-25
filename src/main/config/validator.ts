interface ScanConfigValidation {
  isValid: boolean;
  errors: string[];
}

class ConfigValidator {
  validateScanConfig(config: {
    timeout: number;
    baseIp: string;
    portRange: number[];
  }): ScanConfigValidation {
    const errors: string[] = [];
    if (config.timeout <= 0) errors.push('Timeout must be greater than 0');
    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(config.baseIp)) errors.push('Invalid base IP format');
    if (config.portRange.some((port) => port < 0 || port > 65535))
      errors.push('Port range must be between 0 and 65535');

    return { isValid: errors.length === 0, errors };
  }
}

export { ScanConfigValidation, ConfigValidator };
