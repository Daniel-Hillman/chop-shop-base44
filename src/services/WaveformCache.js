/**
 * Intelligent caching system for generated waveform data
 * Implements LRU cache with memory management and persistence
 * Requirements: 7.2, 7.3, 7.4
 */

export class WaveformCache {
  constructor(options = {}) {
    this.maxMemorySize = options.maxMemorySize || 100 * 1024 * 1024; // 100MB default
    this.maxCacheEntries = options.maxCacheEntries || 50;
    this.persistenceEnabled = options.persistenceEnabled !== false;
    this.compressionEnabled = options.compressionEnabled !== false;
    this.ttl = options.ttl || 24 * 60 * 60 * 1000; // 24 hours default
    
    // In-memory cache with LRU ordering
    this.memoryCache = new Map();
    this.accessOrder = new Map(); // Track access times for LRU
    this.memorySizeUsed = 0;
    
    // Persistence layer
    this.persistentCache = null;
    this.initializePersistence();
    
    // Performance metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      compressionSavings: 0,
      averageCompressionRatio: 0,
      persistenceHits: 0,
      persistenceMisses: 0
    };
    
    // Cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.performMaintenance();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Initialize persistence layer using IndexedDB
   */
  async initializePersistence() {
    if (!this.persistenceEnabled || typeof indexedDB === 'undefined') {
      return;
    }

    try {
      this.persistentCache = await this.openIndexedDB();
    } catch (error) {
      console.warn('Failed to initialize persistent cache:', error);
      this.persistenceEnabled = false;
    }
  }

