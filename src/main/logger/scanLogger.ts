class ScanLogger {
  private logPath: string;

  constructor(logPath: string) {
    this.logPath = logPath;
  }

  logScanEvent(event: {
    type: 'start' | 'complete' | 'error';
    timestamp: Date;
    details: any;
  }): void {
    // Implementar lógica para registrar eventos de escaneo
    console.log(`[${event.timestamp.toISOString()}] ${event.type.toUpperCase()}:`, event.details);
  }
}

export default ScanLogger;
