import NodeCache from 'node-cache';

class ScanCacheManager {
  private readonly cache: NodeCache;

  constructor() {
    // Configurar cache con TTL por defecto de 5 minutos
    this.cache = new NodeCache({
      stdTTL: 300, // 5 minutos
      checkperiod: 120, // Verificar cada 2 minutos por elementos expirados
      useClones: false, // Mejor rendimiento
    });
  }

  async getCachedScan(key: string): Promise<any> {
    return this.cache.get(key) || null;
  }

  setCache(key: string, data: any, ttl?: number): void {
    if (ttl) {
      this.cache.set(key, data, ttl / 1000); // node-cache usa segundos
    } else {
      this.cache.set(key, data);
    }
  }

  clearCache(): void {
    this.cache.flushAll();
  }

  getStats(): { keys: number; hits: number; misses: number } {
    return this.cache.getStats();
  }
}

export default ScanCacheManager;
