interface DeviceSummary {
  name: string;
  ip: string;
  status: 'online' | 'offline';
  lastSeen?: string;
}

interface SecurityAudit {
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string;
}

interface NetworkReport {
  timestamp: string;
  devices: DeviceSummary[];
  securityIssues: SecurityAudit[];
  performanceMetrics: {
    bandwidth: number;
    latency: number;
    packetLoss: number;
  };
  recommendations: string[];
}

// ...existing code...
