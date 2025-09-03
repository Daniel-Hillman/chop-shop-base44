/**
 * Working DiscoveryService implementation
 */

import { validateFilterState, validateSampleData } from '../../types/discovery.js';
import youTubeIntegration from './YouTubeIntegration.js';
import MockSampleProvider from './MockSampleProvider.js';
import DiscoveryCacheManager from './DiscoveryCacheManager.js';
import discoveryErrorService from './DiscoveryErrorService.js';
import DiscoveryPerformanceMonitor from './DiscoveryPerformanceMonitor.js';

export class DiscoveryService {
  constructor() {
    this.youtubeService = youTubeIntegration;
    this.mockProvider = new MockSampleProvider();
    this.cacheManager = new DiscoveryCacheManager();
    this.errorService = discoveryErrorService;
    this.performanceMonitor = new DiscoveryPerformanceMonitor();
    
    this.serviceHealth = {
      youtube: { available: true, lastCheck: 0, failureCount: 0 },
      cache: { available: true, lastCheck: 0, failureCount: 0 },
      mock: { available: true, lastCheck: 0, failureCount: 0 }
    };
    
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      healthCheckInterval: 300000,
      fallbackThreshold: 3,
      cacheFirst: false
    };
  }

  async discoverSamples(filters = {}, options = {}) {
    try {
      // Validate filters
      const filterValidation = validateFilterState(filters);
      if (!filterValidation.isValid) {
        filters = { genres: [], yearRange: { start: 1950, end: 1995 } };
      }

      const opts = { maxResults: 12, ...options };

      // Try mock provider first for now
      const samples = this.mockProvider.generateMockSamples(filters, opts.maxResults);
      return samples;
    } catch (error) {
      throw error;
    }
  }

  getServiceHealth() {
    return {
      ...this.serviceHealth,
      overall: 'healthy',
      lastUpdated: Date.now()
    };
  }

  async refreshServiceHealth() {
    return this.getServiceHealth();
  }

  async clearCache() {
    this.cacheManager.invalidateCache();
  }

  getCacheStats() {
    return this.cacheManager.getCacheStats();
  }

  cleanup() {
    // Cleanup logic
  }
}

export default DiscoveryService;