  /**
   * Open IndexedDB for persistent caching
   */
  openIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WaveformCache', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        resolve(db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object store for waveform data
        if (!db.objectStoreNames.contains('waveforms')) {
          const store = db.createObjectStore('waveforms', { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('size', 'size', { unique: false });
        }
      };
    });
  }

  /**
   * Generate cache key from waveform parameters
   */
  generateCacheKey(audioSource, options = {}) {
    const keyData = {
      source: this.getSourceIdentifier(audioSource),
      sampleRate: options.sampleRate || 1000,
      quality: options.quality || 'medium',
      analysisMethod: options.analysisMethod || 'auto',
      duration: options.duration || 0
    };
    
    // Create hash from key data
    return this.hashObject(keyData);
  }

  /**
   * Get waveform data from cache
   */
  async get(cacheKey) {
    // Check memory cache first
    const memoryResult = this.getFromMemory(cacheKey);
    if (memoryResult) {
      this.metrics.hits++;
      return memoryResult;
    }
    
    // Check persistent cache
    if (this.persistenceEnabled && this.persistentCache) {
      const persistentResult = await this.getFromPersistent(cacheKey);
      if (persistentResult) {
        this.metrics.persistenceHits++;
        this.metrics.hits++;
        
        // Promote to memory cache
        this.setInMemory(cacheKey, persistentResult);
        return persistentResult;
      } else {
        this.metrics.persistenceMisses++;
      }
    }
    
    this.metrics.misses++;
    return null;
  }

  /**
   * Store waveform data in cache
   */
  async set(cacheKey, waveformData, metadata = {}) {
    const cacheEntry = {
      key: cacheKey,
      data: waveformData,
      metadata: {
        ...metadata,
        timestamp: Date.now(),
        accessCount: 1,
        size: this.calculateDataSize(waveformData)
      }
    };
    
    // Compress data if enabled
    if (this.compressionEnabled) {
      const compressed = await this.compressData(cacheEntry);
      if (compressed.size < cacheEntry.metadata.size) {
        const savings = cacheEntry.metadata.size - compressed.size;
        this.metrics.compressionSavings += savings;
        this.updateCompressionRatio(cacheEntry.metadata.size, compressed.size);
        cacheEntry.compressed = true;
        cacheEntry.data = compressed.data;
        cacheEntry.metadata.size = compressed.size;
      }
    }
    
    // Store in memory cache
    this.setInMemory(cacheKey, cacheEntry);
    
    // Store in persistent cache
    if (this.persistenceEnabled && this.persistentCache) {
      await this.setInPersistent(cacheKey, cacheEntry);
    }
  }

  /**
   * Get data from memory cache
   */
  getFromMemory(cacheKey) {
    const entry = this.memoryCache.get(cacheKey);
    if (!entry) return null;
    
    // Check TTL
    if (Date.now() - entry.metadata.timestamp > this.ttl) {
      this.memoryCache.delete(cacheKey);
      this.accessOrder.delete(cacheKey);
      this.memorySizeUsed -= entry.metadata.size;
      return null;
    }
    
    // Update access order for LRU
    this.accessOrder.set(cacheKey, Date.now());
    entry.metadata.accessCount++;
    
    // Decompress if needed
    if (entry.compressed) {
      const decompressed = this.decompressData(entry);
      return {
        ...entry,
        data: decompressed,
        compressed: false
      };
    }
    
    return entry;
  }

  /**
   * Set data in memory cache with LRU eviction
   */
  setInMemory(cacheKey, cacheEntry) {
    // Check if we need to evict entries
    while (
      (this.memorySizeUsed + cacheEntry.metadata.size > this.maxMemorySize) ||
      (this.memoryCache.size >= this.maxCacheEntries)
    ) {
      this.evictLRU();
    }
    
    // Remove existing entry if updating
    if (this.memoryCache.has(cacheKey)) {
      const existing = this.memoryCache.get(cacheKey);
      this.memorySizeUsed -= existing.metadata.size;
    }
    
    // Add new entry
    this.memoryCache.set(cacheKey, cacheEntry);
    this.accessOrder.set(cacheKey, Date.now());
    this.memorySizeUsed += cacheEntry.metadata.size;
  }

  /**
   * Get data from persistent cache
   */
  async getFromPersistent(cacheKey) {
    if (!this.persistentCache) return null;
    
    try {
      const transaction = this.persistentCache.transaction(['waveforms'], 'readonly');
      const store = transaction.objectStore('waveforms');
      const request = store.get(cacheKey);
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const result = request.result;
          if (!result) {
            resolve(null);
            return;
          }
          
          // Check TTL
          if (Date.now() - result.timestamp > this.ttl) {
            // Delete expired entry
            this.deleteFromPersistent(cacheKey);
            resolve(null);
            return;
          }
          
          // Decompress if needed
          if (result.compressed) {
            const decompressed = this.decompressData(result);
            resolve({
              ...result,
              data: decompressed,
              compressed: false
            });
          } else {
            resolve(result);
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('Failed to get from persistent cache:', error);
      return null;
    }
  }

  /**
   * Set data in persistent cache
   */
  async setInPersistent(cacheKey, cacheEntry) {
    if (!this.persistentCache) return;
    
    try {
      const transaction = this.persistentCache.transaction(['waveforms'], 'readwrite');
      const store = transaction.objectStore('waveforms');
      
      // Create persistent entry
      const persistentEntry = {
        key: cacheKey,
        data: cacheEntry.data,
        metadata: cacheEntry.metadata,
        compressed: cacheEntry.compressed || false,
        timestamp: cacheEntry.metadata.timestamp,
        size: cacheEntry.metadata.size
      };
      
      store.put(persistentEntry);
      
      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.warn('Failed to set in persistent cache:', error);
    }
  }

  /**
   * Delete entry from persistent cache
   */
  async deleteFromPersistent(cacheKey) {
    if (!this.persistentCache) return;
    
    try {
      const transaction = this.persistentCache.transaction(['waveforms'], 'readwrite');
      const store = transaction.objectStore('waveforms');
      store.delete(cacheKey);
    } catch (error) {
      console.warn('Failed to delete from persistent cache:', error);
    }
  }

  /**
   * Evict least recently used entry from memory cache
   */
  evictLRU() {
    if (this.accessOrder.size === 0) return;
    
    // Find least recently used entry
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, accessTime] of this.accessOrder) {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      const entry = this.memoryCache.get(oldestKey);
      if (entry) {
        this.memorySizeUsed -= entry.metadata.size;
      }
      
      this.memoryCache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
      this.metrics.evictions++;
    }
  }

  /**
   * Compress waveform data
   */
  async compressData(cacheEntry) {
    try {
      // Simple compression using JSON stringify and compression
      const jsonData = JSON.stringify(cacheEntry.data);
      
      // Use CompressionStream if available (modern browsers)
      if (typeof CompressionStream !== 'undefined') {
        const stream = new CompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        writer.write(new TextEncoder().encode(jsonData));
        writer.close();
        
        const chunks = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) chunks.push(value);
        }
        
        const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
          compressed.set(chunk, offset);
          offset += chunk.length;
        }
        
        return {
          data: compressed,
          size: compressed.length,
          originalSize: jsonData.length
        };
      } else {
        // Fallback: simple string compression
        const compressed = this.simpleCompress(jsonData);
        return {
          data: compressed,
          size: compressed.length,
          originalSize: jsonData.length
        };
      }
    } catch (error) {
      console.warn('Compression failed:', error);
      return {
        data: cacheEntry.data,
        size: cacheEntry.metadata.size,
        originalSize: cacheEntry.metadata.size
      };
    }
  }

  /**
   * Decompress waveform data
   */
  decompressData(cacheEntry) {
    try {
      if (cacheEntry.data instanceof Uint8Array) {
        // Decompress using DecompressionStream if available
        if (typeof DecompressionStream !== 'undefined') {
          // This would need to be async, but for simplicity using fallback
          return this.simpleDecompress(new TextDecoder().decode(cacheEntry.data));
        } else {
          return this.simpleDecompress(new TextDecoder().decode(cacheEntry.data));
        }
      } else if (typeof cacheEntry.data === 'string') {
        return this.simpleDecompress(cacheEntry.data);
      } else {
        return cacheEntry.data;
      }
    } catch (error) {
      console.warn('Decompression failed:', error);
      return cacheEntry.data;
    }
  }

  /**
   * Simple compression fallback
   */
  simpleCompress(data) {
    // Basic RLE compression for demonstration
    let compressed = '';
    let count = 1;
    let current = data[0];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i] === current && count < 255) {
        count++;
      } else {
        compressed += String.fromCharCode(count) + current;
        current = data[i];
        count = 1;
      }
    }
    compressed += String.fromCharCode(count) + current;
    
    return compressed;
  }

  /**
   * Simple decompression fallback
   */
  simpleDecompress(compressed) {
    try {
      return JSON.parse(compressed);
    } catch {
      // If not JSON, try RLE decompression
      let decompressed = '';
      for (let i = 0; i < compressed.length; i += 2) {
        const count = compressed.charCodeAt(i);
        const char = compressed[i + 1];
        decompressed += char.repeat(count);
      }
      return JSON.parse(decompressed);
    }
  }

  /**
   * Calculate data size in bytes
   */
  calculateDataSize(data) {
    if (data instanceof ArrayBuffer) {
      return data.byteLength;
    } else if (data instanceof Float32Array || data instanceof Uint8Array) {
      return data.length * data.BYTES_PER_ELEMENT;
    } else if (typeof data === 'string') {
      return data.length * 2; // Approximate UTF-16 size
    } else {
      // Estimate JSON size
      return JSON.stringify(data).length * 2;
    }
  }

  /**
   * Generate source identifier for caching
   */
  getSourceIdentifier(audioSource) {
    if (typeof audioSource === 'string') {
      return audioSource; // URL or identifier
    } else if (audioSource && audioSource.videoId) {
      return `youtube:${audioSource.videoId}`;
    } else if (audioSource && audioSource.src) {
      return audioSource.src;
    } else {
      return 'unknown';
    }
  }

  /**
   * Hash object to create cache key
   */
  hashObject(obj) {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `waveform_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Update compression ratio metrics
   */
  updateCompressionRatio(originalSize, compressedSize) {
    const ratio = compressedSize / originalSize;
    const count = this.metrics.hits + this.metrics.misses;
    
    this.metrics.averageCompressionRatio = 
      (this.metrics.averageCompressionRatio * (count - 1) + ratio) / count;
  }

  /**
   * Perform cache maintenance
   */
  async performMaintenance() {
    // Clean expired entries from memory cache
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, entry] of this.memoryCache) {
      if (now - entry.metadata.timestamp > this.ttl) {
        expiredKeys.push(key);
      }
    }
    
    for (const key of expiredKeys) {
      const entry = this.memoryCache.get(key);
      if (entry) {
        this.memorySizeUsed -= entry.metadata.size;
      }
      this.memoryCache.delete(key);
      this.accessOrder.delete(key);
    }
    
    // Clean expired entries from persistent cache
    if (this.persistenceEnabled && this.persistentCache) {
      await this.cleanExpiredPersistent();
    }
    
    // Optimize memory usage if needed
    if (this.memorySizeUsed > this.maxMemorySize * 0.8) {
      this.optimizeMemoryUsage();
    }
  }

  /**
   * Clean expired entries from persistent cache
   */
  async cleanExpiredPersistent() {
    try {
      const transaction = this.persistentCache.transaction(['waveforms'], 'readwrite');
      const store = transaction.objectStore('waveforms');
      const index = store.index('timestamp');
      
      const cutoffTime = Date.now() - this.ttl;
      const range = IDBKeyRange.upperBound(cutoffTime);
      
      const request = index.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    } catch (error) {
      console.warn('Failed to clean expired persistent cache:', error);
    }
  }

  /**
   * Optimize memory usage by evicting less frequently used entries
   */
  optimizeMemoryUsage() {
    // Sort entries by access frequency and recency
    const entries = Array.from(this.memoryCache.entries()).map(([key, entry]) => ({
      key,
      entry,
      score: entry.metadata.accessCount * (Date.now() - entry.metadata.timestamp)
    }));
    
    entries.sort((a, b) => a.score - b.score);
    
    // Remove bottom 25% of entries
    const toRemove = Math.floor(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      const { key, entry } = entries[i];
      this.memorySizeUsed -= entry.metadata.size;
      this.memoryCache.delete(key);
      this.accessOrder.delete(key);
      this.metrics.evictions++;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.metrics.hits / (this.metrics.hits + this.metrics.misses) || 0;
    const persistentHitRate = this.metrics.persistenceHits / this.metrics.persistenceMisses || 0;
    
    return {
      memoryCache: {
        entries: this.memoryCache.size,
        sizeUsed: this.memorySizeUsed,
        maxSize: this.maxMemorySize,
        utilizationPercent: (this.memorySizeUsed / this.maxMemorySize) * 100
      },
      performance: {
        hitRate: hitRate * 100,
        persistentHitRate: persistentHitRate * 100,
        totalHits: this.metrics.hits,
        totalMisses: this.metrics.misses,
        evictions: this.metrics.evictions
      },
      compression: {
        enabled: this.compressionEnabled,
        totalSavings: this.metrics.compressionSavings,
        averageRatio: this.metrics.averageCompressionRatio
      },
      persistence: {
        enabled: this.persistenceEnabled,
        hits: this.metrics.persistenceHits,
        misses: this.metrics.persistenceMisses
      }
    };
  }

  /**
   * Clear all cache data
   */
  async clear() {
    // Clear memory cache
    this.memoryCache.clear();
    this.accessOrder.clear();
    this.memorySizeUsed = 0;
    
    // Clear persistent cache
    if (this.persistenceEnabled && this.persistentCache) {
      try {
        const transaction = this.persistentCache.transaction(['waveforms'], 'readwrite');
        const store = transaction.objectStore('waveforms');
        store.clear();
      } catch (error) {
        console.warn('Failed to clear persistent cache:', error);
      }
    }
    
    // Reset metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      compressionSavings: 0,
      averageCompressionRatio: 0,
      persistenceHits: 0,
      persistenceMisses: 0
    };
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy() {
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Clear all data
    this.clear();
    
    // Close persistent cache
    if (this.persistentCache) {
      this.persistentCache.close();
      this.persistentCache = null;
    }
  }
}

export default WaveformCache;