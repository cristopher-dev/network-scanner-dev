/**
 * Utilidades para la configuración y validación de red - Versión mejorada
 */
import * as ipaddr from 'ipaddr.js';
import { Netmask } from 'netmask';

// Interfaces para mejor tipado
export interface NetworkValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
  estimatedTime?: number;
}

export interface ScanConfiguration {
  baseIp: string;
  startRange: number;
  endRange: number;
  ports: number[];
  timeout: number;
  batchSize: number;
  maxConcurrency?: number;
}

export class NetworkUtils {
  /**
   * Valida la configuración de escaneo de red
   */
  static validateScanConfig(config: {
    baseIp: string;
    startRange: number;
    endRange: number;
    ports: number[];
    timeout: number;
    batchSize: number;
  }): NetworkValidationResult {
    const result: NetworkValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Validar IP base usando ipaddr.js
    try {
      const ip = ipaddr.process(`${config.baseIp}.1`);
      const range = ip.range();
      if (range && !['private', 'loopback'].includes(range)) {
        result.warnings.push('La IP especificada no parece ser una IP privada');
      }
    } catch (error) {
      console.warn('Error validating IP:', error);
      result.errors.push('La IP base no es válida');
      result.isValid = false;
    }

    // Validar rangos
    if (config.startRange < 1 || config.startRange > 254) {
      result.errors.push('El rango de inicio debe estar entre 1 y 254');
      result.isValid = false;
    }

    if (config.endRange < 1 || config.endRange > 254) {
      result.errors.push('El rango final debe estar entre 1 y 254');
      result.isValid = false;
    }

    if (config.startRange > config.endRange) {
      result.errors.push('El rango de inicio no puede ser mayor que el rango final');
      result.isValid = false;
    }

    // Validar puertos
    if (!Array.isArray(config.ports) || config.ports.length === 0) {
      result.errors.push('Debe especificar al menos un puerto para escanear');
      result.isValid = false;
    } else {
      const invalidPorts = config.ports.filter((port) => !this.isValidPort(port));
      if (invalidPorts.length > 0) {
        result.errors.push(`Puertos inválidos: ${invalidPorts.join(', ')}`);
        result.isValid = false;
      }
    }

    // Validar timeout
    if (config.timeout < 100 || config.timeout > 30000) {
      result.errors.push('El timeout debe estar entre 100ms y 30000ms');
      result.isValid = false;
    }

    // Validar batch size
    if (config.batchSize < 1 || config.batchSize > 100) {
      result.errors.push('El tamaño de lote debe estar entre 1 y 100');
      result.isValid = false;
    }

    // Advertencias
    const totalIPs = config.endRange - config.startRange + 1;
    if (totalIPs > 100) {
      result.warnings.push(`Escaneando ${totalIPs} IPs. Esto puede tomar tiempo.`);
    }

    if (config.ports.length > 20) {
      result.warnings.push(
        `Escaneando ${config.ports.length} puertos por IP. Esto puede tomar tiempo.`,
      );
    }

    if (config.timeout < 1000) {
      result.warnings.push('Un timeout bajo puede causar falsos negativos en redes lentas.');
    }

    return result;
  }

  /**
   * Valida si una IP base tiene el formato correcto usando ipaddr.js
   */
  static isValidBaseIp(baseIp: string): boolean {
    try {
      const testIp = `${baseIp}.1`;
      ipaddr.process(testIp);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Valida si un puerto es válido
   */
  static isValidPort(port: number): boolean {
    return Number.isInteger(port) && port >= 1 && port <= 65535;
  }

  /**
   * Convierte un string de puertos separados por comas a un array de números
   */
  static parsePortsString(portsString: string): number[] {
    return portsString
      .split(',')
      .map((p) => parseInt(p.trim(), 10))
      .filter((p) => !isNaN(p) && this.isValidPort(p));
  }

  /**
   * Calcula el tiempo estimado de escaneo
   */
  static estimateScanTime(config: {
    startRange: number;
    endRange: number;
    ports: number[];
    timeout: number;
    batchSize: number;
  }): number {
    const totalIPs = config.endRange - config.startRange + 1;
    const batches = Math.ceil(totalIPs / config.batchSize);

    // Estimación conservadora: timeout * puertos por IP * número de lotes
    return (config.timeout * config.ports.length * batches) / 1000; // en segundos
  }

  /**
   * Formatea el tiempo estimado en una cadena legible
   */
  static formatEstimatedTime(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)} segundos`;
    } else if (seconds < 3600) {
      const minutes = Math.round(seconds / 60);
      return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
    } else {
      const hours = Math.round(seconds / 3600);
      return `${hours} hora${hours > 1 ? 's' : ''}`;
    }
  }

  /**
   * Obtiene la configuración de red más común para el entorno
   */
  static getCommonNetworkConfigs(): Array<{
    name: string;
    baseIp: string;
    description: string;
  }> {
    return [
      {
        name: 'Red doméstica típica',
        baseIp: '192.168.1',
        description: 'La configuración más común en routers domésticos',
      },
      {
        name: 'Red corporativa',
        baseIp: '192.168.0',
        description: 'Común en entornos corporativos pequeños',
      },
      {
        name: 'Red TP-Link/D-Link',
        baseIp: '192.168.0',
        description: 'Configuración predeterminada de algunos routers',
      },
      {
        name: 'Red Netgear/Linksys',
        baseIp: '192.168.1',
        description: 'Configuración predeterminada de algunos routers',
      },
      {
        name: 'Red empresarial Clase A',
        baseIp: '10.0.0',
        description: 'Redes empresariales grandes',
      },
      {
        name: 'Red VPN/Empresarial',
        baseIp: '172.16.0',
        description: 'Común en VPNs y redes empresariales',
      },
    ];
  }
}
