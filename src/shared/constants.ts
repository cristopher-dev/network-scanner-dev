export const NETWORK_CONSTANTS = {
  // Timeouts (en millisegundos)
  DEFAULT_SCAN_TIMEOUT: 2000,
  DEFAULT_PING_TIMEOUT: 1000,
  DEFAULT_ARP_TIMEOUT: 3000,
  DEFAULT_NETBIOS_TIMEOUT: 5000,
  SOCKET_TIMEOUT: 1000,

  // Cache configuración
  CACHE_TTL: 600, // 10 minutos
  CACHE_CHECK_PERIOD: 120, // 2 minutos
  ADVANCED_CACHE_TTL: 300, // 5 minutos

  // Red por defecto
  DEFAULT_BASE_IP: '192.168.1',
  DEFAULT_START_RANGE: 1,
  DEFAULT_END_RANGE: 254,

  // Puertos comunes
  DEFAULT_PORTS: [20, 21, 22, 23, 25, 53, 80, 443, 445, 3389],
  COMMON_PORTS: [22, 80, 443],

  // Límites de concurrencia
  DEFAULT_CONCURRENCY_LIMIT: 10,
  DEFAULT_BATCH_SIZE: 50,
  MAX_BATCH_SIZE: 100,

  // TTL valores para detección de OS
  TTL_WINDOWS: 128,
  TTL_LINUX_UNIX: 64,
  TTL_SOLARIS_AIX: 254,

  // Configuraciones de puerto
  PORT_MIN: 1,
  PORT_MAX: 65535,
  IP_RANGE_MIN: 1,
  IP_RANGE_MAX: 254,

  // Timeouts para UI
  UI_TIMEOUT_MIN: 500,
  UI_TIMEOUT_MAX: 10000,
  UI_TIMEOUT_STEP: 100,
  SLIDER_MAX_TIMEOUT: 5000,

  // Reintentos
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,

  // Ventana principal
  WINDOW_WIDTH: 1100,
  WINDOW_HEIGHT: 750,
} as const;

export const NETWORK_CONFIGS = [
  { name: '192.168.1.x', baseIp: '192.168.1', description: 'Red doméstica común' },
  { name: '192.168.0.x', baseIp: '192.168.0', description: 'Red doméstica alternativa' },
  { name: '10.0.0.x', baseIp: '10.0.0', description: 'Red empresarial' },
  { name: '172.16.0.x', baseIp: '172.16.0', description: 'Red privada clase B' },
] as const;

export const SERVICE_NAMES: Record<number, string> = {
  21: 'FTP',
  22: 'SSH',
  23: 'Telnet',
  25: 'SMTP',
  53: 'DNS',
  80: 'HTTP',
  110: 'POP3',
  143: 'IMAP',
  443: 'HTTPS',
  445: 'SMB',
  993: 'IMAPS',
  995: 'POP3S',
  1433: 'SQL Server',
  3306: 'MySQL',
  3389: 'RDP',
  5432: 'PostgreSQL',
  5984: 'CouchDB',
  27017: 'MongoDB',
} as const;

export const OS_DETECTION = {
  WINDOWS: 'Windows',
  LINUX_UNIX: 'Linux/Unix',
  SOLARIS_AIX: 'Solaris/AIX',
  UNKNOWN: 'Unknown',
} as const;
