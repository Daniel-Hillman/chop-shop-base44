/**
 * Performance Optimization Demo
 * 
 * Demonstrates the performance monitoring, memory management, and optimization features
 * of the YouTube Audio Sampler system.
 */

import performanceMonitor from './PerformanceMonitor.js';
import memoryManager from './MemoryManager.js';
import optimizedWaveformGenerator from './OptimizedWaveformGenerator.js';

/**
 * Demo: Performance Monitoring
 */
export async function demoPerformanceMonitoring() {
  console.log('=== Performance Monitoring Demo ===');
  
  // Start monitoring
  performanceMonitor.startMonitoring();
  
  // Simulate various operations
  console.log('Simulating audio download...');
  const downloadMeasurement = performanceMonitor.startMeasurement('audio_download');
  await simulateAsyncOperation(2000); // 2 second download
  downloadMeasurement({ 
    success: true, 
    fileSize: '15MB', 
    url: 'https://youtube.com/watch?v=demo' 
  });
  
  console.log('Simulating waveform generation...');
  const waveformMeasurement = performanceMonitor.startMeasurement('waveform_generation');
  await simulateAsyncOperation(800); // 800ms waveform generation
  waveformMeasurement({ 
    samples: 400, 
    audioSize: 15 * 1024 * 1024,
    progressive: false 
  });
  
  console.log('Simulating sample playback...');
  performanceMonitor.recordMetric('sample_playback', 50, {
    sampleId: 'pad_1',
    startTime: 30.5,
    duration: 2.0,
    activeSamples: 3
  });
  
  // Get performance metrics
  const metrics = performanceMonitor.getMetrics();
  console.log('Performance Metrics:', JSON.stringify(metrics, null, 2));
  
  // Get memory recommendations
  const recommendations = performanceMonitor.getMemoryOptimizationRecommendations();
  console.log('Memory Recommendations:', recommendations);
  
  performanceMonitor.stopMonitoring();
}

/**
 * Demo: Memory Management
 */
export async function demoMemoryManagement() {
  console.log('\n=== Memory Management Demo ===');
  
  // Start memory monitoring
  memoryManager.startMonitoring();
  
  // Create mock audio buffers
  const createMockAudioBuffer = (duration, sampleRate = 44100) => ({
    numberOfChannels: 2,
    length: duration * sampleRate,
    sampleRate,
    duration,
    getChannelData: () => new Float32Array(duration * sampleRate)
  });
  
  // Register various audio buffers
  console.log('Registering audio buffers...');
  
  memoryManager.registerBuffer('song_1', createMockAudioBuffer(180), {
    priority: memoryManager.config.priorityLevels.HIGH,
    tags: ['music', 'youtube'],
    source: 'youtube_download'
  });
  
  memoryManager.registerBuffer('song_2', createMockAudioBuffer(240), {
    priority: memoryManager.config.priorityLevels.MEDIUM,
    tags: ['music', 'youtube'],
    source: 'youtube_download'
  });
  
  memoryManager.registerBuffer('sample_1', createMockAudioBuffer(5), {
    priority: memoryManager.config.priorityLevels.LOW,
    tags: ['sample', 'processed'],
    source: 'user_created'
  });
  
  // Get memory statistics
  let stats = memoryManager.getMemoryStats();
  console.log('Initial Memory Stats:', JSON.stringify(stats, null, 2));
  
  // Simulate buffer access
  console.log('Accessing buffers...');
  memoryManager.getBuffer('song_1');
  memoryManager.getBuffer('song_1');
  memoryManager.getBuffer('song_2');
  
  // List all buffers
  const bufferList = memoryManager.listBuffers();
  console.log('Registered Buffers:', bufferList);
  
  // Simulate memory pressure by creating old buffer
  console.log('Simulating old buffer...');
  memoryManager.registerBuffer('old_song', createMockAudioBuffer(300));
  const oldMetadata = memoryManager.getBufferMetadata('old_song');
  oldMetadata.createdAt = Date.now() - (35 * 60 * 1000); // 35 minutes ago
  
  // Trigger garbage collection
  console.log('Triggering garbage collection...');
  memoryManager.performGarbageCollection();
  
  // Check final stats
  stats = memoryManager.getMemoryStats();
  console.log('Final Memory Stats:', JSON.stringify(stats, null, 2));
  
  memoryManager.stopMonitoring();
}

/**
 * Demo: Optimized Waveform Generation
 */
