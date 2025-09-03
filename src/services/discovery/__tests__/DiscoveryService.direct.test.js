/**
 * @fileoverview Direct tests for DiscoveryService using the singleton instance
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import discoveryService from '../DiscoveryService.js';

describe('DiscoveryService Direct Tests', () => {
  beforeEach(() => {
    // Clear any existing state
    if (discoveryService && typeof discoveryService.clearCache === 'function') {
      discoveryService.clearCache().catch(() => {
        // Ignore cache clear errors in tests
      });
    }
  });

  it('should have the singleton instance available', () => {
    expect(discoveryService).toBeDefined();
    expect(typeof discoveryService).toBe('object');
  });

  it('should have required methods', () => {
    expect(typeof discoveryService.discoverSamples).toBe('function');
    expect(typeof discoveryService.getSampleDetails).toBe('function');
    expect(typeof discoveryService.getServiceHealth).toBe('function');
    expect(typeof discoveryService.refreshServiceHealth).toBe('function');
    expect(typeof discoveryService.clearCache).toBe('function');
    expect(typeof discoveryService.getCacheStats).toBe('function');
    expect(typeof discoveryService.cleanup).toBe('function');
  });

  it('should return service health status', () => {
    const health = discoveryService.getServiceHealth();
    
    expect(health).toBeDefined();
    expect(health).toHaveProperty('youtube');
    expect(health).toHaveProperty('cache');
    expect(health).toHaveProperty('mock');
    expect(health).toHaveProperty('overall');
    expect(health).toHaveProperty('lastUpdated');
  });

  it('should discover samples using fallback to mock data', async () => {
    const filters = {
      genres: ['Soul'],
      yearRange: { start: 1960, end: 1980 }
    };

    const result = await discoveryService.discoverSamples(filters);
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    
    // Should get mock data since API key is likely not configured in test
    const sample = result[0];
    expect(sample).toHaveProperty('id');
    expect(sample).toHaveProperty('title');
    expect(sample).toHaveProperty('artist');
    expect(sample).toHaveProperty('genre');
    expect(sample).toHaveProperty('year');
  });

  it('should handle empty filters gracefully', async () => {
    const result = await discoveryService.discoverSamples({});
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should get cache stats', () => {
    const stats = discoveryService.getCacheStats();
    
    expect(stats).toBeDefined();
    expect(typeof stats).toBe('object');
  });

  it('should handle service health refresh', async () => {
    const health = await discoveryService.refreshServiceHealth();
    
    expect(health).toBeDefined();
    expect(health).toHaveProperty('youtube');
    expect(health).toHaveProperty('cache');
    expect(health).toHaveProperty('mock');
    expect(health).toHaveProperty('overall');
  });
});