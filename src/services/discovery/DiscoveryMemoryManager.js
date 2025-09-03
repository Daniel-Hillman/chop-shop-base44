/**
 * DiscoveryMemoryManager - Handles memory management and cleanup for discovery feature
 * Prevents memory leaks and manages resource cleanup
 */

class DiscoveryMemoryManager {
  constructor(options = {}) {
    this.cleanupInterval = options.cleanupInterval || 30000; // 30 seconds
    this.memoryCheckInterval = options.memoryCheckInterval || 60000; // 1 minute
    this.maxMemoryUsage = options.maxMemoryUsage || 100 * 1024 * 1024; // 100MB
    
    // Track managed resources
    this.managedResources = new Set();
    this.eventListeners = new Map();
    this.timers = new Set();
    this.imageCache = new Map();
    this.audioContexts = new Set();
    
    // Performance monitoring
    this.memoryStats = {
      peakUsage: 0,
      currentUsage: 0,
      cleanupCount: 0,
      lastCleanup: null
    };
    
    // Start monitoring
    this.startMemoryMonitoring();
    
    // Bind methods
    this.cleanup = this.cleanup.bind(this);
    this.registerResource = this.registerResource.bind(this);
    this.unregisterResource = this.unregisterResource.bind(this);
  }

  /**
   * Register a resource for memory management
   * @param {string} type - Type of resource (image, audio, timer, etc.)
   * @param {*} resource - The resource to manage
   * @param {Function} cleanupFn - Optional cleanup function
   */
  registerResource(type, resource, cleanupFn = null) {
    try {
      const resourceId = this.generateResourceId(type, resource);
      const resourceInfo = {
        id: resourceId,
        type,
        resource,
        cleanupFn,
        timestamp: Date.now(),
        size: this.estimateResourceSize(type, resource)
      };
      
      this.managedResources.add(resourceInfo);
      
      // Type-specific registration
      switch (type) {
        case 'image':
          this.registerImage(resource, resourceInfo);
          break;
        case 'audio':
          this.registerAudioContext(resource, resourceInfo);
          break;
        case 'timer':
          this.timers.add(resource);
          break;
        case 'eventListener':
          this.registerEventListener(resource, resourceInfo);
          break;
      }
      
      console.debug(`[DiscoveryMemoryManager] Registered ${type} resource:`, resourceId);
      
    } catch (error) {
      console.warn('[DiscoveryMemoryManager] Failed to register resource:', error);
    }
  }

  /**
   * Unregister a resource from memory management
   * @param {string} type - Type of resource
   * @param {*} resource - The resource to unregister
   */
  unregisterResource(type, resource) {
    try {
      const resourceId = this.generateResourceId(type, resource);
      
      // Find and remove the resource
      for (const resourceInfo of this.managedResources) {
        if (resourceInfo.id === resourceId) {
          this.managedResources.delete(resourceInfo);
          
          // Type-specific cleanup
          this.cleanupResource(resourceInfo);
          
          console.debug(`[DiscoveryMemoryManager] Unregistered ${type} resource:`, resourceId);
          break;
        }
      }
      
    } catch (error) {
      console.warn('[DiscoveryMemoryManager] Failed to unregister resource:', error);
    }
  }

  /**
   * Register image for lazy loading and cleanup
   * @param {HTMLImageElement|string} image - Image element or URL
   * @param {Object} resourceInfo - Resource information
   */
  registerImage(image, resourceInfo) {
    const url = typeof image === 'string' ? image : image.src;
    
    if (!this.imageCache.has(url)) {
      this.imageCache.set(url, {
        element: image,
        loadTime: null,
        lastAccessed: Date.now(),
        size: resourceInfo.size
      });
    } else {
      // Update last accessed time
      this.imageCache.get(url).lastAccessed = Date.now();
    }
  }

  /**
   * Register audio context for cleanup
   * @param {AudioContext} audioContext - Audio context to manage
   * @param {Object} resourceInfo - Resource information
   */
  registerAudioContext(audioContext, resourceInfo) {
    this.audioContexts.add({
      context: audioContext,
      info: resourceInfo
    });
  }

  /**
   * Register event listener for cleanup
   * @param {Object} listenerInfo - Event listener information
   * @param {Object} resourceInfo - Resource information
   */
  registerEventListener(listenerInfo, resourceInfo) {
    const { element, event, handler, options } = listenerInfo;
    const listenerId = `${element.constructor.name}_${event}_${Date.now()}`;
    
    this.eventListeners.set(listenerId, {
      element,
      event,
      handler,
      options,
      info: resourceInfo
    });
  }

