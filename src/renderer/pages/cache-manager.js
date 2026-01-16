/**
 * Cache Manager Module
 * Sistema de cache em memória para melhorar performance
 */

class CacheManager {
  constructor(options = {}) {
    this.caches = new Map();
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 minutos padrão
    this.maxSize = options.maxSize || 100; // Máximo de 100 itens por cache
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0
    };
  }

  /**
   * Criar ou obter um namespace de cache
   */
  namespace(name) {
    if (!this.caches.has(name)) {
      this.caches.set(name, new Map());
    }
    return {
      get: (key) => this.get(name, key),
      set: (key, value, ttl) => this.set(name, key, value, ttl),
      has: (key) => this.has(name, key),
      delete: (key) => this.delete(name, key),
      clear: () => this.clear(name),
      size: () => this.size(name)
    };
  }

  /**
   * Obter valor do cache
   */
  get(namespace, key) {
    const cache = this.caches.get(namespace);
    if (!cache) {
      this.stats.misses++;
      return null;
    }

    const item = cache.get(key);
    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Verificar se expirou
    if (item.expiresAt && Date.now() > item.expiresAt) {
      cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Atualizar último acesso
    item.lastAccess = Date.now();
    this.stats.hits++;
    return item.value;
  }

  /**
   * Definir valor no cache
   */
  set(namespace, key, value, ttl = null) {
    let cache = this.caches.get(namespace);
    if (!cache) {
      cache = new Map();
      this.caches.set(namespace, cache);
    }

    // Verificar limite de tamanho
    if (cache.size >= this.maxSize && !cache.has(key)) {
      this._evictLRU(namespace);
    }

    const expiresAt = ttl ? Date.now() + ttl : Date.now() + this.defaultTTL;

    cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now(),
      lastAccess: Date.now()
    });

    this.stats.sets++;
    return true;
  }

  /**
   * Verificar se chave existe no cache
   */
  has(namespace, key) {
    const cache = this.caches.get(namespace);
    if (!cache) return false;

    const item = cache.get(key);
    if (!item) return false;

    // Verificar se expirou
    if (item.expiresAt && Date.now() > item.expiresAt) {
      cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Deletar chave do cache
   */
  delete(namespace, key) {
    const cache = this.caches.get(namespace);
    if (!cache) return false;
    return cache.delete(key);
  }

  /**
   * Limpar namespace inteiro
   */
  clear(namespace) {
    if (namespace) {
      const cache = this.caches.get(namespace);
      if (cache) {
        cache.clear();
        return true;
      }
      return false;
    } else {
      // Limpar tudo
      this.caches.clear();
      this.stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        evictions: 0
      };
      return true;
    }
  }

  /**
   * Tamanho do namespace
   */
  size(namespace) {
    const cache = this.caches.get(namespace);
    return cache ? cache.size : 0;
  }

  /**
   * Obter ou definir (com função factory)
   */
  async getOrSet(namespace, key, factory, ttl = null) {
    // Tentar obter do cache
    const cached = this.get(namespace, key);
    if (cached !== null) {
      return cached;
    }

    // Se não existe, executar factory
    const value = await factory();
    this.set(namespace, key, value, ttl);
    return value;
  }

  /**
   * Remover itens expirados
   */
  cleanup() {
    let cleaned = 0;

    for (const [namespace, cache] of this.caches) {
      for (const [key, item] of cache) {
        if (item.expiresAt && Date.now() > item.expiresAt) {
          cache.delete(key);
          cleaned++;
        }
      }
    }

    return cleaned;
  }

  /**
   * Remover item menos recentemente usado (LRU)
   */
  _evictLRU(namespace) {
    const cache = this.caches.get(namespace);
    if (!cache) return;

    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, item] of cache) {
      if (item.lastAccess < oldestTime) {
        oldestTime = item.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Obter estatísticas do cache
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    const namespaceStats = {};
    for (const [name, cache] of this.caches) {
      namespaceStats[name] = cache.size;
    }

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      namespaces: namespaceStats,
      totalItems: Array.from(this.caches.values()).reduce((sum, cache) => sum + cache.size, 0)
    };
  }

  /**
   * Cache decorador para funções
   */
  memoize(namespace, fn, keyGenerator = (...args) => JSON.stringify(args), ttl = null) {
    return async (...args) => {
      const key = keyGenerator(...args);
      return await this.getOrSet(namespace, key, () => fn(...args), ttl);
    };
  }

  /**
   * Invalidar cache por padrão
   */
  invalidatePattern(namespace, pattern) {
    const cache = this.caches.get(namespace);
    if (!cache) return 0;

    let deleted = 0;
    const regex = new RegExp(pattern);

    for (const key of cache.keys()) {
      if (regex.test(key)) {
        cache.delete(key);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Pré-aquecer cache com dados
   */
  async warmup(namespace, dataLoader, ttl = null) {
    try {
      const data = await dataLoader();

      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.id) {
            this.set(namespace, item.id, item, ttl);
          }
        }
        return data.length;
      } else if (typeof data === 'object') {
        for (const [key, value] of Object.entries(data)) {
          this.set(namespace, key, value, ttl);
        }
        return Object.keys(data).length;
      }

      return 0;
    } catch (error) {
      console.error(`Erro ao pré-aquecer cache ${namespace}:`, error);
      return 0;
    }
  }

  /**
   * Exportar cache para localStorage
   */
  persist(namespace) {
    const cache = this.caches.get(namespace);
    if (!cache) return false;

    try {
      const data = {};
      for (const [key, item] of cache) {
        data[key] = item;
      }

      localStorage.setItem(`cache:${namespace}`, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Erro ao persistir cache ${namespace}:`, error);
      return false;
    }
  }

  /**
   * Restaurar cache do localStorage
   */
  restore(namespace) {
    try {
      const data = localStorage.getItem(`cache:${namespace}`);
      if (!data) return false;

      const parsed = JSON.parse(data);
      const cache = new Map();

      for (const [key, item] of Object.entries(parsed)) {
        // Verificar se não expirou
        if (!item.expiresAt || Date.now() < item.expiresAt) {
          cache.set(key, item);
        }
      }

      this.caches.set(namespace, cache);
      return true;
    } catch (error) {
      console.error(`Erro ao restaurar cache ${namespace}:`, error);
      return false;
    }
  }
}

// Criar instância global
const cacheManager = new CacheManager({
  defaultTTL: 5 * 60 * 1000, // 5 minutos
  maxSize: 100
});

// Criar namespaces comuns
const proxiesCache = cacheManager.namespace('proxies');
const pixKeysCache = cacheManager.namespace('pix_keys');
const macrosCache = cacheManager.namespace('macros');
const referralLinksCache = cacheManager.namespace('referral_links');
const contasCache = cacheManager.namespace('contas');

// Auto-cleanup a cada 5 minutos
setInterval(() => {
  const cleaned = cacheManager.cleanup();
  if (cleaned > 0) {
    console.log(`[CacheManager] Limpou ${cleaned} itens expirados`);
  }
}, 5 * 60 * 1000);

// Exportar para uso global
window.cacheManager = cacheManager;
window.proxiesCache = proxiesCache;
window.pixKeysCache = pixKeysCache;
window.macrosCache = macrosCache;
window.referralLinksCache = referralLinksCache;
window.contasCache = contasCache;

console.log('[CacheManager] Sistema de cache inicializado');
