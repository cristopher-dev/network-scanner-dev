import * as si from 'systeminformation';

interface ScanMetrics {
  scanDuration: number;
  devicesFound: number;
  successRate: number;
  memoryUsage: number;
  cpuUsage: number;
  networkUtilization: number;
}

class PerformanceMonitor {
  async trackScanMetrics(
    scanMetrics: Omit<ScanMetrics, 'memoryUsage' | 'cpuUsage' | 'networkUtilization'>,
  ): Promise<void> {
    try {
      // Obtener métricas del sistema usando systeminformation
      const [memInfo, cpuData, networkStats] = await Promise.all([
        si.mem(),
        si.currentLoad(),
        si.networkStats(),
      ]);

      const metrics: ScanMetrics = {
        ...scanMetrics,
        memoryUsage: (memInfo.used / memInfo.total) * 100,
        cpuUsage: cpuData.currentLoad,
        networkUtilization:
          networkStats.length > 0 ? networkStats[0].rx_bytes + networkStats[0].tx_bytes : 0,
      };

      console.log('Scan Metrics:', metrics);

      // Aquí podrías enviar las métricas a un servicio de monitoreo
      // o guardarlas en una base de datos local
    } catch (error) {
      console.error('Error al obtener métricas del sistema:', error);
    }
  }

  async getSystemInfo(): Promise<{
    os: si.Systeminformation.OsData;
    system: si.Systeminformation.SystemData;
    cpu: si.Systeminformation.CpuData;
  }> {
    const [osInfo, systemInfo, cpuInfo] = await Promise.all([si.osInfo(), si.system(), si.cpu()]);

    return {
      os: osInfo,
      system: systemInfo,
      cpu: cpuInfo,
    };
  }
}

export type { ScanMetrics };
export { PerformanceMonitor };
