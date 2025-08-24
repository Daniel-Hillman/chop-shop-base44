/**
 * StorageManager - Temporary audio caching using IndexedDB
 * 
 * Provides persistent storage for audio buffers with quota management,
 * automatic cleanup, and error handling for storage failures.
 */

class StorageManager {
  constructor() {
    this.dbName = 'YouTubeAudioSampler';
    this.dbVersion = 1;
    this.storeName = 'audioCache';
    this.db = null;
    this.isInitialized = false;
    
    // Configuration
    this.config = {
      maxStorageSize: 500 * 1024 * 1024, // 500MB max storage
      maxEntries: 50, // Maximum number of cached audio files
      cleanupThreshold: 0.8, // Clean up when 80% full
      entryTTL: 24 * 60 * 60 * 1000, // 24 hours TTL
      retryAttempts: 3,
      retryDelay: 1000
    };

    // Bind methods to preserve context
    this.init = this.init.bind(this);
    this.store = this.store.bind(this);
    this.retrieve = this.retrieve.bind(this);
    this.remove = this.remove.bind(this);
    this.cleanup = this.cleanup.bind(this);
    this.clear = this.clear.bind(this);
    this.getStorageInfo = this.getStorageInfo.bind(this);
  }

  /**
   * Initialize IndexedDB connection
   * @returns {Promise<void>}
   */
  async init() {
    if (this.isInitialized && this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(new Error(`IndexedDB initialization failed: ${request.error?.message}`));
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        
        // Set up error handler
        this.db.onerror = (event) => {
          console.error('IndexedDB error:', event.target.error);
        };
        
        console.log('StorageManager initialized successfully');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          
          // Create indexes for efficient querying
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('size', 'size', { unique: false });
          store.createIndex('youtubeUrl', 'youtubeUrl', { unique: false });
          
          console.log('Created IndexedDB object store and indexes');
        }
      };
    });
  }

  /**
   * Store audio buffer and associated data
   * @param {string} youtubeUrl - The YouTube video URL
   * @param {AudioBuffer} audioBuffer - The audio buffer to store
   * @param {number[]} waveformData - Waveform visualization data
   * @returns {Promise<boolean>} Success status
   */
  async store(youtubeUrl, audioBuffer, waveformData = null) {
    try {
      await this.ensureInitialized();
      
      const id = this.generateId(youtubeUrl);
      const audioData = this.serializeAudioBuffer(audioBuffer);
      const size = this.calculateSize(audioData, waveformData);
      
      // Check storage quota before storing
      await this.ensureStorageSpace(size);
      
      const entry = {
        id,
        youtubeUrl,
        audioData,
        waveformData,
        size,
        timestamp: Date.now(),
        format: 'audiobuffer',
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
        duration: audioBuffer.duration
      };

      await this.performStore(entry);
      
      console.log(`Stored audio for ${youtubeUrl} (${this.formatSize(size)})`);
      return true;
      
    } catch (error) {
      console.error('Failed to store audio:', error);
      
      // Attempt cleanup and retry once
      if (error.name === 'QuotaExceededError') {
        try {
          await this.performEmergencyCleanup();
          await this.performStore(entry);
          return true;
        } catch (retryError) {
          console.error('Retry after cleanup also failed:', retryError);
        }
      }
      
      throw new Error(`Storage failed: ${error.message}`);
    }
  }

  /**
   * Retrieve stored audio buffer
   * @param {string} youtubeUrl - The YouTube video URL
   * @returns {Promise<Object|null>} Stored audio data or null if not found
   */
  async retrieve(youtubeUrl) {
    try {
      await this.ensureInitialized();
      
      const id = this.generateId(youtubeUrl);
      const entry = await this.performRetrieve(id);
      
      if (!entry) {
        return null;
      }
      
      // Check if entry has expired
      if (this.isExpired(entry)) {
        await this.remove(youtubeUrl);
        return null;
      }
      
      // Deserialize audio buffer
      const audioBuffer = this.deserializeAudioBuffer(entry.audioData, entry.sampleRate, entry.numberOfChannels);
      
      // Update access timestamp
      await this.updateAccessTime(id);
      
      console.log(`Retrieved audio for ${youtubeUrl}`);
      
      return {
        audioBuffer,
        waveformData: entry.waveformData,
        metadata: {
          duration: entry.duration,
          sampleRate: entry.sampleRate,
          numberOfChannels: entry.numberOfChannels,
          size: entry.size,
          timestamp: entry.timestamp
        }
      };
      
    } catch (error) {
      console.error('Failed to retrieve audio:', error);
      return null;
    }
  }

  /**
   * Remove stored audio entry
   * @param {string} youtubeUrl - The YouTube video URL
   * @returns {Promise<boolean>} Success status
   */
  async remove(youtubeUrl) {
    try {
      await this.ensureInitialized();
      
      const id = this.generateId(youtubeUrl);
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(id);
        
        request.onsuccess = () => {
          console.log(`Removed audio for ${youtubeUrl}`);
          resolve(true);
        };
        
        request.onerror = () => {
          reject(new Error(`Failed to remove entry: ${request.error?.message}`));
        };
      });
      
    } catch (error) {
      console.error('Failed to remove audio:', error);
      return false;
    }
  }

  /**
   * Check if audio is stored for given URL
   * @param {string} youtubeUrl - The YouTube video URL
   * @returns {Promise<boolean>} True if stored and not expired
   */
  async has(youtubeUrl) {
    try {
      await this.ensureInitialized();
      
      const id = this.generateId(youtubeUrl);
      const entry = await this.performRetrieve(id);
      
      if (!entry) {
        return false;
      }
      
      // Check if expired
      if (this.isExpired(entry)) {
        await this.remove(youtubeUrl);
        return false;
      }
      
      return true;
      
    } catch (error) {
      console.error('Failed to check storage:', error);
      return false;
    }
  }

  /**
   * Perform automatic cleanup of expired and old entries
   * @returns {Promise<number>} Number of entries cleaned up
   */
  async cleanup() {
    try {
      await this.ensureInitialized();
      
      const allEntries = await this.getAllEntries();
      const now = Date.now();
      let cleanedCount = 0;
      
      // Sort by timestamp (oldest first)
      allEntries.sort((a, b) => a.timestamp - b.timestamp);
      
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      for (const entry of allEntries) {
        let shouldRemove = false;
        
        // Remove expired entries
        if (this.isExpired(entry)) {
          shouldRemove = true;
        }
        
        // Remove oldest entries if we exceed max entries
        if (allEntries.length - cleanedCount > this.config.maxEntries) {
          shouldRemove = true;
        }
        
        if (shouldRemove) {
          await new Promise((resolve, reject) => {
            const deleteRequest = store.delete(entry.id);
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
          });
          
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} expired/old audio entries`);
      }
      
      return cleanedCount;
      
    } catch (error) {
      console.error('Cleanup failed:', error);
      return 0;
    }
  }

  /**
   * Clear all stored audio data
   * @returns {Promise<boolean>} Success status
   */
  async clear() {
    try {
      await this.ensureInitialized();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();
        
        request.onsuccess = () => {
          console.log('Cleared all audio storage');
          resolve(true);
        };
        
        request.onerror = () => {
          reject(new Error(`Failed to clear storage: ${request.error?.message}`));
        };
      });
      
    } catch (error) {
      console.error('Failed to clear storage:', error);
      return false;
    }
  }

  /**
   * Get storage information and statistics
   * @returns {Promise<Object>} Storage information
   */
  async getStorageInfo() {
    try {
      await this.ensureInitialized();
      
      const allEntries = await this.getAllEntries();
      const totalSize = allEntries.reduce((sum, entry) => sum + (entry.size || 0), 0);
      const expiredCount = allEntries.filter(entry => this.isExpired(entry)).length;
      
      // Get storage quota if available
      let quota = null;
      let usage = null;
      
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
          const estimate = await navigator.storage.estimate();
          quota = estimate.quota;
          usage = estimate.usage;
        } catch (error) {
          console.warn('Could not get storage estimate:', error);
        }
      }
      
      return {
        entryCount: allEntries.length,
        expiredCount,
        totalSize,
        totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        maxEntries: this.config.maxEntries,
        maxSize: this.config.maxStorageSize,
        maxSizeMB: Math.round(this.config.maxStorageSize / (1024 * 1024)),
        quota,
        usage,
        utilizationPercent: quota ? Math.round((usage / quota) * 100) : null,
        oldestEntry: allEntries.length > 0 ? Math.min(...allEntries.map(e => e.timestamp)) : null,
        newestEntry: allEntries.length > 0 ? Math.max(...allEntries.map(e => e.timestamp)) : null
      };
      
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return {
        entryCount: 0,
        expiredCount: 0,
        totalSize: 0,
        error: error.message
      };
    }
  }

  // Private helper methods

  /**
   * Ensure StorageManager is initialized
   * @private
   */
  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.init();
    }
  }

  /**
   * Generate consistent ID from YouTube URL
   * @private
   */
  generateId(youtubeUrl) {
    // Extract video ID for consistent caching
    const videoIdMatch = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return videoIdMatch ? `yt_${videoIdMatch[1]}` : `url_${btoa(youtubeUrl).replace(/[^a-zA-Z0-9]/g, '')}`;
  }

  /**
   * Serialize AudioBuffer to storable format
   * @private
   */
  serializeAudioBuffer(audioBuffer) {
    const channels = [];
    
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      const channelData = audioBuffer.getChannelData(i);
      channels.push(Array.from(channelData));
    }
    
    return {
      channels,
      sampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioBuffer.numberOfChannels,
      duration: audioBuffer.duration
    };
  }

  /**
   * Deserialize stored data back to AudioBuffer
   * @private
   */
  deserializeAudioBuffer(audioData, sampleRate, numberOfChannels) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const length = audioData.channels[0].length;
    const audioBuffer = audioContext.createBuffer(numberOfChannels, length, sampleRate);
    
    for (let i = 0; i < numberOfChannels; i++) {
      const channelData = audioBuffer.getChannelData(i);
      const storedChannel = audioData.channels[i];
      
      for (let j = 0; j < length; j++) {
        channelData[j] = storedChannel[j];
      }
    }
    
    return audioBuffer;
  }

  /**
   * Calculate size of data to be stored
   * @private
   */
  calculateSize(audioData, waveformData) {
    let size = 0;
    
    // Calculate audio data size (rough estimate)
    if (audioData && audioData.channels) {
      for (const channel of audioData.channels) {
        size += channel.length * 4; // 4 bytes per float32
      }
    }
    
    // Add waveform data size
    if (waveformData) {
      size += waveformData.length * 4; // 4 bytes per float32
    }
    
    // Add metadata overhead (rough estimate)
    size += 1024; // 1KB for metadata
    
    return size;
  }

  /**
   * Ensure sufficient storage space is available
   * @private
   */
  async ensureStorageSpace(requiredSize) {
    const info = await this.getStorageInfo();
    
    // Check if we need cleanup
    if (info.totalSize + requiredSize > this.config.maxStorageSize * this.config.cleanupThreshold) {
      console.log('Storage threshold reached, performing cleanup...');
      await this.cleanup();
    }
    
    // Check if we still don't have enough space
    const updatedInfo = await this.getStorageInfo();
    if (updatedInfo.totalSize + requiredSize > this.config.maxStorageSize) {
      throw new Error('Insufficient storage space available');
    }
  }

  /**
   * Perform emergency cleanup when quota is exceeded
   * @private
   */
  async performEmergencyCleanup() {
    console.log('Performing emergency cleanup...');
    
    const allEntries = await this.getAllEntries();
    
    // Remove oldest 50% of entries
    allEntries.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = allEntries.slice(0, Math.floor(allEntries.length / 2));
    
    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    for (const entry of toRemove) {
      await new Promise((resolve, reject) => {
        const deleteRequest = store.delete(entry.id);
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
      });
    }
    
    console.log(`Emergency cleanup removed ${toRemove.length} entries`);
  }

  /**
   * Perform the actual store operation
   * @private
   */
  async performStore(entry) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(entry);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Perform the actual retrieve operation
   * @private
   */
  async performRetrieve(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update access timestamp for an entry
   * @private
   */
  async updateAccessTime(id) {
    try {
      const entry = await this.performRetrieve(id);
      if (entry) {
        entry.lastAccessed = Date.now();
        await this.performStore(entry);
      }
    } catch (error) {
      console.warn('Failed to update access time:', error);
    }
  }

  /**
   * Get all entries from storage
   * @private
   */
  async getAllEntries() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Check if entry has expired
   * @private
   */
  isExpired(entry) {
    return Date.now() - entry.timestamp > this.config.entryTTL;
  }

  /**
   * Format size in human-readable format
   * @private
   */
  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Close database connection and cleanup
   */
  async close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
      console.log('StorageManager closed');
    }
  }
}

// Create and export singleton instance
const storageManager = new StorageManager();

// Initialize on first import
storageManager.init().catch(error => {
  console.error('Failed to initialize StorageManager:', error);
});

// Clean up on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    storageManager.close();
  });
  
  // Perform periodic cleanup
  setInterval(() => {
    storageManager.cleanup().catch(error => {
      console.warn('Periodic cleanup failed:', error);
    });
  }, 30 * 60 * 1000); // Every 30 minutes
}

export default storageManager;