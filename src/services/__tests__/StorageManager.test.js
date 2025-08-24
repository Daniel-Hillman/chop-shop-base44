/**
 * StorageManager Test Suite
 * 
 * Tests for IndexedDB-based temporary audio caching functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock IndexedDB for testing
const mockIndexedDB = {
  databases: new Map(),
  open: vi.fn(),
  deleteDatabase: vi.fn()
};

// Mock AudioContext
const mockAudioContext = {
  createBuffer: vi.fn(),
  sampleRate: 44100,
  state: 'running'
};

// Mock AudioBuffer
const createMockAudioBuffer = (duration = 10, sampleRate = 44100, numberOfChannels = 2) => {
  const length = Math.floor(duration * sampleRate);
  const buffer = {
    duration,
    sampleRate,
    numberOfChannels,
    length,
    getChannelData: vi.fn((channel) => {
      // Return mock Float32Array with some test data
      const data = new Float32Array(length);
      for (let i = 0; i < length; i++) {
        data[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.5; // 440Hz sine wave
      }
      return data;
    })
  };
  return buffer;
};

// Mock IDBRequest
class MockIDBRequest {
  constructor() {
    this.result = null;
    this.error = null;
    this.onsuccess = null;
    this.onerror = null;
  }

  succeed(result) {
    this.result = result;
    if (this.onsuccess) {
      this.onsuccess({ target: this });
    }
  }

  fail(error) {
    this.error = error;
    if (this.onerror) {
      this.onerror({ target: this });
    }
  }
}

// Mock IDBTransaction
class MockIDBTransaction {
  constructor(db, storeNames, mode) {
    this.db = db;
    this.objectStoreNames = storeNames;
    this.mode = mode;
  }

  objectStore(name) {
    return this.db.stores.get(name);
  }
}

// Mock IDBObjectStore
class MockIDBObjectStore {
  constructor() {
    this.data = new Map();
    this.indexes = new Map();
  }

  put(value) {
    const request = new MockIDBRequest();
    setTimeout(() => {
      this.data.set(value.id, value);
      request.succeed();
    }, 0);
    return request;
  }

  get(key) {
    const request = new MockIDBRequest();
    setTimeout(() => {
      request.succeed(this.data.get(key));
    }, 0);
    return request;
  }

  delete(key) {
    const request = new MockIDBRequest();
    setTimeout(() => {
      this.data.delete(key);
      request.succeed();
    }, 0);
    return request;
  }

  clear() {
    const request = new MockIDBRequest();
    setTimeout(() => {
      this.data.clear();
      request.succeed();
    }, 0);
    return request;
  }

  getAll() {
    const request = new MockIDBRequest();
    setTimeout(() => {
      request.succeed(Array.from(this.data.values()));
    }, 0);
    return request;
  }

  createIndex(name, keyPath, options) {
    this.indexes.set(name, { keyPath, options });
  }
}

// Mock IDBDatabase
class MockIDBDatabase {
  constructor() {
    this.stores = new Map();
    this.objectStoreNames = {
      contains: (name) => this.stores.has(name)
    };
    this.onerror = null;
  }

  createObjectStore(name, options) {
    const store = new MockIDBObjectStore();
    this.stores.set(name, store);
    return store;
  }

  transaction(storeNames, mode) {
    return new MockIDBTransaction(this, storeNames, mode);
  }

  close() {
    // Mock close
  }
}

// Setup global mocks
global.indexedDB = {
  open: (name, version) => {
    const request = new MockIDBRequest();
    setTimeout(() => {
      const db = new MockIDBDatabase();
      
      // Trigger upgrade if needed
      if (request.onupgradeneeded) {
        request.onupgradeneeded({ target: { result: db } });
      }
      
      request.succeed(db);
    }, 0);
    return request;
  },
  deleteDatabase: mockIndexedDB.deleteDatabase
};

global.AudioContext = vi.fn(() => mockAudioContext);
global.webkitAudioContext = global.AudioContext;

// Mock navigator.storage
global.navigator = {
  storage: {
    estimate: vi.fn().mockResolvedValue({
      quota: 1024 * 1024 * 1024, // 1GB
      usage: 100 * 1024 * 1024   // 100MB
    })
  }
};

describe('StorageManager', () => {
  let StorageManager;
  let storageManager;

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();
    
    // Dynamic import to ensure fresh instance
    const module = await import('../StorageManager.js');
    StorageManager = module.default.constructor;
    storageManager = new StorageManager();
  });

  afterEach(async () => {
    if (storageManager) {
      await storageManager.close();
    }
  });

  describe('Initialization', () => {
    it('should initialize IndexedDB successfully', async () => {
      await expect(storageManager.init()).resolves.not.toThrow();
      expect(storageManager.isInitialized).toBe(true);
    });

    it('should handle initialization errors gracefully', async () => {
      // Mock IndexedDB to fail
      global.indexedDB.open = () => {
        const request = new MockIDBRequest();
        setTimeout(() => {
          request.fail(new Error('IndexedDB not available'));
        }, 0);
        return request;
      };

      const newStorageManager = new StorageManager();
      await expect(newStorageManager.init()).rejects.toThrow('IndexedDB initialization failed');
    });

    it('should not reinitialize if already initialized', async () => {
      await storageManager.init();
      const openSpy = vi.spyOn(global.indexedDB, 'open');
      
      await storageManager.init();
      
      // Should not call indexedDB.open again
      expect(openSpy).not.toHaveBeenCalled();
    });
  });

  describe('Storage Operations', () => {
    beforeEach(async () => {
      await storageManager.init();
    });

    it('should store and retrieve audio buffer successfully', async () => {
      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const audioBuffer = createMockAudioBuffer(10, 44100, 2);
      const waveformData = [0.1, 0.2, 0.3, 0.4, 0.5];

      // Store audio
      const storeResult = await storageManager.store(youtubeUrl, audioBuffer, waveformData);
      expect(storeResult).toBe(true);

      // Retrieve audio
      const retrieved = await storageManager.retrieve(youtubeUrl);
      expect(retrieved).not.toBeNull();
      expect(retrieved.audioBuffer).toBeDefined();
      expect(retrieved.waveformData).toEqual(waveformData);
      expect(retrieved.metadata.duration).toBe(10);
      expect(retrieved.metadata.sampleRate).toBe(44100);
      expect(retrieved.metadata.numberOfChannels).toBe(2);
    });

    it('should return null for non-existent entries', async () => {
      const result = await storageManager.retrieve('https://www.youtube.com/watch?v=nonexistent');
      expect(result).toBeNull();
    });

    it('should check if entries exist', async () => {
      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const audioBuffer = createMockAudioBuffer();

      // Should not exist initially
      expect(await storageManager.has(youtubeUrl)).toBe(false);

      // Store and check again
      await storageManager.store(youtubeUrl, audioBuffer);
      expect(await storageManager.has(youtubeUrl)).toBe(true);
    });

    it('should remove entries successfully', async () => {
      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const audioBuffer = createMockAudioBuffer();

      // Store and verify
      await storageManager.store(youtubeUrl, audioBuffer);
      expect(await storageManager.has(youtubeUrl)).toBe(true);

      // Remove and verify
      const removeResult = await storageManager.remove(youtubeUrl);
      expect(removeResult).toBe(true);
      expect(await storageManager.has(youtubeUrl)).toBe(false);
    });

    it('should clear all entries', async () => {
      const urls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=9bZkp7q19f0',
        'https://www.youtube.com/watch?v=oHg5SJYRHA0'
      ];
      const audioBuffer = createMockAudioBuffer();

      // Store multiple entries
      for (const url of urls) {
        await storageManager.store(url, audioBuffer);
      }

      // Verify all exist
      for (const url of urls) {
        expect(await storageManager.has(url)).toBe(true);
      }

      // Clear all
      const clearResult = await storageManager.clear();
      expect(clearResult).toBe(true);

      // Verify all are gone
      for (const url of urls) {
        expect(await storageManager.has(url)).toBe(false);
      }
    });
  });

  describe('Quota Management', () => {
    beforeEach(async () => {
      await storageManager.init();
    });

    it('should handle storage quota exceeded errors', async () => {
      // Mock storage to always throw quota exceeded error
      const originalPerformStore = storageManager.performStore;
      storageManager.performStore = vi.fn().mockRejectedValue(
        Object.assign(new Error('Quota exceeded'), { name: 'QuotaExceededError' })
      );

      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const audioBuffer = createMockAudioBuffer();

      await expect(storageManager.store(youtubeUrl, audioBuffer)).rejects.toThrow('Storage failed');
    });

    it('should perform cleanup when storage threshold is reached', async () => {
      // Mock storage info to indicate threshold reached
      const originalGetStorageInfo = storageManager.getStorageInfo;
      storageManager.getStorageInfo = vi.fn().mockResolvedValue({
        totalSize: storageManager.config.maxStorageSize * 0.9, // 90% full
        entryCount: 10
      });

      const cleanupSpy = vi.spyOn(storageManager, 'cleanup');

      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const audioBuffer = createMockAudioBuffer();

      await storageManager.store(youtubeUrl, audioBuffer);

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe('Cleanup Operations', () => {
    beforeEach(async () => {
      await storageManager.init();
    });

    it('should clean up expired entries', async () => {
      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const audioBuffer = createMockAudioBuffer();

      // Store entry
      await storageManager.store(youtubeUrl, audioBuffer);

      // Mock entry as expired
      const originalIsExpired = storageManager.isExpired;
      storageManager.isExpired = vi.fn().mockReturnValue(true);

      // Perform cleanup
      const cleanedCount = await storageManager.cleanup();
      expect(cleanedCount).toBe(1);

      // Entry should be gone
      expect(await storageManager.has(youtubeUrl)).toBe(false);

      // Restore original method
      storageManager.isExpired = originalIsExpired;
    });

    it('should clean up oldest entries when max entries exceeded', async () => {
      // Set low max entries for testing
      storageManager.config.maxEntries = 2;

      const urls = [
        'https://www.youtube.com/watch?v=url1',
        'https://www.youtube.com/watch?v=url2',
        'https://www.youtube.com/watch?v=url3'
      ];
      const audioBuffer = createMockAudioBuffer();

      // Store entries with different timestamps
      for (let i = 0; i < urls.length; i++) {
        await storageManager.store(urls[i], audioBuffer);
        // Add small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Perform cleanup
      const cleanedCount = await storageManager.cleanup();
      expect(cleanedCount).toBe(1); // Should remove 1 entry to get back to max

      // Check that oldest entry is gone
      const info = await storageManager.getStorageInfo();
      expect(info.entryCount).toBe(2);
    });
  });

  describe('Storage Information', () => {
    beforeEach(async () => {
      await storageManager.init();
    });

    it('should provide accurate storage information', async () => {
      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const audioBuffer = createMockAudioBuffer(10, 44100, 2);

      // Get initial info
      const initialInfo = await storageManager.getStorageInfo();
      expect(initialInfo.entryCount).toBe(0);
      expect(initialInfo.totalSize).toBe(0);

      // Store entry and check again
      await storageManager.store(youtubeUrl, audioBuffer);
      const updatedInfo = await storageManager.getStorageInfo();
      
      expect(updatedInfo.entryCount).toBe(1);
      expect(updatedInfo.totalSize).toBeGreaterThan(0);
      expect(updatedInfo.totalSizeMB).toBeGreaterThan(0);
      expect(updatedInfo.maxEntries).toBe(storageManager.config.maxEntries);
      expect(updatedInfo.maxSizeMB).toBe(Math.round(storageManager.config.maxStorageSize / (1024 * 1024)));
    });

    it('should handle storage estimate errors gracefully', async () => {
      // Mock navigator.storage.estimate to fail
      global.navigator.storage.estimate = vi.fn().mockRejectedValue(new Error('Not supported'));

      const info = await storageManager.getStorageInfo();
      expect(info.quota).toBeNull();
      expect(info.usage).toBeNull();
      expect(info.utilizationPercent).toBeNull();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await storageManager.init();
    });

    it('should handle serialization errors gracefully', async () => {
      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      // Create invalid audio buffer
      const invalidBuffer = {
        numberOfChannels: 2,
        sampleRate: 44100,
        duration: 10,
        getChannelData: vi.fn().mockImplementation(() => {
          throw new Error('Channel data error');
        })
      };

      await expect(storageManager.store(youtubeUrl, invalidBuffer)).rejects.toThrow();
    });

    it('should handle database errors during operations', async () => {
      // Mock database to fail on operations
      const mockError = new Error('Database error');
      storageManager.performStore = vi.fn().mockRejectedValue(mockError);

      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const audioBuffer = createMockAudioBuffer();

      await expect(storageManager.store(youtubeUrl, audioBuffer)).rejects.toThrow('Storage failed');
    });

    it('should return false for failed remove operations', async () => {
      // Mock database to fail on delete
      storageManager.db = {
        transaction: () => ({
          objectStore: () => ({
            delete: () => {
              const request = new MockIDBRequest();
              setTimeout(() => request.fail(new Error('Delete failed')), 0);
              return request;
            }
          })
        })
      };

      const result = await storageManager.remove('https://www.youtube.com/watch?v=test');
      expect(result).toBe(false);
    });
  });

  describe('ID Generation', () => {
    it('should generate consistent IDs for YouTube URLs', () => {
      const urls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s'
      ];

      const ids = urls.map(url => storageManager.generateId(url));
      
      // All should generate the same ID (based on video ID)
      expect(ids[0]).toBe('yt_dQw4w9WgXcQ');
      expect(ids[1]).toBe('yt_dQw4w9WgXcQ');
      expect(ids[2]).toBe('yt_dQw4w9WgXcQ');
    });

    it('should handle non-YouTube URLs', () => {
      const url = 'https://example.com/audio.mp3';
      const id = storageManager.generateId(url);
      
      expect(id).toMatch(/^url_/);
      expect(id.length).toBeGreaterThan(4);
    });
  });

  describe('Utility Methods', () => {
    it('should format sizes correctly', () => {
      expect(storageManager.formatSize(0)).toBe('0 B');
      expect(storageManager.formatSize(1024)).toBe('1 KB');
      expect(storageManager.formatSize(1024 * 1024)).toBe('1 MB');
      expect(storageManager.formatSize(1024 * 1024 * 1024)).toBe('1 GB');
      expect(storageManager.formatSize(1536)).toBe('1.5 KB');
    });

    it('should calculate expiration correctly', () => {
      const now = Date.now();
      const ttl = storageManager.config.entryTTL;
      
      const freshEntry = { timestamp: now };
      const expiredEntry = { timestamp: now - ttl - 1000 };
      
      expect(storageManager.isExpired(freshEntry)).toBe(false);
      expect(storageManager.isExpired(expiredEntry)).toBe(true);
    });
  });
});