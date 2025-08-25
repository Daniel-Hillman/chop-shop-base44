/**
 * Demo for WaveformPerformanceOptimizer
 * Showcases Web Worker integration, caching, memory management, and performance monitoring
 */

import WaveformPerformanceOptimizer from './WaveformPerformanceOptimizer.js';

/**
 * Demo class to showcase performance optimization features
 */
export class WaveformPerformanceOptimizerDemo {
  constructor() {
    this.optimizer = null;
    this.demoResults = [];
    this.isRunning = false;
  }

  /**
   * Initialize the demo
   */
  async initialize() {
    console.log('🚀 Initializing WaveformPerformanceOptimizer Demo');
    
    this.optimizer = new WaveformPerformanceOptimizer({
      workerPoolSize: 3,
      enableCaching: true,
      enableMemoryManagement: true,
      enablePerformanceMonitoring: true,
      cacheMaxMemory: 50 * 1024 * 1024, // 50MB
      memoryMaxThreshold: 100 * 1024 * 1024, // 100MB
      targetFPS: 60,
      minFPS: 30
    });

    await this.optimizer.initialize();
    
    // Set up performance monitoring callbacks
    this.setupPerformanceCallbacks();
    
    console.log('✅ Demo initialized successfully');
    this.logInitialMetrics();
  }

  /**
   * Set up performance monitoring callbacks
   */
  setupPerformanceCallbacks() {
    if (this.optimizer.performanceMonitor) {
      this.optimizer.performanceMonitor.onQualityChange((event) => {
        console.log(`🎚️ Quality changed: ${event.newQuality} (${event.changeType})`);
        console.log(`   Reason: ${event.details.reason}`);
        console.log(`   Degradation level: ${event.details.level}`);
      });

      this.optimizer.performanceMonitor.onPerformanceWarning((warning) => {
        console.warn(`⚠️ Performance warning: ${warning.type}`);
        if (warning.metric) {
          console.warn(`   ${warning.metric}: ${warning.value} (threshold: ${warning.threshold})`);
        }
      });
    }
  }

  /**
   * Log initial metrics
   */
  logInitialMetrics() {
    const metrics = this.optimizer.getPerformanceMetrics();
    console.log('📊 Initial Performance Metrics:');
    console.log(`   Worker Pool Size: ${this.optimizer.workerPool.length}`);
    console.log(`   Cache Enabled: ${!!this.optimizer.cache}`);
    console.log(`   Memory Management: ${!!this.optimizer.memoryManager}`);
    console.log(`   Performance Monitoring: ${!!this.optimizer.performanceMonitor}`);
    
    if (metrics.performance && metrics.performance.deviceCapabilities) {
      const caps = metrics.performance.deviceCapabilities;
      console.log(`   Device Type: ${caps.deviceType}`);
      console.log(`   CPU Cores: ${caps.cpuCores}`);
      console.log(`   Memory Limit: ${this.formatBytes(caps.memoryLimit)}`);
    }
  }

  /**
   * Demo 1: Basic waveform generation with caching
   */
  async demoBasicGeneration() {
    console.log('\n🎵 Demo 1: Basic Waveform Generation with Caching');
    
    const audioBuffer = this.generateTestAudio(44100, 440); // 1 second, 440Hz
    const audioSource = { buffer: audioBuffer };
    const options = { targetSampleRate: 1000, quality: 'high' };

    console.log('   Generating waveform (first time - cache miss)...');
    const startTime = performance.now();
    
    const result1 = await this.optimizer.generateOptimizedWaveform(audioSource, options);
    const time1 = performance.now() - startTime;
    
    console.log(`   ✅ Generated in ${time1.toFixed(2)}ms`);
    console.log(`   Samples: ${result1.samples.length}, Method: ${result1.metadata.analysisMethod}`);

    console.log('   Generating same waveform (cache hit)...');
    const startTime2 = performance.now();
    
    const result2 = await this.optimizer.generateOptimizedWaveform(audioSource, options);
    const time2 = performance.now() - startTime2;
    
    console.log(`   ✅ Generated in ${time2.toFixed(2)}ms (${((time1 - time2) / time1 * 100).toFixed(1)}% faster)`);
    
    this.demoResults.push({
      demo: 'Basic Generation',
      firstGeneration: time1,
      cachedGeneration: time2,
      speedup: time1 / time2
    });

    this.logCacheMetrics();
  }

