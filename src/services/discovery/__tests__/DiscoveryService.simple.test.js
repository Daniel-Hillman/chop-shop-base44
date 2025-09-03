/**
 * @fileoverview Simple tests for DiscoveryService to verify basic functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DiscoveryService } from '../DiscoveryService.working.js';

describe('DiscoveryService Simple Tests', () => {
  let discoveryService;

  beforeEach(() => {
    discoveryService = new DiscoveryService();
  });

  afterEach(() => {
    if (discoveryService && typeof discoveryService.cleanup === 'function') {
      discoveryService.cleanup();
    }
  });

  it('should create a DiscoveryService instance', () => {
    expect(discoveryService).toBeDefined();
    expect(discoveryService).toBeInstanceOf(DiscoveryService);
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
});