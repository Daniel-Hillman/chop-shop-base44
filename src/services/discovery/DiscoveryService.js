/**
 * @fileoverview DiscoveryService - Main orchestration service for sample discovery
 * Implements graceful degradation from API to cached to mock data with service health monitoring
 * and automatic fallback triggers.
 * 
 * Requirements: 2.4, 2.5, 7.1, 7.2
 */

import { validateFilterState, validateSampleData } from '../../types/discovery.js';
import youTubeIntegration from './YouTubeIntegration.js';
import MockSampleProvider from './MockSampleProvider.js';
import DiscoveryCacheManager from './DiscoveryCacheManager.js';
import discoveryErrorService from './DiscoveryErrorService.js';
import DiscoveryPerformanceMonitor from './DiscoveryPerformanceMonitor.js';

/**
 * Main discovery service that orchestrates API calls and fallbacks
 * Implements graceful degradation: API -> Cache -> Mock Data
 */
class DiscoveryService {
  constructor() {
    this.youtubeService = youTubeIntegration;
    this.mockProvider = new MockSampleProvider();
    this.cacheManager = new DiscoveryCacheManager();
    this.errorService = discoveryErrorService;
    this.performanceMonitor = new DiscoveryPerformanceMonitor();
    
    // Service health tracking
    this.serviceHealth = {
      youtube: { available: true, lastCheck: 0, failureCount: 0 },
      cache: { available: true, lastCheck: 0, failureCount: 0 },
      mock: { available: true, lastCheck: 0, failureCount: 0 }
    };
    
    // Configuration
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      healthCheckInterval: 300000, // 5 minutes
      fallbackThreshold: 3, // failures before fallback
      cacheFirst: false // Set to true to prioritize cache over API
    };
    
