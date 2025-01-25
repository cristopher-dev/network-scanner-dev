interface DeviceClassification {
  tags: string[];
  category: 'server' | 'workstation' | 'network' | 'iot';
  priority: number;
  customFields: Record<string, string>;
  securityLevel: 'high' | 'medium' | 'low';
}
