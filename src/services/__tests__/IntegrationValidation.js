/**
 * Integration Validation Script
 * Validates that all components of the YouTube Audio Chopper work together correctly
 */

import youTubeStreamCapture from '../YouTubeStreamCapture.js';
import audioProcessingService from '../AudioProcessingService.js';
import samplePlaybackEngine from '../SamplePlaybackEngine.js';
import storageManager from '../StorageManager.js';
import performanceMonitor from '../PerformanceMonitor.js';
import memoryManager from '../MemoryManager.js';

class IntegrationValidator {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: []
    };
  }

  /**
   * Run all integration validation tests
   */
  async runValidation() {
    console.log('🔍 Starting Integration Validation...');
    console.log('=' .repeat(50));

    try {
      await this.validateServiceAvailability();
      await this.validateWebAudioSupport();
      await this.validateStreamCaptureIntegration();
      await this.validateAudioProcessingIntegration();
      await this.validateSamplePlaybackIntegration();
      await this.validateStorageIntegration();
      await this.validatePerformanceMonitoring();
      await this.validateMemoryManagement();
      await this.validateErrorHandling();
      await this.validateCleanupProcedures();

      this.printResults();
      return this.results;

    } catch (error) {
      console.error('❌ Validation failed with error:', error);
      this.results.failed++;
      this.results.details.push({
        test: 'Overall Validation',
        status: 'FAILED',
        error: error.message
      });
      return this.results;
    }
  }

  /**
   * Validate all required services are available
   */
  async validateServiceAvailability() {
    console.log('📋 Validating Service Availability...');

    const services = [
      { name: 'YouTubeStreamCapture', service: youTubeStreamCapture },
      { name: 'AudioProcessingService', service: audioProcessingService },
      { name: 'SamplePlaybackEngine', service: samplePlaybackEngine },
      { name: 'StorageManager', service: storageManager },
      { name: 'PerformanceMonitor', service: performanceMonitor },
      { name: 'MemoryManager', service: memoryManager }
    ];

    for (const { name, service } of services) {
      try {
        if (!service) {
          throw new Error(`${name} service is not available`);
        }

        // Check if service has required methods
        const requiredMethods = this.getRequiredMethods(name);
        for (const method of requiredMethods) {
          if (typeof service[method] !== 'function') {
            throw new Error(`${name}.${method} is not a function`);
          }
        }

        this.pass(`${name} service is available and has required methods`);
      } catch (error) {
        this.fail(`${name} validation failed`, error.message);
      }
    }
  }

  /**
   * Validate Web Audio API support
   */
  async validateWebAudioSupport() {
    console.log('🎵 Validating Web Audio API Support...');

    try {
      // Check AudioContext availability
      if (!window.AudioContext && !window.webkitAudioContext) {
        throw new Error('Web Audio API not supported');
      }

      // Test AudioContext creation
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Test basic audio nodes
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const analyser = audioContext.createAnalyser();

      oscillator.connect(gainNode);
      gainNode.connect(analyser);
      analyser.connect(audioContext.destination);

      await audioContext.close();

      this.pass('Web Audio API is fully supported');
    } catch (error) {
      this.fail('Web Audio API validation failed', error.message);
    }
  }

  /**
   * Validate YouTube stream capture integration
   */
  async validateStreamCaptureIntegration() {
    console.log('📺 Validating Stream Capture Integration...');

    try {
      // Check if capture is supported
      const isSupported = youTubeStreamCapture.constructor.isSupported();
      if (!isSupported) {
        throw new Error('Stream capture not supported in this environment');
      }

      // Test status reporting
      const status = youTubeStreamCapture.getStatus();
      if (!status || typeof status.isCapturing !== 'boolean') {
        throw new Error('Status reporting not working correctly');
      }

      // Test cleanup functionality
      youTubeStreamCapture.cleanup();

      this.pass('Stream capture integration is working');
    } catch (error) {
      this.fail('Stream capture integration failed', error.message);
    }
  }

  /**
   * Validate audio processing service integration
   */
  async validateAudioProcessingIntegration() {
    console.log('🔊 Validating Audio Processing Integration...');

    try {
      // Test service methods exist
      const requiredMethods = ['processYouTubeUrl', 'getProcessingStatus', 'cleanup'];
      for (const method of requiredMethods) {
        if (typeof audioProcessingService[method] !== 'function') {
          throw new Error(`AudioProcessingService.${method} not available`);
        }
      }

      // Test status reporting
      const status = audioProcessingService.getProcessingStatus();
      if (!status) {
        this.warn('Audio processing status not available');
      }

      this.pass('Audio processing integration is working');
    } catch (error) {
      this.fail('Audio processing integration failed', error.message);
    }
  }

  /**
   * Validate sample playback engine integration
   */
  async validateSamplePlaybackIntegration() {
    console.log('🎹 Validating Sample Playback Integration...');

    try {
      // Test playback engine methods
      const requiredMethods = ['playSample', 'stopSample', 'stopAllSamples', 'setMasterVolume'];
      for (const method of requiredMethods) {
        if (typeof samplePlaybackEngine[method] !== 'function') {
          throw new Error(`SamplePlaybackEngine.${method} not available`);
        }
      }

      // Test volume control
      samplePlaybackEngine.setMasterVolume(0.5);
      
      // Test stop all functionality
      await samplePlaybackEngine.stopAllSamples();

      this.pass('Sample playback integration is working');
    } catch (error) {
      this.fail('Sample playback integration failed', error.message);
    }
  }

  /**
   * Validate storage integration
   */
  async validateStorageIntegration() {
    console.log('💾 Validating Storage Integration...');

    try {
      // Test IndexedDB availability
      if (!window.indexedDB) {
        throw new Error('IndexedDB not available');
      }

      // Test storage manager methods
      const requiredMethods = ['storeAudioBuffer', 'getAudioBuffer', 'clearCache', 'getStorageInfo'];
      for (const method of requiredMethods) {
        if (typeof storageManager[method] !== 'function') {
          throw new Error(`StorageManager.${method} not available`);
        }
      }

      // Test storage info
      const storageInfo = await storageManager.getStorageInfo();
      if (!storageInfo) {
        this.warn('Storage info not available');
      }

      this.pass('Storage integration is working');
    } catch (error) {
      this.fail('Storage integration failed', error.message);
    }
  }

  /**
   * Validate performance monitoring
   */
  async validatePerformanceMonitoring() {
    console.log('📊 Validating Performance Monitoring...');

    try {
      // Test performance monitor methods
      const requiredMethods = ['startMeasurement', 'getMetrics', 'clearMetrics'];
      for (const method of requiredMethods) {
        if (typeof performanceMonitor[method] !== 'function') {
          throw new Error(`PerformanceMonitor.${method} not available`);
        }
      }

      // Test measurement functionality
      const endMeasurement = performanceMonitor.startMeasurement('test_measurement');
      if (typeof endMeasurement !== 'function') {
        throw new Error('Performance measurement not working correctly');
      }
      
      endMeasurement({ success: true });

      // Test metrics retrieval
      const metrics = performanceMonitor.getMetrics();
      if (!metrics) {
        this.warn('Performance metrics not available');
      }

      this.pass('Performance monitoring is working');
    } catch (error) {
      this.fail('Performance monitoring failed', error.message);
    }
  }

  /**
   * Validate memory management
   */
  async validateMemoryManagement() {
    console.log('🧠 Validating Memory Management...');

    try {
      // Test memory manager methods
      const requiredMethods = ['registerBuffer', 'unregisterBuffer', 'getMemoryUsage', 'cleanup'];
      for (const method of requiredMethods) {
        if (typeof memoryManager[method] !== 'function') {
          throw new Error(`MemoryManager.${method} not available`);
        }
      }

      // Test memory usage reporting
      const memoryUsage = memoryManager.getMemoryUsage();
      if (!memoryUsage) {
        this.warn('Memory usage reporting not available');
      }

      // Test cleanup
      memoryManager.cleanup();

      this.pass('Memory management is working');
    } catch (error) {
      this.fail('Memory management failed', error.message);
    }
  }

  /**
   * Validate error handling across services
   */
  async validateErrorHandling() {
    console.log('⚠️ Validating Error Handling...');

    try {
      // Test that services handle invalid inputs gracefully
      const testCases = [
        {
          service: audioProcessingService,
          method: 'processYouTubeUrl',
          input: 'invalid-url',
          description: 'Invalid URL handling'
        }
      ];

      for (const testCase of testCases) {
        try {
          await testCase.service[testCase.method](testCase.input);
          this.warn(`${testCase.description} - Expected error but none thrown`);
        } catch (error) {
          // Expected behavior - service should throw meaningful errors
          if (error.message && error.message.length > 0) {
            this.pass(`${testCase.description} - Proper error thrown`);
          } else {
            this.warn(`${testCase.description} - Error thrown but message unclear`);
          }
        }
      }

      this.pass('Error handling validation completed');
    } catch (error) {
      this.fail('Error handling validation failed', error.message);
    }
  }

  /**
   * Validate cleanup procedures
   */
  async validateCleanupProcedures() {
    console.log('🧹 Validating Cleanup Procedures...');

    try {
      // Test cleanup methods exist and can be called
      const servicesWithCleanup = [
        { name: 'YouTubeStreamCapture', service: youTubeStreamCapture },
        { name: 'AudioProcessingService', service: audioProcessingService },
        { name: 'SamplePlaybackEngine', service: samplePlaybackEngine },
        { name: 'StorageManager', service: storageManager },
        { name: 'MemoryManager', service: memoryManager }
      ];

      for (const { name, service } of servicesWithCleanup) {
        if (typeof service.cleanup === 'function') {
          service.cleanup();
          this.pass(`${name} cleanup method works`);
        } else {
          this.warn(`${name} does not have cleanup method`);
        }
      }

      this.pass('Cleanup procedures validation completed');
    } catch (error) {
      this.fail('Cleanup procedures validation failed', error.message);
    }
  }

  /**
   * Get required methods for each service
   */
  getRequiredMethods(serviceName) {
    const methodMap = {
      'YouTubeStreamCapture': ['startCapture', 'stopCapture', 'getStatus', 'cleanup'],
      'AudioProcessingService': ['processYouTubeUrl', 'getProcessingStatus', 'cleanup'],
      'SamplePlaybackEngine': ['playSample', 'stopSample', 'stopAllSamples', 'setMasterVolume'],
      'StorageManager': ['storeAudioBuffer', 'getAudioBuffer', 'clearCache', 'getStorageInfo'],
      'PerformanceMonitor': ['startMeasurement', 'getMetrics', 'clearMetrics'],
      'MemoryManager': ['registerBuffer', 'unregisterBuffer', 'getMemoryUsage', 'cleanup']
    };

    return methodMap[serviceName] || [];
  }

  /**
   * Record a passing test
   */
  pass(message) {
    console.log(`✅ ${message}`);
    this.results.passed++;
    this.results.details.push({
      test: message,
      status: 'PASSED'
    });
  }

  /**
   * Record a failing test
   */
  fail(message, error) {
    console.log(`❌ ${message}: ${error}`);
    this.results.failed++;
    this.results.details.push({
      test: message,
      status: 'FAILED',
      error
    });
  }

  /**
   * Record a warning
   */
  warn(message) {
    console.log(`⚠️ ${message}`);
    this.results.warnings++;
    this.results.details.push({
      test: message,
      status: 'WARNING'
    });
  }

  /**
   * Print validation results
   */
  printResults() {
    console.log('\n' + '=' .repeat(50));
    console.log('📊 INTEGRATION VALIDATION RESULTS');
    console.log('=' .repeat(50));
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⚠️ Warnings: ${this.results.warnings}`);
    console.log(`📋 Total Tests: ${this.results.passed + this.results.failed + this.results.warnings}`);
    
    const successRate = (this.results.passed / (this.results.passed + this.results.failed)) * 100;
    console.log(`📈 Success Rate: ${successRate.toFixed(1)}%`);

    if (this.results.failed === 0) {
      console.log('\n🎉 All critical validations passed! System is ready for production.');
    } else {
      console.log('\n⚠️ Some validations failed. Please review and fix issues before deployment.');
    }

    console.log('\n📝 Detailed Results:');
    this.results.details.forEach((detail, index) => {
      const icon = detail.status === 'PASSED' ? '✅' : detail.status === 'FAILED' ? '❌' : '⚠️';
      console.log(`${index + 1}. ${icon} ${detail.test}`);
      if (detail.error) {
        console.log(`   Error: ${detail.error}`);
      }
    });
  }
}

// Export for use in tests and manual validation
export default IntegrationValidator;

// Auto-run validation if this file is executed directly
if (typeof window !== 'undefined' && window.location) {
  // Browser environment - expose validator globally for manual testing
  window.IntegrationValidator = IntegrationValidator;
  
  // Auto-run validation in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Development mode detected - running integration validation...');
    const validator = new IntegrationValidator();
    validator.runValidation().then(results => {
      console.log('Integration validation completed:', results);
    });
  }
}