  /**
   * Generate unique resource ID
   * @param {string} type - Resource type
   * @param {*} resource - The resource
   * @returns {string} Unique resource ID
   */
  generateResourceId(type, resource) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    
    switch (type) {
      case 'image':
        const url = typeof resource === 'string' ? resource : resource.src;
        return `${type}_${url.split('/').pop()}_${timestamp}`;
      case 'audio':
        return `${type}_${resource.constructor.name}_${timestamp}`;
      case 'timer':
        return `${type}_${resource}_${timestamp}`;
      default:
        return `${type}_${random}_${timestamp}`;
    }
  }

  /**
   * Estimate resource memory usage
   * @param {string} type - Resource type
   * @param {*} resource - The resource
   * @returns {number} Estimated size in bytes
   */
  estimateResourceSize(type, resource) {
    switch (type) {
      case 'image':
        // Rough estimate based on typical image sizes
        return 50 * 1024; // 50KB average
      case 'audio':
        return 1024 * 1024; // 1MB for audio context
      case 'timer':
        return 1024; // 1KB for timer overhead
      case 'eventListener':
        return 512; // 512 bytes for listener overhead
      default:
        return 1024; // 1KB default
    }
  }

  /**
   * Cleanup specific resource
   * @param {Object} resourceInfo - Resource information
   */
  cleanupResource(resourceInfo) {
    try {
      const { type, resource, cleanupFn } = resourceInfo;
      
      if (cleanupFn) {
        cleanupFn(resource);
        return;
      }
      
      // Default cleanup based on type
      switch (type) {
        case 'image':
          this.cleanupImage(resource);
          break;
        case 'audio':
          this.cleanupAudioContext(resource);
          break;
        case 'timer':
          this.cleanupTimer(resource);
          break;
        case 'eventListener':
          this.cleanupEventListener(resource);
          break;
      }
      
    } catch (error) {
      console.warn('[DiscoveryMemoryManager] Failed to cleanup resource:', error);
    }
  }

  /**
   * Cleanup image resources
   * @param {HTMLImageElement|string} image - Image to cleanup
   */
  cleanupImage(image) {
    if (typeof image === 'string') {
      this.imageCache.delete(image);
    } else if (image && image.src) {
      this.imageCache.delete(image.src);
      image.src = '';
      image.onload = null;
      image.onerror = null;
    }
  }

  /**
   * Cleanup audio context
   * @param {AudioContext} audioContext - Audio context to cleanup
   */
  cleanupAudioContext(audioContext) {
    if (audioContext && typeof audioContext.close === 'function') {
      audioContext.close().catch(error => {
        console.warn('[DiscoveryMemoryManager] Failed to close audio context:', error);
      });
    }
  }

  /**
   * Cleanup timer
   * @param {number} timerId - Timer ID to clear
   */
  cleanupTimer(timerId) {
    clearTimeout(timerId);
    clearInterval(timerId);
    this.timers.delete(timerId);
  }

  /**
   * Cleanup event listener
   * @param {Object} listenerInfo - Event listener information
   */
  cleanupEventListener(listenerInfo) {
    const { element, event, handler, options } = listenerInfo;
    if (element && typeof element.removeEventListener === 'function') {
      element.removeEventListener(event, handler, options);
    }
  }

  /**
   * Perform comprehensive cleanup
   * @param {boolean} force - Force cleanup even if memory usage is low
   */
  cleanup(force = false) {
    try {
      const startTime = Date.now();
      let cleanedCount = 0;
      
      // Check if cleanup is needed
      if (!force && !this.shouldCleanup()) {
        return;
      }
      
      // Cleanup expired images
      cleanedCount += this.cleanupExpiredImages();
      
      // Cleanup unused audio contexts
      cleanedCount += this.cleanupUnusedAudioContexts();
      
      // Cleanup old event listeners
      cleanedCount += this.cleanupOldEventListeners();
      
      // Cleanup expired timers
      cleanedCount += this.cleanupExpiredTimers();
      
      // Update stats
      this.memoryStats.cleanupCount++;
      this.memoryStats.lastCleanup = Date.now();
      
      const duration = Date.now() - startTime;
      console.debug(`[DiscoveryMemoryManager] Cleanup completed: ${cleanedCount} resources cleaned in ${duration}ms`);
      
    } catch (error) {
      console.warn('[DiscoveryMemoryManager] Cleanup failed:', error);
    }
  }

  /**
   * Check if cleanup should be performed
   * @returns {boolean} True if cleanup is needed
   */
  shouldCleanup() {
    try {
      const memoryUsage = this.estimateCurrentMemoryUsage();
      const resourceCount = this.managedResources.size;
      const timeSinceLastCleanup = Date.now() - (this.memoryStats.lastCleanup || Date.now());
      
      return (
        memoryUsage > this.maxMemoryUsage * 0.8 || // 80% of max memory
        resourceCount > 100 || // Too many resources
        timeSinceLastCleanup > this.cleanupInterval * 2 // Too long since last cleanup
      );
    } catch (error) {
      console.warn('[DiscoveryMemoryManager] Failed to check cleanup status:', error);
      return false;
    }
  }

  /**
   * Cleanup expired images from cache
   * @returns {number} Number of images cleaned
   */
  cleanupExpiredImages() {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes
    let cleanedCount = 0;
    
    for (const [url, imageInfo] of this.imageCache.entries()) {
      if (now - imageInfo.lastAccessed > maxAge) {
        this.imageCache.delete(url);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }

  /**
   * Cleanup unused audio contexts
   * @returns {number} Number of contexts cleaned
   */
  cleanupUnusedAudioContexts() {
    let cleanedCount = 0;
    
    for (const audioInfo of this.audioContexts) {
      const { context } = audioInfo;
      if (context.state === 'closed') {
        this.audioContexts.delete(audioInfo);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }

  /**
   * Cleanup old event listeners
   * @returns {number} Number of listeners cleaned
   */
  cleanupOldEventListeners() {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes
    let cleanedCount = 0;
    
    for (const [listenerId, listenerInfo] of this.eventListeners.entries()) {
      if (now - listenerInfo.info.timestamp > maxAge) {
        this.cleanupEventListener(listenerInfo);
        this.eventListeners.delete(listenerId);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }

  /**
   * Cleanup expired timers
   * @returns {number} Number of timers cleaned
   */
  cleanupExpiredTimers() {
    // Timers are automatically cleaned when they expire
    // This is mainly for tracking purposes
    return 0;
  }

  /**
   * Estimate current memory usage
   * @returns {number} Estimated memory usage in bytes
   */
  estimateCurrentMemoryUsage() {
    let totalUsage = 0;
    
    // Sum up all managed resources
    for (const resourceInfo of this.managedResources) {
      totalUsage += resourceInfo.size;
    }
    
    // Add image cache usage
    for (const imageInfo of this.imageCache.values()) {
      totalUsage += imageInfo.size;
    }
    
    this.memoryStats.currentUsage = totalUsage;
    if (totalUsage > this.memoryStats.peakUsage) {
      this.memoryStats.peakUsage = totalUsage;
    }
    
    return totalUsage;
  }

  /**
   * Get memory statistics
   * @returns {Object} Memory usage statistics
   */
  getMemoryStats() {
    try {
      return {
        ...this.memoryStats,
        currentUsage: this.estimateCurrentMemoryUsage(),
        managedResources: this.managedResources.size,
        imageCache: this.imageCache.size,
        audioContexts: this.audioContexts.size,
        eventListeners: this.eventListeners.size,
        timers: this.timers.size
      };
    } catch (error) {
      console.warn('[DiscoveryMemoryManager] Failed to get memory stats:', error);
      return {
        ...this.memoryStats,
        currentUsage: 0,
        managedResources: this.managedResources.size,
        imageCache: this.imageCache.size,
        audioContexts: this.audioContexts.size,
        eventListeners: this.eventListeners.size,
        timers: this.timers.size
      };
    }
  }

  /**
   * Start memory monitoring
   */
  startMemoryMonitoring() {
    this.memoryMonitorTimer = setInterval(() => {
      this.estimateCurrentMemoryUsage();
      
      // Perform cleanup if needed
      if (this.shouldCleanup()) {
        this.cleanup();
      }
    }, this.memoryCheckInterval);
    
    this.cleanupIntervalTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Stop memory monitoring and cleanup all resources
   */
  destroy() {
    // Clear monitoring timers
    if (this.memoryMonitorTimer) {
      clearInterval(this.memoryMonitorTimer);
      this.memoryMonitorTimer = null;
    }
    
    if (this.cleanupIntervalTimer) {
      clearInterval(this.cleanupIntervalTimer);
      this.cleanupIntervalTimer = null;
    }
    
    // Cleanup all managed resources
    for (const resourceInfo of this.managedResources) {
      this.cleanupResource(resourceInfo);
    }
    
    // Clear all collections
    this.managedResources.clear();
    this.eventListeners.clear();
    this.timers.clear();
    this.imageCache.clear();
    this.audioContexts.clear();
    
    console.debug('[DiscoveryMemoryManager] Memory manager destroyed');
  }

  /**
   * Force garbage collection if available (development only)
   */
  forceGarbageCollection() {
    if (typeof window !== 'undefined' && window.gc) {
      try {
        window.gc();
        console.debug('[DiscoveryMemoryManager] Forced garbage collection');
      } catch (error) {
        console.warn('[DiscoveryMemoryManager] Failed to force garbage collection:', error);
      }
    }
  }
}

export default DiscoveryMemoryManager;