/**
 * Performance optimization utilities for sampler components
 * Provides debouncing, throttling, and memoization helpers
 */

import { useCallback, useRef, useMemo } from 'react';

/**
 * Debounce hook for delaying function execution
 * @param {Function} callback - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export const useDebounce = (callback, delay) => {
  const timeoutRef = useRef(null);
  
  return useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
};

/**
 * Throttle hook for limiting function execution frequency
 * @param {Function} callback - Function to throttle
 * @param {number} delay - Minimum delay between executions
 * @returns {Function} Throttled function
 */
export const useThrottle = (callback, delay) => {
  const lastRun = useRef(Date.now());
  
  return useCallback((...args) => {
    if (Date.now() - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = Date.now();
    }
  }, [callback, delay]);
};

/**
 * Memoized step key generator for grid components
 * @param {number} trackIndex - Track index
 * @param {number} stepIndex - Step index
 * @returns {string} Unique step key
 */
export const useStepKey = (trackIndex, stepIndex) => {
  return useMemo(() => `${trackIndex}-${stepIndex}`, [trackIndex, stepIndex]);
};

/**
 * Memoized track data processor
 * @param {Array} chops - Array of chop objects
 * @param {Object} pattern - Pattern data
 * @param {number} trackCount - Number of tracks
 * @param {number} stepCount - Number of steps per track
 * @returns {Array} Processed track data
 */
export const useProcessedTracks = (chops, pattern, trackCount = 16, stepCount = 16) => {
  return useMemo(() => {
    return Array.from({ length: trackCount }, (_, trackIndex) => {
      const chop = chops[trackIndex] || null;
      const trackSteps = pattern?.tracks?.[trackIndex]?.steps || 
        Array.from({ length: stepCount }, () => false);
      
      return {
        id: `track_${trackIndex}`,
        trackIndex,
        chop,
        steps: trackSteps,
        hasChop: !!chop,
        chopColor: chop?.color || '#06b6d4'
      };
    });
  }, [chops, pattern, trackCount, stepCount]);
};

/**
 * Performance monitoring hook for development
 * @param {string} componentName - Name of the component being monitored
 * @param {Array} dependencies - Dependencies to monitor for changes
 */
export const usePerformanceMonitor = (componentName, dependencies = []) => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  
  if (process.env.NODE_ENV === 'development') {
    renderCount.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    
    if (renderCount.current % 10 === 0) {
      console.log(`[Performance] ${componentName}: ${renderCount.current} renders, ${timeSinceLastRender}ms since last`);
    }
    
    lastRenderTime.current = now;
  }
};

/**
 * Batch state updates to prevent excessive re-renders
 * @param {Function} setState - State setter function
 * @param {number} delay - Batching delay in milliseconds
 * @returns {Function} Batched state setter
 */
export const useBatchedState = (setState, delay = 16) => {
  const pendingUpdates = useRef([]);
  const timeoutRef = useRef(null);
  
  return useCallback((update) => {
    pendingUpdates.current.push(update);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      const updates = pendingUpdates.current;
      pendingUpdates.current = [];
      
      // Apply all pending updates in a single batch
      setState(prevState => {
        return updates.reduce((state, update) => {
          return typeof update === 'function' ? update(state) : update;
        }, prevState);
      });
    }, delay);
  }, [setState, delay]);
};

/**
 * Optimized event handler creator that prevents unnecessary re-renders
 * @param {Function} handler - Event handler function
 * @param {Array} dependencies - Dependencies for the handler
 * @returns {Function} Optimized event handler
 */
export const useOptimizedHandler = (handler, dependencies = []) => {
  return useCallback(handler, dependencies);
};

/**
 * Memory-efficient array comparison for preventing unnecessary re-renders
 * @param {Array} arr1 - First array
 * @param {Array} arr2 - Second array
 * @returns {boolean} Whether arrays are equal
 */
export const shallowArrayEqual = (arr1, arr2) => {
  if (arr1.length !== arr2.length) return false;
  
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }
  
  return true;
};

/**
 * Shallow object comparison for memo optimization
 * @param {Object} obj1 - First object
 * @param {Object} obj2 - Second object
 * @returns {boolean} Whether objects are shallowly equal
 */