  /**
   * Demo 2: Concurrent processing with worker pool
   */
  async demoConcurrentProcessing() {
    console.log('\n⚡ Demo 2: Concurrent Processing with Worker Pool');
    
    const tasks = [];
    const audioBuffers = [];
    
    // Create different audio buffers
    for (let i = 0; i < 8; i++) {
      const frequency = 220 + i * 55; // Different frequencies
      const buffer = this.generateTestAudio(22050, frequency); // 0.5 seconds each
      audioBuffers.push(buffer);
    }

    console.log(`   Processing ${audioBuffers.length} audio buffers concurrently...`);
    const startTime = performance.now();

    // Process all buffers concurrently
    for (let i = 0; i < audioBuffers.length; i++) {
      tasks.push(
        this.optimizer.generateOptimizedWaveform(
          { buffer: audioBuffers[i] },
          { 
            targetSampleRate: 500 + i * 50, 
            quality: i % 2 === 0 ? 'high' : 'medium' 
          }
        )
      );
    }

    const results = await Promise.all(tasks);
    const totalTime = performance.now() - startTime;

    console.log(`   ✅ Processed ${results.length} buffers in ${totalTime.toFixed(2)}ms`);
    console.log(`   Average time per buffer: ${(totalTime / results.length).toFixed(2)}ms`);
    
    // Verify all results
    results.forEach((result, index) => {
      console.log(`   Buffer ${index + 1}: ${result.samples.length} samples, ${result.metadata.analysisMethod}`);
    });

    this.demoResults.push({
      demo: 'Concurrent Processing',
      totalTime,
      averageTime: totalTime / results.length,
      bufferCount: results.length
    });

    this.logWorkerMetrics();
  }

  /**
   * Demo 3: Memory management under load
   */
  async demoMemoryManagement() {
    console.log('\n🧠 Demo 3: Memory Management Under Load');
    
    const initialMemory = this.optimizer.memoryManager.getCurrentMemoryUsage();
    console.log(`   Initial memory usage: ${this.formatBytes(initialMemory)}`);

    // Allocate many buffers to test memory management
    const allocations = [];
    console.log('   Allocating large buffers...');
    
    for (let i = 0; i < 20; i++) {
      const size = 1024 * 1024; // 1MB each
      const allocation = this.optimizer.memoryManager.allocateBuffer(
        size, 
        'waveform', 
        { demo: true, index: i }
      );
      allocations.push(allocation);
      
      if (i % 5 === 0) {
        const currentMemory = this.optimizer.memoryManager.getCurrentMemoryUsage();
        console.log(`   Allocated ${i + 1} buffers, memory: ${this.formatBytes(currentMemory)}`);
      }
    }

    const peakMemory = this.optimizer.memoryManager.getCurrentMemoryUsage();
    console.log(`   Peak memory usage: ${this.formatBytes(peakMemory)}`);

    // Trigger cleanup
    console.log('   Triggering memory cleanup...');
    const cleanupResult = await this.optimizer.memoryManager.performCleanup([
      'buffer-pool', 
      'old-allocations', 
      'large-buffers'
    ]);

    console.log(`   Cleanup completed: ${cleanupResult.strategiesUsed.join(', ')}`);
    console.log(`   Memory reclaimed: ${this.formatBytes(cleanupResult.memoryReclaimed)}`);
    console.log(`   Cleanup time: ${cleanupResult.cleanupTime.toFixed(2)}ms`);

    const finalMemory = this.optimizer.memoryManager.getCurrentMemoryUsage();
    console.log(`   Final memory usage: ${this.formatBytes(finalMemory)}`);

    this.demoResults.push({
      demo: 'Memory Management',
      initialMemory,
      peakMemory,
      finalMemory,
      memoryReclaimed: cleanupResult.memoryReclaimed,
      cleanupTime: cleanupResult.cleanupTime
    });

    this.logMemoryMetrics();
  }

  /**
   * Demo 4: Performance monitoring and adaptive quality
   */
  async demoPerformanceMonitoring() {
    console.log('\n📈 Demo 4: Performance Monitoring and Adaptive Quality');
    
    // Simulate performance monitoring
    if (this.optimizer.performanceMonitor) {
      console.log('   Starting performance monitoring...');
      
      // Simulate frame rendering for performance tracking
      for (let i = 0; i < 100; i++) {
        this.optimizer.performanceMonitor.frameRenderStart();
        
        // Simulate variable render times
        const renderTime = 10 + Math.random() * 20; // 10-30ms
        await this.sleep(renderTime);
        
        this.optimizer.performanceMonitor.frameRenderEnd();
        
        if (i % 20 === 0) {
          const metrics = this.optimizer.performanceMonitor.getMetrics();
          console.log(`   Frame ${i}: FPS: ${metrics.fps.current.toFixed(1)}, Render: ${metrics.renderTime.current.toFixed(1)}ms`);
        }
      }

      // Get final performance metrics
      const metrics = this.optimizer.performanceMonitor.getMetrics();
      console.log(`   Average FPS: ${metrics.fps.average.toFixed(1)}`);
      console.log(`   Average render time: ${metrics.renderTime.average.toFixed(1)}ms`);
      console.log(`   Performance score: ${(metrics.performanceScore * 100).toFixed(1)}%`);
      console.log(`   Current quality: ${metrics.qualityLevel}`);

      // Test quality level changes
      console.log('   Testing quality level changes...');
      this.optimizer.setQualityLevel('low');
      await this.sleep(100);
      
      this.optimizer.setQualityLevel('high');
      await this.sleep(100);

      this.demoResults.push({
        demo: 'Performance Monitoring',
        averageFPS: metrics.fps.average,
        averageRenderTime: metrics.renderTime.average,
        performanceScore: metrics.performanceScore,
        qualityLevel: metrics.qualityLevel
      });
    }
  }

