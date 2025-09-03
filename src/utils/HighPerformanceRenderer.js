/**
 * @fileoverview High Performance Renderer
 * Optimized rendering system that prevents UI updates from affecting audio timing
 * Uses RAF batching, virtual scrolling, and efficient DOM updates
 */

/**
 * High-performance renderer for sequencer UI
 * Prevents visual updates from interfering with audio timing
 */
class HighPerformanceRenderer {
  constructor() {
    /** @type {Set<Function>} */
    this.pendingUpdates = new Set();
    
    /** @type {number|null} */
    this.rafId = null;
    
    /** @type {boolean} */
    this.isRendering = false;
    
    /** @type {Map<string, any>} */
    this.renderCache = new Map();
    
    /** @type {IntersectionObserver|null} */
    this.visibilityObserver = null;
    
    /** @type {Set<Element>} */
    this.visibleElements = new Set();
    
    /** @type {Object} */
    this.performanceMetrics = {
      frameTime: 0,
      droppedFrames: 0,
      renderCalls: 0,
      cacheHits: 0
    };
    
    this.initializeVisibilityObserver();
  }

  /**
   * Initialize intersection observer for visibility tracking
   * @private
   * @returns {void}
   */
  initializeVisibilityObserver() {
    this.visibilityObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.visibleElements.add(entry.target);
          } else {
            this.visibleElements.delete(entry.target);
          }
        });
      },
      {
        rootMargin: '50px', // Pre-render elements slightly outside viewport
        threshold: 0
      }
    );
  }

  /**
   * Schedule a render update with batching
   * @param {Function} updateFunction - Function to execute during render
   * @param {string} key - Optional cache key for deduplication
   * @returns {void}
   */
  scheduleUpdate(updateFunction, key = null) {
    if (key && this.renderCache.has(key)) {
      this.performanceMetrics.cacheHits++;
      return;
    }

    this.pendingUpdates.add(updateFunction);
    
    if (key) {
      this.renderCache.set(key, true);
    }

    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => this.executeRender());
    }
  }

  /**
   * Execute batched render updates
   * @private
   * @returns {void}
   */
  executeRender() {
    if (this.isRendering) {
      return;
    }

    this.isRendering = true;
    const startTime = performance.now();

    try {
      // Execute all pending updates in a single frame
      this.pendingUpdates.forEach(updateFunction => {
        try {
          updateFunction();
        } catch (error) {
          console.error('Render update error:', error);
        }
      });

      this.pendingUpdates.clear();
      this.renderCache.clear();
      
      // Update performance metrics
      this.performanceMetrics.frameTime = performance.now() - startTime;
      this.performanceMetrics.renderCalls++;
      
      // Check for dropped frames (>16.67ms = 60fps)
      if (this.performanceMetrics.frameTime > 16.67) {
        this.performanceMetrics.droppedFrames++;
      }

    } finally {
      this.isRendering = false;
      this.rafId = null;
    }
  }

  /**
   * Create optimized step indicator component
   * @param {number} stepIndex - Step index
   * @param {boolean} isActive - Whether step is currently active
   * @param {boolean} isTriggered - Whether step is triggered
   * @returns {HTMLElement} Optimized step element
   */
  createOptimizedStepIndicator(stepIndex, isActive, isTriggered) {
    const element = document.createElement('div');
    element.className = 'sequencer-step';
    element.dataset.step = stepIndex;
    
    // Use CSS transforms for hardware acceleration
    element.style.transform = 'translateZ(0)';
    element.style.willChange = 'transform, opacity';
    
    // Pre-calculate styles for different states
    const baseStyles = {
      width: '20px',
      height: '20px',
      borderRadius: '4px',
      transition: 'none', // Disable transitions for performance
      cursor: 'pointer'
    };
    
    Object.assign(element.style, baseStyles);
    
    this.updateStepIndicator(element, isActive, isTriggered);
    
    return element;
  }

  /**
   * Update step indicator with minimal DOM manipulation
   * @param {HTMLElement} element - Step element
   * @param {boolean} isActive - Whether step is currently active
   * @param {boolean} isTriggered - Whether step is triggered
   * @returns {void}
   */
  updateStepIndicator(element, isActive, isTriggered) {
    const cacheKey = `step-${element.dataset.step}-${isActive}-${isTriggered}`;
    
    this.scheduleUpdate(() => {
      // Only update if element is visible
      if (!this.visibleElements.has(element)) {
        return;
      }

      let backgroundColor, opacity, transform;
      
      if (isActive) {
        backgroundColor = '#3b82f6'; // Blue for active
        opacity = '1';
        transform = 'translateZ(0) scale(1.1)';
      } else if (isTriggered) {
        backgroundColor = '#10b981'; // Green for triggered
        opacity = '0.8';
        transform = 'translateZ(0) scale(1)';
      } else {
        backgroundColor = '#374151'; // Gray for inactive
        opacity = '0.6';
        transform = 'translateZ(0) scale(1)';
      }
      
      // Batch style updates
      element.style.backgroundColor = backgroundColor;
      element.style.opacity = opacity;
      element.style.transform = transform;
    }, cacheKey);
  }

  /**
   * Create virtual scrolling container for large lists
   * @param {Array} items - Items to render
   * @param {Function} renderItem - Function to render individual items
   * @param {number} itemHeight - Height of each item
   * @returns {HTMLElement} Virtual scrolling container
   */
  createVirtualScrollContainer(items, renderItem, itemHeight = 50) {
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.overflow = 'auto';
    container.style.height = '300px'; // Fixed height for virtual scrolling
    
    const viewport = document.createElement('div');
    viewport.style.height = `${items.length * itemHeight}px`;
    container.appendChild(viewport);
    
    const visibleItems = new Map();
    
    const updateVisibleItems = () => {
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(
        items.length - 1,
        Math.ceil((scrollTop + containerHeight) / itemHeight)
      );
      
      // Remove items that are no longer visible
      visibleItems.forEach((element, index) => {
        if (index < startIndex || index > endIndex) {
          element.remove();
          visibleItems.delete(index);
        }
      });
      
      // Add newly visible items
      for (let i = startIndex; i <= endIndex; i++) {
        if (!visibleItems.has(i)) {
          const element = renderItem(items[i], i);
          element.style.position = 'absolute';
          element.style.top = `${i * itemHeight}px`;
          element.style.height = `${itemHeight}px`;
          element.style.width = '100%';
          
          viewport.appendChild(element);
          visibleItems.set(i, element);
        }
      }
    };
    
    // Throttled scroll handler
    let scrollTimeout;
    container.addEventListener('scroll', () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      scrollTimeout = setTimeout(updateVisibleItems, 16); // ~60fps
    });
    
    // Initial render
    updateVisibleItems();
    
    return container;
  }

  /**
   * Optimize element for hardware acceleration
   * @param {HTMLElement} element - Element to optimize
   * @returns {void}
   */
  optimizeElement(element) {
    // Enable hardware acceleration
    element.style.transform = 'translateZ(0)';
    element.style.backfaceVisibility = 'hidden';
    element.style.perspective = '1000px';
    
    // Optimize for animations
    element.style.willChange = 'transform, opacity';
    
    // Track visibility
    this.visibilityObserver.observe(element);
  }

  /**
   * Create optimized animation using CSS transforms
   * @param {HTMLElement} element - Element to animate
   * @param {Object} keyframes - Animation keyframes
   * @param {number} duration - Animation duration in ms
   * @returns {Animation} Web Animation API animation
   */
  createOptimizedAnimation(element, keyframes, duration = 300) {
    // Use Web Animation API for better performance
    const animation = element.animate(keyframes, {
      duration,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'forwards'
    });
    
    // Clean up after animation
    animation.addEventListener('finish', () => {
      animation.cancel();
    });
    
    return animation;
  }

  /**
   * Batch DOM reads to prevent layout thrashing
   * @param {Function[]} readFunctions - Functions that read from DOM
   * @returns {Array} Results from read functions
   */
  batchDOMReads(readFunctions) {
    const results = [];
    
    this.scheduleUpdate(() => {
      readFunctions.forEach(readFn => {
        try {
          results.push(readFn());
        } catch (error) {
          console.error('DOM read error:', error);
          results.push(null);
        }
      });
    });
    
    return results;
  }

  /**
   * Batch DOM writes to prevent layout thrashing
   * @param {Function[]} writeFunctions - Functions that write to DOM
   * @returns {void}
   */
  batchDOMWrites(writeFunctions) {
    this.scheduleUpdate(() => {
      writeFunctions.forEach(writeFn => {
        try {
          writeFn();
        } catch (error) {
          console.error('DOM write error:', error);
        }
      });
    });
  }

  /**
   * Get current performance metrics
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  /**
   * Reset performance metrics
   * @returns {void}
   */
  resetPerformanceMetrics() {
    this.performanceMetrics = {
      frameTime: 0,
      droppedFrames: 0,
      renderCalls: 0,
      cacheHits: 0
    };
  }

  /**
   * Cleanup resources
   * @returns {void}
   */
  cleanup() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    
    if (this.visibilityObserver) {
      this.visibilityObserver.disconnect();
      this.visibilityObserver = null;
    }
    
    this.pendingUpdates.clear();
    this.renderCache.clear();
    this.visibleElements.clear();
  }
}

export { HighPerformanceRenderer };