export const shallowObjectEqual = (obj1, obj2) => {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (let key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }
  
  return true;
};

/**
 * Create a memoized component comparison function
 * @param {Array} propKeys - Keys to compare for equality
 * @returns {Function} Comparison function for React.memo
 */
export const createMemoComparison = (propKeys) => {
  return (prevProps, nextProps) => {
    for (let key of propKeys) {
      if (prevProps[key] !== nextProps[key]) {
        return false;
      }
    }
    return true;
  };
};

/**
 * Advanced performance optimization hook for rapid interactions
 * Combines throttling and debouncing for optimal user experience
 * @param {Function} callback - Function to optimize
 * @param {number} throttleDelay - Throttle delay for immediate feedback
 * @param {number} debounceDelay - Debounce delay for final processing
 * @returns {Function} Optimized function
 */
export const useOptimizedInteraction = (callback, throttleDelay = 16, debounceDelay = 100) => {
  const throttledCallback = useThrottle(callback, throttleDelay);
  const debouncedCallback = useDebounce(callback, debounceDelay);
  
  return useCallback((...args) => {
    // Immediate throttled response for UI feedback
    throttledCallback(...args);
    // Debounced final processing
    debouncedCallback(...args);
  }, [throttledCallback, debouncedCallback]);
};

/**
 * Memory-efficient grid virtualization hook
 * Only renders visible grid cells for large grids
 * @param {number} totalItems - Total number of items
 * @param {number} itemHeight - Height of each item
 * @param {number} containerHeight - Height of container
 * @param {number} scrollTop - Current scroll position
 * @returns {Object} Virtualization data
 */
export const useVirtualization = (totalItems, itemHeight, containerHeight, scrollTop = 0) => {
  return useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(startIndex + visibleCount + 1, totalItems);
    const offsetY = startIndex * itemHeight;
    
    return {
      startIndex,
      endIndex,
      offsetY,
      visibleCount,
      totalHeight: totalItems * itemHeight
    };
  }, [totalItems, itemHeight, containerHeight, scrollTop]);
};

/**
 * Efficient event delegation hook for grid components
 * Reduces the number of event listeners by using event delegation
 * @param {string} eventType - Event type to listen for
 * @param {Function} handler - Event handler function
 * @param {Object} containerRef - Ref to container element
 */
export const useEventDelegation = (eventType, handler, containerRef) => {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const delegatedHandler = (event) => {
      // Find the target element with data attributes
      const target = event.target.closest('[data-track][data-step]');
      if (target) {
        const trackIndex = parseInt(target.dataset.track, 10);
        const stepIndex = parseInt(target.dataset.step, 10);
        
        if (!isNaN(trackIndex) && !isNaN(stepIndex)) {
          handler(trackIndex, stepIndex, event);
        }
      }
    };
    
    container.addEventListener(eventType, delegatedHandler);
    return () => container.removeEventListener(eventType, delegatedHandler);
  }, [eventType, handler, containerRef]);
};

/**
 * Performance-optimized animation frame hook
 * Uses requestAnimationFrame for smooth animations
 * @param {Function} callback - Animation callback
 * @param {Array} dependencies - Dependencies to watch
 */
export const useAnimationFrame = (callback, dependencies = []) => {
  const requestRef = useRef();
  
  const animate = useCallback(() => {
    callback();
    requestRef.current = requestAnimationFrame(animate);
  }, dependencies);
  
  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate]);
};

/**
 * Efficient CSS-in-JS style generator with caching
 * @param {Function} styleGenerator - Function that generates styles
 * @param {Array} dependencies - Dependencies for style calculation
 * @returns {Object} Cached styles
 */
export const useCachedStyles = (styleGenerator, dependencies = []) => {
  const cacheRef = useRef(new Map());
  
  return useMemo(() => {
    const key = JSON.stringify(dependencies);
    
    if (cacheRef.current.has(key)) {
      return cacheRef.current.get(key);
    }
    
    const styles = styleGenerator(...dependencies);
    cacheRef.current.set(key, styles);
    
    // Limit cache size to prevent memory leaks
    if (cacheRef.current.size > 100) {
      const firstKey = cacheRef.current.keys().next().value;
      cacheRef.current.delete(firstKey);
    }
    
    return styles;
  }, dependencies);
};