    // Initialize health monitoring (only in browser)
    if (typeof window !== 'undefined') {
      this._initializeHealthMonitoring();
    }
  }

  /**
   * Discover samples with intelligent fallback chain
   * @param {import('../../types/discovery.js').FilterState} filters - Search filters
   * @param {Object} options - Additional options
   * @returns {Promise<import('../../types/discovery.js').SampleData[]>} Array of sample data
   */
  async discoverSamples(filters = {}, options = {}) {
    const startTime = performance.now();
    const requestId = this._generateRequestId();
    
    try {
      // Validate filters
      const filterValidation = validateFilterState(filters);
      if (!filterValidation.isValid) {
        console.warn('[DiscoveryService] Invalid filters:', filterValidation.errors);
        filters = this._getDefaultFilters();
      }

      // Set default options
      const opts = {
        forceRefresh: false,
        maxResults: 12,
        preferredSource: 'auto',
        ...options
      };

      console.debug(`[DiscoveryService] Starting discovery request ${requestId}`, { filters, options: opts });

      // Determine fallback chain based on service health and preferences
      const fallbackChain = this._buildFallbackChain(opts.preferredSource);
      
      let lastError = null;
      let samples = null;

      // Execute fallback chain
      for (const source of fallbackChain) {
        try {
          console.debug(`[DiscoveryService] Trying source: ${source}`);
          
          switch (source) {
            case 'cache':
              if (!opts.forceRefresh) {
                samples = await this._tryCache(filters, opts);
              }
              break;
              
            case 'api':
              samples = await this._tryAPI(filters, opts);
              break;
              
            case 'mock':
              samples = await this._tryMock(filters, opts);
              break;
          }

          if (samples && samples.length > 0) {
            console.debug(`[DiscoveryService] Success with source: ${source}, got ${samples.length} samples`);
            
            // Update service health on success
            this._updateServiceHealth(source, true);
            
            // Cache API results for future use
            if (source === 'api' && samples.length > 0) {
              await this._cacheResults(filters, samples);
            }
            
            // Record performance metrics
            this.performanceMonitor.recordMetric('discoveryRequest', {
              duration: performance.now() - startTime,
              source: source,
              success: true,
              resultCount: samples.length,
              requestId: requestId
            });

            return samples;
          }
          
        } catch (error) {
          console.warn(`[DiscoveryService] Source ${source} failed:`, error.message);
          lastError = error;
          
          // Update service health on failure
          this._updateServiceHealth(source, false);
          
          // Continue to next source in fallback chain
          continue;
        }
      }

      // If we get here, all sources failed
      throw new Error(`All discovery sources failed. Last error: ${lastError?.message || 'Unknown error'}`);

    } catch (error) {
      // Record failure metrics
      this.performanceMonitor.recordMetric('discoveryRequest', {
        duration: performance.now() - startTime,
        source: 'failed',
        success: false,
        error: error.message,
        requestId: requestId
      });

      // Re-throw error
      throw error;
    }
  }

  /**
   * Get samples - alias for discoverSamples for backward compatibility
   * @param {import('../../types/discovery.js').FilterState} filters - Search filters
   * @param {Object} options - Additional options
   * @returns {Promise<import('../../types/discovery.js').SampleData[]>} Array of sample data
   */
  async getSamples(filters = {}, options = {}) {
    return this.discoverSamples(filters, options);
  }

  /**
   * Get detailed information about a specific sample
   * @param {string} sampleId - Sample ID to get details for
   * @returns {Promise<import('../../types/discovery.js').SampleData>} Sample details
   */
  async getSampleDetails(sampleId) {
    const startTime = performance.now();
    
    try {
      if (!sampleId) {
        throw new Error('Sample ID is required');
      }

      console.debug(`[DiscoveryService] Getting details for sample: ${sampleId}`);

      // Check if it's a mock sample
      if (sampleId.startsWith('mock-')) {
        return this._getMockSampleDetails(sampleId);
      }

      // Check if it's a YouTube sample
      if (sampleId.startsWith('youtube-')) {
        const youtubeId = sampleId.replace('youtube-', '');
        return await this.youtubeService.getVideoDetails(youtubeId);
      }

      throw new Error(`Unknown sample ID format: ${sampleId}`);

    } catch (error) {
      this.performanceMonitor.recordMetric('sampleDetails', {
        duration: performance.now() - startTime,
        success: false,
        error: error.message,
        sampleId: sampleId
      });

      throw error;
    }
  }

  /**
   * Get service health status
   * @returns {Object} Service health information
   */
  getServiceHealth() {
    return {
      ...this.serviceHealth,
      overall: this._calculateOverallHealth(),
      lastUpdated: Date.now()
    };
  }

  /**
   * Force refresh of service health checks
   * @returns {Promise<Object>} Updated health status
   */
  async refreshServiceHealth() {
    console.debug('[DiscoveryService] Refreshing service health');
    
    // Test YouTube API
    try {
      const isYouTubeHealthy = await this.youtubeService.testConnection();
      this._updateServiceHealth('youtube', isYouTubeHealthy);
    } catch (error) {
      this._updateServiceHealth('youtube', false);
    }

    // Test cache
    try {
      const cacheStats = this.cacheManager.getCacheStats();
      this._updateServiceHealth('cache', true);
    } catch (error) {
      this._updateServiceHealth('cache', false);
    }

    // Mock provider is always available
    this._updateServiceHealth('mock', true);

    return this.getServiceHealth();
  }

  /**
   * Clear all cached data
   * @returns {Promise<void>}
   */
  async clearCache() {
    try {
      this.cacheManager.invalidateCache();
      console.debug('[DiscoveryService] Cache cleared successfully');
    } catch (error) {
      console.warn('[DiscoveryService] Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return this.cacheManager.getCacheStats();
  }

  // Private helper methods
  async _tryCache(filters, options) {
    if (!this.serviceHealth.cache.available) {
      return null;
    }

    try {
      const cached = this.cacheManager.getCachedResults(filters);
      if (cached && cached.length > 0) {
        return options.maxResults ? cached.slice(0, options.maxResults) : cached;
      }
      return null;
    } catch (error) {
      console.warn('[DiscoveryService] Cache access failed:', error);
      return null;
    }
  }

  async _tryAPI(filters, options) {
    if (!this.serviceHealth.youtube.available) {
      return null;
    }

    try {
      const searchParams = this._convertFiltersToSearchParams(filters, options);
      const samples = await this.youtubeService.searchSamples(searchParams);
      
      // Validate samples
      const validSamples = samples.filter(sample => {
        const validation = validateSampleData(sample);
        if (!validation.isValid) {
          console.warn('[DiscoveryService] Invalid sample from API:', validation.errors);
          return false;
        }
        return true;
      });

      return validSamples;
    } catch (error) {
      console.warn('[DiscoveryService] API request failed:', error);
      throw error;
    }
  }

  async _tryMock(filters, options) {
    if (!this.serviceHealth.mock.available) {
      throw new Error('Mock provider is not available');
    }

    try {
      const samples = this.mockProvider.generateMockSamples(filters, options.maxResults);
      console.debug(`[DiscoveryService] Generated ${samples.length} mock samples`);
      return samples;
    } catch (error) {
      console.warn('[DiscoveryService] Mock provider failed:', error);
      throw error;
    }
  }

  async _cacheResults(filters, samples) {
    try {
      this.cacheManager.cacheResults(filters, samples);
    } catch (error) {
      console.warn('[DiscoveryService] Failed to cache results:', error);
    }
  }

  _buildFallbackChain(preferredSource) {
    const availableSources = [];
    
    if (this.serviceHealth.cache.available) availableSources.push('cache');
    if (this.serviceHealth.youtube.available) availableSources.push('api');
    if (this.serviceHealth.mock.available) availableSources.push('mock');

    if (preferredSource && preferredSource !== 'auto') {
      const filtered = availableSources.filter(s => s === preferredSource);
      if (filtered.length > 0) {
        return [...filtered, ...availableSources.filter(s => s !== preferredSource)];
      }
    }

    return ['cache', 'api', 'mock'].filter(source => availableSources.includes(source));
  }

  _convertFiltersToSearchParams(filters, options) {
    return {
      genres: filters.genres || [],
      yearRange: filters.yearRange || { start: 1950, end: 1995 },
      maxResults: options.maxResults || 12,
      order: 'relevance'
    };
  }

  _getMockSampleDetails(sampleId) {
    const allGenres = this.mockProvider.getAvailableGenres();
    
    for (const genre of allGenres) {
      const genreSamples = this.mockProvider.getGenreSpecificSamples(genre, 100);
      const sample = genreSamples.find(s => s.id === sampleId);
      if (sample) {
        return sample;
      }
    }
    
    throw new Error(`Mock sample not found: ${sampleId}`);
  }

  _updateServiceHealth(service, isHealthy) {
    const health = this.serviceHealth[service];
    if (!health) return;

    health.lastCheck = Date.now();
    
    if (isHealthy) {
      health.available = true;
      health.failureCount = 0;
    } else {
      health.failureCount++;
      if (health.failureCount >= this.config.fallbackThreshold) {
        health.available = false;
      }
    }
  }

  _calculateOverallHealth() {
    const services = Object.values(this.serviceHealth);
    const availableCount = services.filter(s => s.available).length;
    
    if (availableCount === services.length) return 'healthy';
    if (availableCount > 0) return 'degraded';
    return 'unhealthy';
  }

  _initializeHealthMonitoring() {
    setInterval(() => {
      this.refreshServiceHealth().catch(error => {
        console.warn('[DiscoveryService] Health check failed:', error);
      });
    }, this.config.healthCheckInterval);
  }

  _getDefaultFilters() {
    return {
      genres: [],
      yearRange: { start: 1950, end: 1995 },
      tempoRange: null,
      durationRange: null,
      instruments: []
    };
  }

  _generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  cleanup() {
    if (this.youtubeService && typeof this.youtubeService.cleanup === 'function') {
      this.youtubeService.cleanup();
    }
    if (this.cacheManager && typeof this.cacheManager.destroy === 'function') {
      this.cacheManager.destroy();
    }
    console.debug('[DiscoveryService] Cleanup completed');
  }
}

// Export as default
export default DiscoveryService;