export async function demoOptimizedWaveformGeneration() {
  console.log('\n=== Optimized Waveform Generation Demo ===');
  
  // Create mock audio buffer with realistic data
  const createRealisticAudioBuffer = (duration, sampleRate = 44100) => {
    const length = duration * sampleRate;
    const buffer = {
      numberOfChannels: 2,
      length,
      sampleRate,
      duration,
      getChannelData: (channel) => {
        const data = new Float32Array(length);
        // Generate realistic audio data (sine wave with noise)
        for (let i = 0; i < length; i++) {
          const time = i / sampleRate;
          const frequency = 440 + Math.sin(time * 0.5) * 100; // Varying frequency
          const amplitude = 0.5 * (1 + Math.sin(time * 0.1)); // Varying amplitude
          const noise = (Math.random() - 0.5) * 0.1; // Small amount of noise
          data[i] = Math.sin(2 * Math.PI * frequency * time) * amplitude + noise;
        }
        return data;
      }
    };
    return buffer;
  };
  
  // Test different waveform generation scenarios
  console.log('Testing small audio file (5 seconds)...');
  const smallBuffer = createRealisticAudioBuffer(5);
  
  const smallResult = await optimizedWaveformGenerator.generateWaveform(smallBuffer, {
    samples: 200,
    normalize: true,
    onProgress: (progress) => {
      if (progress.progress % 25 === 0) {
        console.log(`Small file progress: ${progress.progress}%`);
      }
    }
  });
  
  console.log('Small file result:', {
    samples: smallResult.samples,
    duration: smallResult.duration,
    progressive: smallResult.progressive,
    dataLength: smallResult.data.length,
    maxValue: Math.max(...smallResult.data),
    minValue: Math.min(...smallResult.data)
  });
  
  console.log('\nTesting large audio file (300 seconds)...');
  const largeBuffer = createRealisticAudioBuffer(300); // 5 minutes
  
  const largeResult = await optimizedWaveformGenerator.generateWaveform(largeBuffer, {
    samples: 1000,
    normalize: true,
    progressive: true,
    onProgress: (progress) => {
      if (progress.progress % 20 === 0) {
        console.log(`Large file progress: ${progress.progress}% (${progress.status})`);
      }
    }
  });
  
  console.log('Large file result:', {
    samples: largeResult.samples,
    duration: largeResult.duration,
    progressive: largeResult.progressive,
    dataLength: largeResult.data.length,
    maxValue: Math.max(...largeResult.data),
    minValue: Math.min(...largeResult.data)
  });
  
  // Test caching
  console.log('\nTesting waveform caching...');
  const startTime = performance.now();
  await optimizedWaveformGenerator.generateWaveform(smallBuffer, {
    samples: 200,
    normalize: true
  });
  const cachedTime = performance.now() - startTime;
  console.log(`Cached generation time: ${cachedTime.toFixed(2)}ms`);
  
  // Get generator statistics
  const stats = optimizedWaveformGenerator.getStats();
  console.log('Generator Stats:', stats);
  
  optimizedWaveformGenerator.cleanup();
}

/**
 * Demo: Integration Scenario
 */
export async function demoIntegrationScenario() {
  console.log('\n=== Integration Scenario Demo ===');
  
  // Start all monitoring systems
  performanceMonitor.startMonitoring();
  memoryManager.startMonitoring();
  
  console.log('Simulating complete audio processing workflow...');
  
  // 1. Audio Download
  console.log('Step 1: Audio Download');
  const downloadMeasurement = performanceMonitor.startMeasurement('audio_download');
  await simulateAsyncOperation(3000);
  const audioBuffer = {
    numberOfChannels: 2,
    length: 44100 * 180, // 3 minutes
    sampleRate: 44100,
    duration: 180,
    getChannelData: () => new Float32Array(44100 * 180)
  };
  downloadMeasurement({ success: true, audioSize: 44100 * 180 * 2 * 4 });
  
  // 2. Memory Registration
  console.log('Step 2: Memory Registration');
  memoryManager.registerBuffer('downloaded_audio', audioBuffer, {
    priority: memoryManager.config.priorityLevels.HIGH,
    tags: ['youtube', 'downloaded'],
    source: 'youtube_api'
  });
  
  // 3. Waveform Generation
  console.log('Step 3: Waveform Generation');
  const waveformResult = await optimizedWaveformGenerator.generateWaveform(audioBuffer, {
    samples: 400,
    normalize: true,
    onProgress: (progress) => {
      if (progress.progress % 50 === 0) {
        console.log(`Waveform progress: ${progress.progress}%`);
      }
    }
  });
  
  // 4. Sample Playback Simulation
  console.log('Step 4: Sample Playback');
  for (let i = 0; i < 5; i++) {
    performanceMonitor.recordMetric('sample_playback', Math.random() * 100 + 20, {
      sampleId: `pad_${i}`,
      startTime: Math.random() * 180,
      duration: Math.random() * 5 + 1
    });
  }
  
  // 5. Memory Pressure Simulation
  console.log('Step 5: Memory Pressure Simulation');
  for (let i = 0; i < 10; i++) {
    const tempBuffer = {
      numberOfChannels: 2,
      length: 44100 * 60, // 1 minute each
      sampleRate: 44100,
      duration: 60
    };
    memoryManager.registerBuffer(`temp_${i}`, tempBuffer, {
      priority: memoryManager.config.priorityLevels.LOW
    });
  }
  
  // 6. Get comprehensive statistics
  console.log('\nStep 6: Final Statistics');
  const performanceMetrics = performanceMonitor.getMetrics();
  const memoryStats = memoryManager.getMemoryStats();
  const generatorStats = optimizedWaveformGenerator.getStats();
  
  console.log('=== FINAL RESULTS ===');
  console.log('Performance Operations:', Object.keys(performanceMetrics.operations));
  console.log('Memory Usage:', `${memoryStats.audioBuffers.totalSizeMB}MB / ${memoryStats.audioBuffers.maxSizeMB}MB`);
  console.log('Registered Buffers:', memoryStats.audioBuffers.count);
  console.log('Waveform Cache Size:', generatorStats.cacheSize);
  console.log('Memory Recommendations:', memoryStats.recommendations);
  
  // Cleanup
  performanceMonitor.cleanup();
  memoryManager.cleanup();
  optimizedWaveformGenerator.cleanup();
}

/**
 * Utility function to simulate async operations
 */
function simulateAsyncOperation(duration) {
  return new Promise(resolve => setTimeout(resolve, duration));
}

/**
 * Run all demos
 */
export async function runAllDemos() {
  console.log('🚀 Starting Performance Optimization Demos...\n');
  
  try {
    await demoPerformanceMonitoring();
    await demoMemoryManagement();
    await demoOptimizedWaveformGeneration();
    await demoIntegrationScenario();
    
    console.log('\n✅ All demos completed successfully!');
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Auto-run demos if this file is executed directly
if (typeof window !== 'undefined' && window.location?.search?.includes('demo=performance')) {
  runAllDemos();
}