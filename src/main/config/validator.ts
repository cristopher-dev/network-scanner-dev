import { z } from 'zod';

const ScanConfigSchema = z.object({
  timeout: z.number().positive('Timeout must be greater than 0'),
  baseIp: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/, 'Invalid base IP format'),
  portRange: z
    .array(z.number().min(0).max(65535))
    .refine(
      (ports) => ports.every((port) => port >= 0 && port <= 65535),
      'Port range must be between 0 and 65535',
    ),
});

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
    try {
      ScanConfigSchema.parse(config);
      return { isValid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isValid: false,
          errors: error.issues.map((err) => err.message),
        };
      }
      return {
        isValid: false,
        errors: ['Unknown validation error'],
      };
    }
  }
}

export type { ScanConfigValidation };
export { ConfigValidator };
