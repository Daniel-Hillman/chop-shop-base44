/**
 * DiscoveryCacheManager - Handles caching of API results for sample discovery
 * Implements intelligent caching with TTL, memory management, and cleanup
 */

class DiscoveryCacheManager {
  constructor(options = {}) {
    this.cache = new Map();
    this.defaultTTL = options.ttl || 300000; // 5 minutes default
    this.maxCacheSize = options.maxSize || 100; // Maximum cache entries
    this.cleanupInterval = options.cleanupInterval || 60000; // 1 minute cleanup
    this.memoryThreshold = options.memoryThreshold || 50 * 1024 * 1024; // 50MB
    
    // Start periodic cleanup
    this.startCleanupTimer();
    
    // Bind methods for proper context
    this.cacheResults = this.cacheResults.bind(this);
    this.getCachedResults = this.getCachedResults.bind(this);
    this.invalidateCache = this.invalidateCache.bind(this);
  }

  /**
   * Generate cache key from filters
   * @param {Object} filters - Filter state object
   * @returns {string} Cache key
   */
  generateCacheKey(filters) {
    try {
      if (!filters || typeof filters !== 'object') {
        return JSON.stringify({ default: true });
      }
      
      const normalizedFilters = {
        genres: (filters.genres || []).sort(),
        yearRange: filters.yearRange || { start: 1950, end: 1995 },
        tempoRange: filters.tempoRange || null,
        durationRange: filters.durationRange || null,
        instruments: (filters.instruments || []).sort()
      };
      
      return JSON.stringify(normalizedFilters);
    } catch (error) {
      console.warn('[DiscoveryCacheManager] Failed to generate cache key:', error);
      return JSON.stringify({ error: true, timestamp: Date.now() });
    }
  }

