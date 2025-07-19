import { networkInterfaces } from 'os';
import log from 'electron-log';
import systeminformation from 'systeminformation';
import { Netmask } from 'netmask';
import * as ipaddr from 'ipaddr.js';

export interface ModernNetworkInfo {
  baseIp: string;
  interface: string;
  address: string;
  netmask: string;
  cidr?: string;
  gateway?: string;
  type: string;
  speed?: number;
  duplex?: string;
  mtu?: number;
}

export class ModernNetworkDetector {
  /**
   * Detecta automáticamente todas las interfaces de red usando systeminformation
   */
  static async detectAllNetworkInterfaces(): Promise<ModernNetworkInfo[]> {
    try {
      const [networkInterfaces, networkStats, networkConnections] = await Promise.all([
        systeminformation.networkInterfaces(),
        systeminformation.networkStats(),
        systeminformation.networkConnections(),
      ]);

      const defaultGateway = await systeminformation.networkGatewayDefault();

      const results: ModernNetworkInfo[] = [];

      for (const iface of networkInterfaces) {
        if (iface.internal || !iface.ip4 || !this.isPrivateIP(iface.ip4)) {
          continue;
        }

        // Buscar estadísticas correspondientes
        const stats = networkStats.find((stat) => stat.iface === iface.iface);

        const networkInfo: ModernNetworkInfo = {
          baseIp: this.extractBaseIp(iface.ip4),
          interface: iface.iface,
          address: iface.ip4,
          netmask: iface.ip4subnet,
          cidr: this.calculateCIDR(iface.ip4subnet),
          gateway: defaultGateway || undefined,
          type: iface.type || 'Unknown',
          speed: iface.speed || undefined,
          duplex: iface.duplex || undefined,
          mtu: iface.mtu || undefined,
        };

        results.push(networkInfo);
      }

      log.info(`Detectadas ${results.length} interfaces de red válidas`);
      return results;
    } catch (error) {
      log.error('Error detectando interfaces de red:', error);
      return [];
    }
  }

  /**
   * Detecta la interfaz de red activa primaria
   */
  static async detectPrimaryNetworkInterface(): Promise<ModernNetworkInfo | null> {
    try {
      const interfaces = await this.detectAllNetworkInterfaces();

      if (interfaces.length === 0) {
        return null;
      }

      // Priorizar por tipo de interfaz
      const priorityOrder = ['Ethernet', 'Wireless', 'WiFi'];

      for (const priority of priorityOrder) {
        const iface = interfaces.find((i) => i.type.toLowerCase().includes(priority.toLowerCase()));
        if (iface) {
          log.info(`Interfaz primaria detectada: ${iface.interface} (${iface.type})`);
          return iface;
        }
      }

      // Si no hay coincidencia por tipo, devolver la primera
      log.info(`Interfaz primaria por defecto: ${interfaces[0].interface}`);
      return interfaces[0];
    } catch (error) {
      log.error('Error detectando interfaz primaria:', error);
      return null;
    }
  }

  /**
   * Obtiene estadísticas de red en tiempo real
   */
  static async getNetworkStatistics(): Promise<{
    interfaces: Array<{
      name: string;
      rxBytes: number;
      txBytes: number;
      rxSpeed: number;
      txSpeed: number;
      errors: number;
    }>;
  }> {
    try {
      const stats = await systeminformation.networkStats();

      return {
        interfaces: stats.map((stat) => ({
          name: stat.iface,
          rxBytes: stat.rx_bytes || 0,
          txBytes: stat.tx_bytes || 0,
          rxSpeed: stat.rx_sec || 0,
          txSpeed: stat.tx_sec || 0,
          errors: (stat.rx_errors || 0) + (stat.tx_errors || 0),
        })),
      };
    } catch (error) {
      log.error('Error obteniendo estadísticas de red:', error);
      return { interfaces: [] };
    }
  }

  /**
   * Detecta la información del gateway por defecto
   */
  static async getDefaultGatewayInfo(): Promise<{
    gateway: string;
    interface: string;
  } | null> {
    try {
      const gatewayInfo = await systeminformation.networkGatewayDefault();

      if (typeof gatewayInfo === 'string') {
        return {
          gateway: gatewayInfo,
          interface: 'Unknown',
        };
      }

      return null;
    } catch (error) {
      log.error('Error detectando gateway:', error);
      return null;
    }
  }

  /**
   * Calcula el rango de escaneo óptimo basado en la configuración de red
   */
  static calculateOptimalScanRange(
    address: string,
    netmask: string,
  ): { start: number; end: number; totalHosts: number; recommendation: string } {
    try {
      const network = new Netmask(`${address}/${netmask}`);
      const baseIp = network.base;
      const broadcast = network.broadcast;

      const baseOctets = baseIp.split('.').map(Number);
      const broadcastOctets = broadcast.split('.').map(Number);

      const start = baseOctets[3] + 1;
      const end = broadcastOctets[3] - 1;
      const totalHosts = end - start + 1;

      let recommendation = '';
      if (totalHosts <= 50) {
        recommendation = 'Rango pequeño: escaneo rápido completo recomendado';
      } else if (totalHosts <= 254) {
        recommendation = 'Rango estándar: escaneo con timeout medio recomendado';
      } else {
        recommendation = 'Rango grande: considerar escaneo por lotes o timeout alto';
      }

      return {
        start: Math.max(1, start),
        end: Math.min(254, end),
        totalHosts,
        recommendation,
      };
    } catch (error) {
      log.warn('Error calculando rango de escaneo:', error);
      return {
        start: 1,
        end: 254,
        totalHosts: 254,
        recommendation: 'Rango por defecto debido a error en cálculo',
      };
    }
  }