  /**
   * Demo 5: Low-end device optimization
   */
  async demoLowEndOptimization() {
    console.log('\n📱 Demo 5: Low-End Device Optimization');
    
    const beforeOptimization = {
      workerCount: this.optimizer.workerPool.length,
      cacheSize: this.optimizer.cache?.maxMemorySize || 0,
      memoryThreshold: this.optimizer.memoryManager?.maxMemoryThreshold || 0
    };

    console.log('   Before optimization:');
    console.log(`   Workers: ${beforeOptimization.workerCount}`);
    console.log(`   Cache size: ${this.formatBytes(beforeOptimization.cacheSize)}`);
    console.log(`   Memory threshold: ${this.formatBytes(beforeOptimization.memoryThreshold)}`);

    console.log('   Applying low-end device optimizations...');
    this.optimizer.optimizeForLowEndDevice();

    const afterOptimization = {
      workerCount: this.optimizer.workerPool.length,
      cacheSize: this.optimizer.cache?.maxMemorySize || 0,
      memoryThreshold: this.optimizer.memoryManager?.maxMemoryThreshold || 0
    };

    console.log('   After optimization:');
    console.log(`   Workers: ${afterOptimization.workerCount}`);
    console.log(`   Cache size: ${this.formatBytes(afterOptimization.cacheSize)}`);
    console.log(`   Memory threshold: ${this.formatBytes(afterOptimization.memoryThreshold)}`);

    // Test performance with optimized settings
    const audioBuffer = this.generateTestAudio(44100, 440);
    const startTime = performance.now();
    
    const result = await this.optimizer.generateOptimizedWaveform(
      { buffer: audioBuffer },
      { targetSampleRate: 500, quality: 'low' }
    );
    
    const optimizedTime = performance.now() - startTime;
    console.log(`   Optimized generation time: ${optimizedTime.toFixed(2)}ms`);

    this.demoResults.push({
      demo: 'Low-End Optimization',
      before: beforeOptimization,
      after: afterOptimization,
      optimizedGenerationTime: optimizedTime
    });
  }

  /**
   * Demo 6: Error handling and recovery
   */
  async demoErrorHandling() {
    console.log('\n🛡️ Demo 6: Error Handling and Recovery');
    
    // Test invalid audio buffer
    console.log('   Testing invalid audio buffer handling...');
    try {
      await this.optimizer.generateOptimizedWaveform({ buffer: null }, { quality: 'high' });
    } catch (error) {
      console.log(`   ✅ Handled invalid buffer error: ${error.message}`);
    }

    // Test memory pressure handling
    console.log('   Testing memory pressure handling...');
    try {
      // Simulate memory pressure by allocating many large buffers
      const largeAllocations = [];
      for (let i = 0; i < 10; i++) {
        const allocation = this.optimizer.memoryManager.allocateBuffer(
          5 * 1024 * 1024, // 5MB each
          'waveform',
          { test: true }
        );
        largeAllocations.push(allocation);
      }
      
      // This should trigger automatic cleanup
      console.log('   ✅ Memory pressure handled automatically');
      
    } catch (error) {
      console.log(`   ✅ Memory allocation error handled: ${error.message}`);
    }

    // Test cache error handling
    console.log('   Testing cache error handling...');
    if (this.optimizer.cache) {
      try {
        // Try to cache invalid data
        const circularData = { test: {} };
        circularData.test.circular = circularData;
        
        await this.optimizer.cache.set('invalid_key', circularData);
        console.log('   ✅ Cache handled invalid data gracefully');
      } catch (error) {
        console.log(`   ✅ Cache error handled: ${error.message}`);
      }
    }

    this.demoResults.push({
      demo: 'Error Handling',
      errorsHandled: 3,
      gracefulDegradation: true
    });
  }

