/**
 * LazyLoadingManager - Handles lazy loading for components and images
 * Implements intersection observer for efficient loading
 */

class LazyLoadingManager {
  constructor(options = {}) {
    this.rootMargin = options.rootMargin || '50px';
    this.threshold = options.threshold || 0.1;
    this.loadingClass = options.loadingClass || 'lazy-loading';
    this.loadedClass = options.loadedClass || 'lazy-loaded';
    this.errorClass = options.errorClass || 'lazy-error';
    
    // Track loading states
    this.loadingElements = new Map();
    this.loadedElements = new Set();
    this.failedElements = new Set();
    
    // Performance tracking
    this.stats = {
      totalElements: 0,
      loadedElements: 0,
      failedElements: 0,
      averageLoadTime: 0,
      loadTimes: []
    };
    
    // Initialize intersection observer
    this.initializeObserver();
    
    // Bind methods
    this.observeElement = this.observeElement.bind(this);
    this.unobserveElement = this.unobserveElement.bind(this);
    this.loadImage = this.loadImage.bind(this);
  }

  /**
   * Initialize intersection observer
   */
  initializeObserver() {
    if (!('IntersectionObserver' in window)) {
      console.warn('[LazyLoadingManager] IntersectionObserver not supported, falling back to immediate loading');
      this.observer = null;
      return;
    }

    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        rootMargin: this.rootMargin,
        threshold: this.threshold
      }
    );
  }

  /**
   * Handle intersection observer callback
   * @param {Array} entries - Intersection observer entries
   */
  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;
        const loadingInfo = this.loadingElements.get(element);
        
        if (loadingInfo && !this.loadedElements.has(element)) {
          this.loadElement(element, loadingInfo);
        }
      }
    });
  }

  /**
   * Observe element for lazy loading
   * @param {HTMLElement} element - Element to observe
   * @param {Object} options - Loading options
   */
  observeElement(element, options = {}) {
    if (!element) {
      console.warn('[LazyLoadingManager] Cannot observe null element');
      return;
    }

    try {
      const loadingInfo = {
        type: options.type || 'image',
        src: options.src || element.dataset.src,
        srcset: options.srcset || element.dataset.srcset,
        callback: options.callback,
        fallback: options.fallback,
        startTime: Date.now()
      };

      this.loadingElements.set(element, loadingInfo);
      this.stats.totalElements++;

      // Add loading class
      if (element.classList) {
        element.classList.add(this.loadingClass);
      }

      if (this.observer) {
        this.observer.observe(element);
      } else {
        // Fallback for browsers without IntersectionObserver
        this.loadElement(element, loadingInfo);
      }
    } catch (error) {
      console.warn('[LazyLoadingManager] Failed to observe element:', error);
    }
  }

  /**
   * Stop observing element
   * @param {HTMLElement} element - Element to unobserve
   */
  unobserveElement(element) {
    if (!element) return;

    if (this.observer) {
      this.observer.unobserve(element);
    }

    this.loadingElements.delete(element);
    element.classList.remove(this.loadingClass);
  }

  /**
   * Load element based on type
   * @param {HTMLElement} element - Element to load
   * @param {Object} loadingInfo - Loading information
   */
  async loadElement(element, loadingInfo) {
    try {
      const { type, callback } = loadingInfo;

      switch (type) {
        case 'image':
          await this.loadImage(element, loadingInfo);
          break;
        case 'component':
          await this.loadComponent(element, loadingInfo);
          break;
        case 'custom':
          if (callback) {
            await callback(element, loadingInfo);
          }
          break;
        default:
          console.warn(`[LazyLoadingManager] Unknown loading type: ${type}`);
      }

      this.markAsLoaded(element, loadingInfo);

    } catch (error) {
      this.markAsFailed(element, loadingInfo, error);
    }
  }

  /**
   * Load image with fallback support
   * @param {HTMLImageElement} element - Image element to load
   * @param {Object} loadingInfo - Loading information
   */
  loadImage(element, loadingInfo) {
    return new Promise((resolve, reject) => {
      const { src, srcset, fallback } = loadingInfo;

      if (!src && !srcset) {
        reject(new Error('No source provided for image'));
        return;
      }

      const img = new Image();
      
      img.onload = () => {
        // Update element attributes
        if (src) element.src = src;
        if (srcset) element.srcset = srcset;
        
        // Remove data attributes
        delete element.dataset.src;
        delete element.dataset.srcset;
        
        resolve();
      };

      img.onerror = () => {
        if (fallback) {
          // Try fallback image
          const fallbackImg = new Image();
          fallbackImg.onload = () => {
            element.src = fallback;
            resolve();
          };
          fallbackImg.onerror = () => {
            reject(new Error('Failed to load image and fallback'));
          };
          fallbackImg.src = fallback;
        } else {
          reject(new Error('Failed to load image'));
        }
      };

      // Start loading
      img.src = src;
    });
  }

  /**
   * Load component dynamically
   * @param {HTMLElement} element - Element to load component into
   * @param {Object} loadingInfo - Loading information
   */
  async loadComponent(element, loadingInfo) {
    const { src, callback } = loadingInfo;

    if (!src && !callback) {
      throw new Error('No component source or callback provided');
    }

    if (callback) {
      // Use custom callback for component loading
      await callback(element, loadingInfo);
    } else {
      // Dynamic import for component
      const module = await import(src);
      const Component = module.default || module;
      
      // This would need to be integrated with your React rendering system
      // For now, just mark as loaded
      element.dataset.componentLoaded = 'true';
    }
  }

  /**
   * Mark element as successfully loaded
   * @param {HTMLElement} element - Loaded element
   * @param {Object} loadingInfo - Loading information
   */
  markAsLoaded(element, loadingInfo) {
    const loadTime = Date.now() - loadingInfo.startTime;
    
    // Update classes
    element.classList.remove(this.loadingClass);
    element.classList.add(this.loadedClass);
    
    // Update tracking
    this.loadedElements.add(element);
    this.loadingElements.delete(element);
    
    // Update stats
    this.stats.loadedElements++;
    this.stats.loadTimes.push(loadTime);
    this.updateAverageLoadTime();
    
    // Stop observing
    if (this.observer) {
      this.observer.unobserve(element);
    }

    console.debug(`[LazyLoadingManager] Element loaded in ${loadTime}ms`);
  }

  /**
   * Mark element as failed to load
   * @param {HTMLElement} element - Failed element
   * @param {Object} loadingInfo - Loading information
   * @param {Error} error - Loading error
   */
  markAsFailed(element, loadingInfo, error) {
    // Update classes
    element.classList.remove(this.loadingClass);
    element.classList.add(this.errorClass);
    
    // Update tracking
    this.failedElements.add(element);
    this.loadingElements.delete(element);
    
    // Update stats
    this.stats.failedElements++;
    
    // Stop observing
    if (this.observer) {
      this.observer.unobserve(element);
    }

    console.warn('[LazyLoadingManager] Element failed to load:', error);
  }

  /**
   * Update average load time
   */
  updateAverageLoadTime() {
    try {
      const { loadTimes } = this.stats;
      if (loadTimes && loadTimes.length > 0) {
        const sum = loadTimes.reduce((acc, time) => acc + time, 0);
        this.stats.averageLoadTime = sum / loadTimes.length;
        
        // Keep only recent load times to prevent memory growth
        if (loadTimes.length > 100) {
          this.stats.loadTimes = loadTimes.slice(-50);
        }
      }
    } catch (error) {
      console.warn('[LazyLoadingManager] Failed to update average load time:', error);
    }
  }

  /**
   * Preload images for better performance
   * @param {Array} imageSrcs - Array of image URLs to preload
   * @param {Object} options - Preload options
   */
  preloadImages(imageSrcs, options = {}) {
    const { priority = 'low', timeout = 10000 } = options;
    
    return Promise.allSettled(
      imageSrcs.map(src => this.preloadSingleImage(src, timeout))
    );
  }

  /**
   * Preload single image
   * @param {string} src - Image URL
   * @param {number} timeout - Timeout in milliseconds
   */
  preloadSingleImage(src, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      const timeoutId = setTimeout(() => {
        reject(new Error(`Image preload timeout: ${src}`));
      }, timeout);
      
      img.onload = () => {
        clearTimeout(timeoutId);
        resolve(src);
      };
      
      img.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to preload image: ${src}`));
      };
      
      img.src = src;
    });
  }

  /**
   * Get loading statistics
   * @returns {Object} Loading statistics
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalElements > 0 
        ? (this.stats.loadedElements / this.stats.totalElements) * 100 
        : 0,
      failureRate: this.stats.totalElements > 0 
        ? (this.stats.failedElements / this.stats.totalElements) * 100 
        : 0,
      pendingElements: this.loadingElements.size
    };
  }

  /**
   * Reset all loading states
   */
  reset() {
    // Clear all observations
    if (this.observer) {
      this.observer.disconnect();
    }
    
    // Clear tracking
    this.loadingElements.clear();
    this.loadedElements.clear();
    this.failedElements.clear();
    
    // Reset stats
    this.stats = {
      totalElements: 0,
      loadedElements: 0,
      failedElements: 0,
      averageLoadTime: 0,
      loadTimes: []
    };
    
    // Reinitialize observer
    this.initializeObserver();
  }

  /**
   * Destroy lazy loading manager
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    this.loadingElements.clear();
    this.loadedElements.clear();
    this.failedElements.clear();
  }
}

// Utility functions for React integration would be in separate files
// This keeps the core manager framework-agnostic

export default LazyLoadingManager;