/**
 * Discovery Performance Monitor Demo
 * 
 * This demo shows how to use the DiscoveryPerformanceMonitor
 * to track performance metrics in the sample discovery feature.
 */

import DiscoveryPerformanceMonitor from './DiscoveryPerformanceMonitor.js';
import discoveryPerformanceLogger from '../../utils/discoveryPerformanceLogger.js';

// Create monitor instance
const monitor = new DiscoveryPerformanceMonitor();

// Demo function to simulate page load
function simulatePageLoad() {
  console.log('🚀 Starting page load simulation...');
  
  // Start timing page load
  monitor.startTiming('pageLoad');
  
  // Simulate some async work
  setTimeout(() => {
    // End timing and get duration
    const duration = monitor.endTiming('pageLoad');
    
    // Log the page load performance
    discoveryPerformanceLogger.logPageLoad({
      totalPageLoad: duration,
      domContentLoaded: duration * 0.6,
      loadComplete: duration * 0.2
    });
    
    console.log(`✅ Page loaded in ${duration.toFixed(2)}ms`);
  }, Math.random() * 2000 + 500); // Random delay between 500-2500ms
}

// Demo function to simulate filter operation
function simulateFilterOperation() {
  console.log('🔍 Starting filter operation simulation...');
  
  monitor.startTiming('filterResponse');
  
  // Simulate filter processing
  setTimeout(() => {
    const duration = monitor.endTiming('filterResponse');
    
    // Track filter response
    monitor.trackFilterResponse({
      genres: ['soul', 'jazz'],
      yearRange: { start: 1960, end: 1980 }
    }, 25);
    
    // Log filter operation
    discoveryPerformanceLogger.logFilterOperation({
      duration,
      context: { filterCount: 2, resultCount: 25 }
    });
    
    console.log(`✅ Filter operation completed in ${duration.toFixed(2)}ms`);
  }, Math.random() * 1000 + 200); // Random delay between 200-1200ms
}

// Demo function to simulate API call
function simulateAPICall() {
  console.log('🌐 Starting API call simulation...');
  
  monitor.startTiming('apiCall_youtube');
  
  // Simulate API call
  setTimeout(() => {
    const duration = monitor.endTiming('apiCall_youtube');
    const success = Math.random() > 0.2; // 80% success rate
    
    // Track API call
    monitor.trackAPICall('youtube', success, success ? 1024 : 0);
    
    // Log API call
    discoveryPerformanceLogger.logAPICall({
      duration,
      context: { success, apiName: 'youtube' }
    });
    
    if (success) {
      console.log(`✅ API call completed in ${duration.toFixed(2)}ms`);
    } else {
      console.log(`❌ API call failed after ${duration.toFixed(2)}ms`);
    }
  }, Math.random() * 3000 + 500); // Random delay between 500-3500ms
}

// Demo function to show performance summary
function showPerformanceSummary() {
  console.log('\n📊 Performance Summary:');
  
  const debugInfo = monitor.getDebugInfo();
  const logSummary = discoveryPerformanceLogger.getPerformanceSummary();
  
  console.log('Monitor Stats:', {
    metricsCount: debugInfo.metricsCount,
    activeTimers: debugInfo.activeTimers,
    isEnabled: debugInfo.isEnabled
  });
  
  console.log('Logger Stats:', {
    totalLogs: logSummary.totalLogs,
    alertsCount: logSummary.alertsCount,
    averageDuration: logSummary.averageDuration.toFixed(2) + 'ms',
    slowOperations: logSummary.slowOperations
  });
  
  console.log('Performance by Type:', logSummary.byType);
}

// Demo function to simulate memory monitoring
function simulateMemoryMonitoring() {
  console.log('💾 Starting memory monitoring...');
  
  // Start memory monitoring
  monitor.startMemoryMonitoring();
  
  // Simulate some memory usage
  const largeArray = new Array(100000).fill('sample data');
  
  setTimeout(() => {
    // Clear the array to simulate cleanup
    largeArray.length = 0;
    console.log('✅ Memory monitoring active');
  }, 1000);
}

// Set up alert callback
discoveryPerformanceLogger.onAlert((alert) => {
  console.log(`🚨 Performance Alert: ${alert.alertType} - ${alert.message}`);
});

// Run the demo
export function runPerformanceMonitorDemo() {
  console.log('🎯 Discovery Performance Monitor Demo Starting...\n');
  
  // Simulate various operations
  simulatePageLoad();
  
  setTimeout(() => simulateFilterOperation(), 1000);
  setTimeout(() => simulateAPICall(), 2000);
  setTimeout(() => simulateMemoryMonitoring(), 3000);
  
  // Show summary after all operations
  setTimeout(() => {
    showPerformanceSummary();
    
    // Export data demo
    console.log('\n📁 Exporting performance data...');
    const jsonData = monitor.exportMetrics('json');
    console.log('JSON Export (first 200 chars):', jsonData.substring(0, 200) + '...');
    
    // Cleanup
    setTimeout(() => {
      monitor.cleanup();
      discoveryPerformanceLogger.cleanup();
      console.log('\n🧹 Demo cleanup completed');
    }, 1000);
  }, 5000);
}

// Auto-run demo if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment - add to window for manual execution
  window.runPerformanceMonitorDemo = runPerformanceMonitorDemo;
  console.log('Demo available: window.runPerformanceMonitorDemo()');
} else if (import.meta.url === `file://${process.argv[1]}`) {
  // Node environment - run directly
  runPerformanceMonitorDemo();
}

export default {
  runPerformanceMonitorDemo,
  monitor,
  logger: discoveryPerformanceLogger
};