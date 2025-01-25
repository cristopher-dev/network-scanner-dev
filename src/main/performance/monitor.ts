interface ScanMetrics {
  scanDuration: number;
  devicesFound: number;
  successRate: number;
  memoryUsage: number;
}

class PerformanceMonitor {
  trackScanMetrics(metrics: ScanMetrics): void {
    // Implementar lógica para registrar métricas de rendimiento
    console.log('Scan Metrics:', metrics);
  }
}

export { ScanMetrics, PerformanceMonitor };
