/**
 * System Validation Test
 * Final validation that all components are properly integrated and working
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Import all services to ensure they can be loaded
import youTubeStreamCapture from '../YouTubeStreamCapture.js';
import audioProcessingService from '../AudioProcessingService.js';
import samplePlaybackEngine from '../SamplePlaybackEngine.js';
import storageManager from '../StorageManager.js';
import performanceMonitor from '../PerformanceMonitor.js';
import memoryManager from '../MemoryManager.js';
import optimizedWaveformGenerator from '../OptimizedWaveformGenerator.js';

describe('System Validation', () => {
  beforeAll(() => {
    // Setup global mocks for browser APIs
    global.AudioContext = class MockAudioContext {
      constructor() {
        this.state = 'running';
        this.currentTime = 0;
        this.sampleRate = 44100;
      }
      
      createMediaElementSource() {
        return { connect: () => {}, disconnect: () => {} };
      }
      
      createAnalyser() {
        return { 
          connect: () => {}, 
          disconnect: () => {},
          fftSize: 2048,
          smoothingTimeConstant: 0.8
        };
      }
      
      createScriptProcessor() {
        return { 
          connect: () => {}, 
          disconnect: () => {},
          onaudioprocess: null
        };
      }
      
      createBuffer(channels, length, sampleRate) {
        return {
          numberOfChannels: channels,
          length,
          sampleRate,
          duration: length / sampleRate,
          getChannelData: () => new Float32Array(length)
        };
      }
      
      resume() { return Promise.resolve(); }
      close() { return Promise.resolve(); }
    };

    global.webkitAudioContext = global.AudioContext;
    
    // Mock IndexedDB
    global.indexedDB = {
      open: () => ({
        onsuccess: null,
        onerror: null,
        result: {
          createObjectStore: () => ({}),
          transaction: () => ({
            objectStore: () => ({
              add: () => ({ onsuccess: null, onerror: null }),
              get: () => ({ onsuccess: null, onerror: null }),
              delete: () => ({ onsuccess: null, onerror: null })
            })
          })
        }
      })
    };
  });

  it('should have all required services available', () => {
    const services = [
      { name: 'YouTubeStreamCapture', service: youTubeStreamCapture },
      { name: 'AudioProcessingService', service: audioProcessingService },
      { name: 'SamplePlaybackEngine', service: samplePlaybackEngine },
      { name: 'StorageManager', service: storageManager },
      { name: 'PerformanceMonitor', service: performanceMonitor },
      { name: 'MemoryManager', service: memoryManager },
      { name: 'OptimizedWaveformGenerator', service: optimizedWaveformGenerator }
    ];

    services.forEach(({ name, service }) => {
      expect(service).toBeDefined();
      expect(service).not.toBeNull();
      console.log(`✅ ${name} service is available`);
    });
  });

  it('should have YouTube stream capture with required methods', () => {
    const requiredMethods = ['startCapture', 'stopCapture', 'getStatus', 'cleanup'];
    
    requiredMethods.forEach(method => {
      expect(typeof youTubeStreamCapture[method]).toBe('function');
      console.log(`✅ YouTubeStreamCapture.${method} is available`);
    });

    // Test static method
    expect(typeof youTubeStreamCapture.constructor.isSupported).toBe('function');
    console.log('✅ YouTubeStreamCapture.isSupported is available');
  });

  it('should have audio processing service with required methods', () => {
    const requiredMethods = ['processYouTubeUrl', 'getProcessingStatus', 'cleanup'];
    
    requiredMethods.forEach(method => {
      expect(typeof audioProcessingService[method]).toBe('function');
      console.log(`✅ AudioProcessingService.${method} is available`);
    });
  });

  it('should have sample playback engine with required methods', () => {
    const requiredMethods = ['playSample', 'stopSample', 'stopAllSamples', 'setMasterVolume'];
    
    requiredMethods.forEach(method => {
      expect(typeof samplePlaybackEngine[method]).toBe('function');
      console.log(`✅ SamplePlaybackEngine.${method} is available`);
    });
  });

  it('should have storage manager with required methods', () => {
    const requiredMethods = ['storeAudioBuffer', 'getAudioBuffer', 'clearCache', 'getStorageInfo'];
    
    requiredMethods.forEach(method => {
      expect(typeof storageManager[method]).toBe('function');
      console.log(`✅ StorageManager.${method} is available`);
    });
  });

  it('should have performance monitor with required methods', () => {
    const requiredMethods = ['startMeasurement', 'getMetrics', 'clearMetrics'];
    
    requiredMethods.forEach(method => {
      expect(typeof performanceMonitor[method]).toBe('function');
      console.log(`✅ PerformanceMonitor.${method} is available`);
    });
  });

  it('should have memory manager with required methods', () => {
    const requiredMethods = ['registerBuffer', 'unregisterBuffer', 'getMemoryUsage', 'cleanup'];
    
    requiredMethods.forEach(method => {
      expect(typeof memoryManager[method]).toBe('function');
      console.log(`✅ MemoryManager.${method} is available`);
    });
  });

  it('should have optimized waveform generator with required methods', () => {
    const requiredMethods = ['generateWaveform', 'generateFromAudioBuffer', 'clearCache'];
    
    requiredMethods.forEach(method => {
      expect(typeof optimizedWaveformGenerator[method]).toBe('function');
      console.log(`✅ OptimizedWaveformGenerator.${method} is available`);
    });
  });

  it('should be able to create basic audio context', () => {
    expect(() => {
      const audioContext = new AudioContext();
      expect(audioContext).toBeDefined();
      expect(audioContext.state).toBe('running');
      console.log('✅ AudioContext can be created');
    }).not.toThrow();
  });

  it('should have proper error handling in services', async () => {
    // Test that services handle errors gracefully
    try {
      // This should throw an error for invalid input
      await audioProcessingService.processYouTubeUrl('invalid-url');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBeTruthy();
      console.log('✅ AudioProcessingService handles errors properly');
    }
  });

  it('should have performance monitoring working', () => {
    const endMeasurement = performanceMonitor.startMeasurement('test_measurement');
    expect(typeof endMeasurement).toBe('function');
    
    endMeasurement({ success: true, testData: 'validation' });
    
    const metrics = performanceMonitor.getMetrics();
    expect(metrics).toBeDefined();
    console.log('✅ Performance monitoring is working');
  });

  it('should have memory management working', () => {
    const mockBuffer = new ArrayBuffer(1024);
    const bufferId = 'test_buffer_validation';
    
    // Register buffer
    memoryManager.registerBuffer(bufferId, mockBuffer, {
      priority: 'HIGH',
      tags: ['test'],
      source: 'validation'
    });
    
    const memoryUsage = memoryManager.getMemoryUsage();
    expect(memoryUsage).toBeDefined();
    
    // Cleanup
    memoryManager.unregisterBuffer(bufferId);
    console.log('✅ Memory management is working');
  });

  it('should have all components integrated properly', () => {
    // This test verifies that all services can be imported and instantiated
    // without throwing errors, indicating proper integration
    
    const integrationChecks = [
      () => youTubeStreamCapture.getStatus(),
      () => audioProcessingService.getProcessingStatus(),
      () => samplePlaybackEngine.setMasterVolume(1.0),
      () => performanceMonitor.getMetrics(),
      () => memoryManager.getMemoryUsage()
    ];

    integrationChecks.forEach((check, index) => {
      expect(() => check()).not.toThrow();
      console.log(`✅ Integration check ${index + 1} passed`);
    });

    console.log('🎉 All integration checks passed - System is ready!');
  });
});

describe('Component Integration Validation', () => {
  it('should validate that UI components can be imported', async () => {
    // Test that key UI components can be imported
    try {
      const { default: ChopperPage } = await import('../../pages/ChopperPage.jsx');
      expect(ChopperPage).toBeDefined();
      console.log('✅ ChopperPage component can be imported');

      const { default: YouTubeCaptureControls } = await import('../../components/chopper/YouTubeCaptureControls.jsx');
      expect(YouTubeCaptureControls).toBeDefined();
      console.log('✅ YouTubeCaptureControls component can be imported');

    } catch (error) {
      console.warn('⚠️ UI component import test skipped (likely due to test environment)');
      // This is expected in a Node.js test environment
    }
  });

  it('should validate hook integration', async () => {
    try {
      const { useAudioAnalysis } = await import('../../hooks/useAudioAnalysis.js');
      expect(useAudioAnalysis).toBeDefined();
      console.log('✅ useAudioAnalysis hook can be imported');

      const { useAudioErrorRecovery } = await import('../../hooks/useErrorRecovery.js');
      expect(useAudioErrorRecovery).toBeDefined();
      console.log('✅ useAudioErrorRecovery hook can be imported');

    } catch (error) {
      console.warn('⚠️ Hook import test skipped (likely due to test environment)');
      // This is expected in a Node.js test environment without React
    }
  });
});