  /**
   * Detecta si hay múltiples redes disponibles
   */
  static async detectMultipleNetworks(): Promise<{
    networks: ModernNetworkInfo[];
    activeNetwork: ModernNetworkInfo | null;
    recommendations: string[];
  }> {
    try {
      const networks = await this.detectAllNetworkInterfaces();
      const activeNetwork = await this.detectPrimaryNetworkInterface();

      const recommendations: string[] = [];

      if (networks.length === 0) {
        recommendations.push('No se detectaron redes válidas');
      } else if (networks.length === 1) {
        recommendations.push('Red única detectada, configuración automática disponible');
      } else {
        recommendations.push(`${networks.length} redes detectadas, seleccione la red objetivo`);
        recommendations.push('Se recomienda escanear redes una por vez para mejor rendimiento');
      }

      return {
        networks,
        activeNetwork,
        recommendations,
      };
    } catch (error) {
      log.error('Error detectando múltiples redes:', error);
      return {
        networks: [],
        activeNetwork: null,
        recommendations: ['Error detectando configuración de red'],
      };
    }
  }

  /**
   * Monitorea cambios en la configuración de red
   */
  static async monitorNetworkChanges(
    callback: (networks: ModernNetworkInfo[]) => void,
    intervalMs: number = 5000,
  ): Promise<() => void> {
    let lastNetworksJson = '';

    const checkChanges = async () => {
      try {
        const currentNetworks = await this.detectAllNetworkInterfaces();
        const currentJson = JSON.stringify(
          currentNetworks.map((n) => ({
            interface: n.interface,
            address: n.address,
            gateway: n.gateway,
          })),
        );

        if (currentJson !== lastNetworksJson) {
          lastNetworksJson = currentJson;
          callback(currentNetworks);
          log.info('Cambio de configuración de red detectado');
        }
      } catch (error) {
        log.error('Error monitoreando cambios de red:', error);
      }
    };

    const interval = setInterval(checkChanges, intervalMs);

    // Verificación inicial
    checkChanges();

    // Retornar función de limpieza
    return () => {
      clearInterval(interval);
      log.info('Monitoreo de red detenido');
    };
  }

  /**
   * Utilidades privadas
   */
  private static isPrivateIP(ip: string): boolean {
    try {
      const addr = ipaddr.process(ip);
      const range = addr.range();
      return range === 'private' || range === 'loopback';
    } catch {
      return false;
    }
  }

  private static extractBaseIp(ipAddress: string): string {
    const parts = ipAddress.split('.');
    return `${parts[0]}.${parts[1]}.${parts[2]}`;
  }

  private static calculateCIDR(netmask: string): string {
    try {
      const mask = new Netmask(`0.0.0.0/${netmask}`);
      return `/${mask.bitmask}`;
    } catch {
      // Fallback para máscaras comunes
      switch (netmask) {
        case '255.255.255.0':
          return '/24';
        case '255.255.0.0':
          return '/16';
        case '255.0.0.0':
          return '/8';
        default:
          return '/24';
      }
    }
  }

  /**
   * Valida la configuración de red propuesta
   */
  static async validateNetworkConfig(config: {
    baseIp: string;
    startRange: number;
    endRange: number;
  }): Promise<{
    isValid: boolean;
    warnings: string[];
    suggestions: string[];
  }> {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let isValid = true;

    try {
      // Validar IP base
      ipaddr.process(config.baseIp + '.1');
    } catch {
      isValid = false;
      warnings.push(`IP base inválida: ${config.baseIp}`);
    }

    // Validar rangos
    if (config.startRange < 1 || config.startRange > 254) {
      isValid = false;
      warnings.push('Rango inicial debe estar entre 1 y 254');
    }

    if (config.endRange < 1 || config.endRange > 254) {
      isValid = false;
      warnings.push('Rango final debe estar entre 1 y 254');
    }

    if (config.startRange > config.endRange) {
      isValid = false;
      warnings.push('Rango inicial no puede ser mayor que el final');
    }

    // Sugerencias
    const totalIps = config.endRange - config.startRange + 1;
    if (totalIps > 100) {
      suggestions.push(
        `Escaneando ${totalIps} IPs - considere usar un rango menor para mayor velocidad`,
      );
    }

    // Verificar si la IP está en las redes locales
    try {
      const networks = await this.detectAllNetworkInterfaces();
      const matchingNetwork = networks.find((n) => n.baseIp === config.baseIp);

      if (!matchingNetwork) {
        warnings.push(`La IP ${config.baseIp} no coincide con ninguna red local detectada`);
        suggestions.push(`Redes disponibles: ${networks.map((n) => n.baseIp).join(', ')}`);
      }
    } catch (error) {
      log.warn('No se pudo verificar red local:', error);
    }

    return { isValid, warnings, suggestions };
  }
}

export default ModernNetworkDetector;
