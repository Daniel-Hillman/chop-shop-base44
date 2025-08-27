/**
 * useSequencerMemoryManagement - React hook for sequencer memory management
 * 
 * Provides memory management functionality for sequencer components including
 * automatic cleanup on unmount, memory usage monitoring, and performance alerts.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import sequencerMemoryManager from '../services/sequencer/SequencerMemoryManager.js';
import sequencerPerformanceMonitor from '../services/sequencer/SequencerPerformanceMonitor.js';

/**
 * Hook for managing sequencer memory and performance
 * @param {Object} options - Configuration options
 * @returns {Object} Memory management utilities
 */
export function useSequencerMemoryManagement(options = {}) {
  const {
    autoCleanupOnUnmount = true,
    monitoringEnabled = true,
    alertsEnabled = true,
    cleanupThreshold = 0.8 // 80% memory usage threshold
  } = options;

  const [memoryUsage, setMemoryUsage] = useState(null);
  const [performanceAlerts, setPerformanceAlerts] = useState([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  const alertCallbackRef = useRef(null);
  const monitoringIntervalRef = useRef(null);

  /**
   * Start memory monitoring
   */
  const startMonitoring = useCallback(() => {
    if (!monitoringEnabled || isMonitoring) return;

    // Start memory manager monitoring
    sequencerMemoryManager.startMonitoring();
    
    // Start performance monitor
    sequencerPerformanceMonitor.startMonitoring();
    
    // Set up alert callback
    if (alertsEnabled) {
      alertCallbackRef.current = (alert) => {
        setPerformanceAlerts(prev => [...prev.slice(-9), alert]); // Keep last 10 alerts
      };
      sequencerPerformanceMonitor.onAlert(alertCallbackRef.current);
    }
    
    // Set up memory usage monitoring
    monitoringIntervalRef.current = setInterval(() => {
      const usage = sequencerMemoryManager.getMemoryUsage();
      setMemoryUsage(usage);
      
      // Check if cleanup is needed
      const systemMemory = sequencerPerformanceMonitor.baseMonitor.getCurrentMemoryUsage();
      if (!systemMemory.unavailable) {
        const memoryRatio = systemMemory.usedJSHeapSize / systemMemory.jsHeapSizeLimit;
        if (memoryRatio > cleanupThreshold) {
          performCleanup({ clearCache: true });
        }
      }
    }, 2000); // Check every 2 seconds
    
    setIsMonitoring(true);
  }, [monitoringEnabled, alertsEnabled, cleanupThreshold, isMonitoring]);

  /**
   * Stop memory monitoring
   */
  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return;

    // Stop memory manager monitoring
    sequencerMemoryManager.stopMonitoring();
    
    // Stop performance monitor
    sequencerPerformanceMonitor.stopMonitoring();
    
    // Remove alert callback
    if (alertCallbackRef.current) {
      sequencerPerformanceMonitor.removeAlertCallback(alertCallbackRef.current);
      alertCallbackRef.current = null;
    }
    
    // Clear monitoring interval
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }
    
    setIsMonitoring(false);
  }, [isMonitoring]);

  /**
   * Perform memory cleanup
   */
  const performCleanup = useCallback((cleanupOptions = {}) => {
    const defaultOptions = {
      clearCache: true,
      clearPatterns: false,
      clearSamples: false,
      clearAudioBuffers: false,
      force: false
    };
    
    const options = { ...defaultOptions, ...cleanupOptions };
    const freedMemory = sequencerMemoryManager.cleanup(options);
    
    // Update memory usage after cleanup
    setTimeout(() => {
      const usage = sequencerMemoryManager.getMemoryUsage();
      setMemoryUsage(usage);
    }, 100);
    
    return freedMemory;
  }, []);

  /**
   * Get current memory usage
   */
  const getMemoryUsage = useCallback(() => {
    return sequencerMemoryManager.getMemoryUsage();
  }, []);

  /**
   * Get performance report
   */
  const getPerformanceReport = useCallback(() => {
    return sequencerPerformanceMonitor.getPerformanceReport();
  }, []);

  /**
   * Clear performance alerts
   */
  const clearAlerts = useCallback(() => {
    setPerformanceAlerts([]);
  }, []);

  /**
   * Force garbage collection if available
   */
  const forceGarbageCollection = useCallback(() => {
    return sequencerPerformanceMonitor.baseMonitor.triggerGC();
  }, []);

  /**
   * Get memory optimization recommendations
   */
  const getOptimizationRecommendations = useCallback(() => {
    return sequencerPerformanceMonitor.getPerformanceRecommendations();
  }, []);

  // Start monitoring on mount
  useEffect(() => {
    if (monitoringEnabled) {
      startMonitoring();
    }
    
    return () => {
      stopMonitoring();
    };
  }, [monitoringEnabled, startMonitoring, stopMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoCleanupOnUnmount) {
        // Perform comprehensive cleanup
        sequencerMemoryManager.cleanup({
          clearCache: true,
          clearPatterns: false, // Keep patterns for potential reload
          clearSamples: true,
          clearAudioBuffers: true
        });
        
        // Stop all monitoring
        sequencerMemoryManager.stopMonitoring();
        sequencerPerformanceMonitor.stopMonitoring();
      }
    };
  }, [autoCleanupOnUnmount]);

  return {
    // State
    memoryUsage,
    performanceAlerts,
    isMonitoring,
    
    // Actions
    startMonitoring,
    stopMonitoring,
    performCleanup,
    clearAlerts,
    forceGarbageCollection,
    
    // Getters
    getMemoryUsage,
    getPerformanceReport,
    getOptimizationRecommendations,
    
    // Utilities
    formatBytes: (bytes) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
  };
}

export default useSequencerMemoryManagement;