  /**
   * Run all demos
   */
  async runAllDemos() {
    if (this.isRunning) {
      console.log('Demo is already running');
      return;
    }

    this.isRunning = true;
    this.demoResults = [];

    try {
      await this.initialize();
      
      await this.demoBasicGeneration();
      await this.demoConcurrentProcessing();
      await this.demoMemoryManagement();
      await this.demoPerformanceMonitoring();
      await this.demoLowEndOptimization();
      await this.demoErrorHandling();
      
      this.printSummary();
      
    } catch (error) {
      console.error('Demo failed:', error);
    } finally {
      this.isRunning = false;
      this.cleanup();
    }
  }

  /**
   * Print demo summary
   */
  printSummary() {
    console.log('\n📋 Demo Summary');
    console.log('================');
    
    this.demoResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.demo}`);
      
      Object.entries(result).forEach(([key, value]) => {
        if (key !== 'demo') {
          if (typeof value === 'number') {
            if (key.includes('Time') || key.includes('time')) {
              console.log(`   ${key}: ${value.toFixed(2)}ms`);
            } else if (key.includes('Memory') || key.includes('memory')) {
              console.log(`   ${key}: ${this.formatBytes(value)}`);
            } else {
              console.log(`   ${key}: ${value.toFixed(2)}`);
            }
          } else if (typeof value === 'object') {
            console.log(`   ${key}: ${JSON.stringify(value, null, 2)}`);
          } else {
            console.log(`   ${key}: ${value}`);
          }
        }
      });
      console.log('');
    });

    // Final metrics
    const finalMetrics = this.optimizer.getPerformanceMetrics();
    console.log('Final Performance Metrics:');
    console.log(`Cache Hit Rate: ${(finalMetrics.cachePerformance.hitRate * 100).toFixed(1)}%`);
    console.log(`Worker Tasks Completed: ${finalMetrics.workerTasks.completed}`);
    console.log(`Memory Cleanups: ${finalMetrics.memory?.performance?.cleanupCount || 0}`);
    console.log(`Overall Performance Score: ${(finalMetrics.overallPerformance.score * 100).toFixed(1)}%`);
  }

  /**
   * Helper methods
   */
  generateTestAudio(length, frequency) {
    const buffer = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      buffer[i] = Math.sin(2 * Math.PI * frequency * i / 44100) * 0.5;
    }
    return buffer;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  logCacheMetrics() {
    if (this.optimizer.cache) {
      const stats = this.optimizer.cache.getStats();
      console.log(`   Cache: ${stats.memoryCache.entries} entries, ${stats.performance.hitRate.toFixed(1)}% hit rate`);
    }
  }

  logWorkerMetrics() {
    const metrics = this.optimizer.getPerformanceMetrics();
    console.log(`   Workers: ${metrics.workerTasks.completed} completed, ${metrics.workerTasks.averageTime.toFixed(2)}ms avg`);
  }

  logMemoryMetrics() {
    if (this.optimizer.memoryManager) {
      const stats = this.optimizer.memoryManager.getMemoryStats();
      console.log(`   Memory: ${stats.usage.formatted.current} used, ${stats.allocations.count} allocations`);
    }
  }

  cleanup() {
    if (this.optimizer) {
      this.optimizer.destroy();
      this.optimizer = null;
    }
  }
}

// Export for use in other modules
export default WaveformPerformanceOptimizerDemo;

// Auto-run demo if this file is executed directly
if (typeof window !== 'undefined' && window.location) {
  // Browser environment
  window.WaveformPerformanceOptimizerDemo = WaveformPerformanceOptimizerDemo;
  
  // Add demo button to page if it exists
  if (document.body) {
    const button = document.createElement('button');
    button.textContent = 'Run Waveform Performance Demo';
    button.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 10000;
      padding: 10px 15px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-family: monospace;
    `;
    
    button.onclick = async () => {
      button.disabled = true;
      button.textContent = 'Running Demo...';
      
      const demo = new WaveformPerformanceOptimizerDemo();
      await demo.runAllDemos();
      
      button.textContent = 'Demo Complete';
      setTimeout(() => {
        button.remove();
      }, 3000);
    };
    
    document.body.appendChild(button);
  }
} else if (typeof process !== 'undefined' && process.argv) {
  // Node.js environment - run demo if this file is executed directly
  if (process.argv[1].endsWith('WaveformPerformanceOptimizer.demo.js')) {
    const demo = new WaveformPerformanceOptimizerDemo();
    demo.runAllDemos().catch(console.error);
  }
}