  /**
   * Cache API results with TTL
   * @param {Object} filters - Filter state used for the request
   * @param {Array} samples - Sample data to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  cacheResults(filters, samples, ttl = this.defaultTTL) {
    try {
      const key = this.generateCacheKey(filters);
      const entry = {
        data: samples,
        timestamp: Date.now(),
        ttl: ttl,
        size: this.estimateDataSize(samples)
      };

      // Check if we need to make room
      this.enforceMemoryLimits();
      
      this.cache.set(key, entry);
      
      // Log cache operation for debugging
      console.debug(`[DiscoveryCacheManager] Cached ${samples.length} samples for filters:`, filters);
      
    } catch (error) {
      console.warn('[DiscoveryCacheManager] Failed to cache results:', error);
    }
  }

  /**
   * Retrieve cached results if valid
   * @param {Object} filters - Filter state to look up
   * @returns {Array|null} Cached samples or null if not found/expired
   */
  getCachedResults(filters) {
    try {
      const key = this.generateCacheKey(filters);
      const entry = this.cache.get(key);
      
      if (!entry) {
        return null;
      }
      
      // Check if entry has expired
      const now = Date.now();
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        console.debug('[DiscoveryCacheManager] Cache entry expired and removed');
        return null;
      }
      
      console.debug(`[DiscoveryCacheManager] Cache hit for ${entry.data.length} samples`);
      return entry.data;
      
    } catch (error) {
      console.warn('[DiscoveryCacheManager] Failed to retrieve cached results:', error);
      return null;
    }
  }

  /**
   * Invalidate cache entries
   * @param {Object} filters - Specific filters to invalidate (optional)
   */
  invalidateCache(filters = null) {
    try {
      if (filters) {
        // Invalidate specific cache entry
        const key = this.generateCacheKey(filters);
        const deleted = this.cache.delete(key);
        console.debug(`[DiscoveryCacheManager] Invalidated specific cache entry: ${deleted}`);
      } else {
        // Clear entire cache
        const size = this.cache.size;
        this.cache.clear();
        console.debug(`[DiscoveryCacheManager] Cleared entire cache (${size} entries)`);
      }
    } catch (error) {
      console.warn('[DiscoveryCacheManager] Failed to invalidate cache:', error);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const now = Date.now();
    const validEntries = entries.filter(entry => now - entry.timestamp <= entry.ttl);
    
    return {
      totalEntries: this.cache.size,
      validEntries: validEntries.length,
      expiredEntries: this.cache.size - validEntries.length,
      totalMemoryUsage: totalSize,
      averageEntrySize: entries.length > 0 ? totalSize / entries.length : 0
    };
  }

  /**
   * Estimate memory usage of data
   * @param {*} data - Data to estimate size for
   * @returns {number} Estimated size in bytes
   */
  estimateDataSize(data) {
    try {
      // Rough estimation based on JSON string length
      return JSON.stringify(data).length * 2; // UTF-16 characters are 2 bytes
    } catch (error) {
      console.warn('[DiscoveryCacheManager] Failed to estimate data size:', error);
      return 1024; // Default 1KB estimate
    }
  }

  /**
   * Enforce memory limits by removing oldest entries
   */
  enforceMemoryLimits() {
    try {
      // Remove expired entries first
      this.removeExpiredEntries();
      
      // Check if we're over the size limit
      if (this.cache.size >= this.maxCacheSize) {
        const entriesToRemove = this.cache.size - this.maxCacheSize + 1;
        const sortedEntries = Array.from(this.cache.entries())
          .sort(([, a], [, b]) => a.timestamp - b.timestamp);
        
        for (let i = 0; i < entriesToRemove && i < sortedEntries.length; i++) {
          this.cache.delete(sortedEntries[i][0]);
        }
        
        console.debug(`[DiscoveryCacheManager] Removed ${entriesToRemove} old entries to enforce size limit`);
      }
      
      // Check memory usage
      const stats = this.getCacheStats();
      if (stats.totalMemoryUsage > this.memoryThreshold) {
        this.reduceMemoryUsage();
      }
      
    } catch (error) {
      console.warn('[DiscoveryCacheManager] Failed to enforce memory limits:', error);
    }
  }

  /**
   * Perform comprehensive cleanup
   * @param {boolean} force - Force cleanup even if not needed
   */
  cleanup(force = false) {
    try {
      if (force || this.shouldCleanup()) {
        this.removeExpiredEntries();
        this.enforceMemoryLimits();
        console.debug('[DiscoveryCacheManager] Cleanup completed');
      }
    } catch (error) {
      console.warn('[DiscoveryCacheManager] Cleanup failed:', error);
    }
  }

  /**
   * Check if cleanup should be performed
   * @returns {boolean} True if cleanup is needed
   */
  shouldCleanup() {
    try {
      const stats = this.getCacheStats();
      return (
        stats.expiredEntries > 0 ||
        stats.totalEntries > this.maxCacheSize ||
        stats.totalMemoryUsage > this.memoryThreshold * 0.8
      );
    } catch (error) {
      console.warn('[DiscoveryCacheManager] Failed to check cleanup status:', error);
      return false;
    }
  }

  /**
   * Remove expired cache entries
   */
  removeExpiredEntries() {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      console.debug(`[DiscoveryCacheManager] Removed ${removedCount} expired entries`);
    }
  }

  /**
   * Reduce memory usage by removing largest entries
   */
  reduceMemoryUsage() {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => b.size - a.size);
    
    let removedCount = 0;
    const targetReduction = this.memoryThreshold * 0.3; // Remove 30% of threshold
    let currentReduction = 0;
    
    for (const [key, entry] of entries) {
      if (currentReduction >= targetReduction) break;
      
      this.cache.delete(key);
      currentReduction += entry.size;
      removedCount++;
    }
    
    console.debug(`[DiscoveryCacheManager] Reduced memory usage by ${currentReduction} bytes (${removedCount} entries)`);
  }

  /**
   * Start periodic cleanup timer
   */
  startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      this.removeExpiredEntries();
    }, this.cleanupInterval);
  }

  /**
   * Stop cleanup timer and clear cache
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.cache.clear();
    console.debug('[DiscoveryCacheManager] Cache manager destroyed');
  }

  /**
   * Preload cache with common filter combinations
   * @param {Array} commonFilters - Array of common filter combinations
   * @param {Function} dataProvider - Function to fetch data for filters
   */
  async preloadCommonFilters(commonFilters, dataProvider) {
    try {
      const preloadPromises = commonFilters.map(async (filters) => {
        const cached = this.getCachedResults(filters);
        if (!cached) {
          try {
            const data = await dataProvider(filters);
            this.cacheResults(filters, data);
          } catch (error) {
            console.warn('[DiscoveryCacheManager] Failed to preload filters:', filters, error);
          }
        }
      });
      
      await Promise.allSettled(preloadPromises);
      console.debug(`[DiscoveryCacheManager] Preloaded ${commonFilters.length} filter combinations`);
      
    } catch (error) {
      console.warn('[DiscoveryCacheManager] Failed to preload common filters:', error);
    }
  }
}

export default DiscoveryCacheManager;