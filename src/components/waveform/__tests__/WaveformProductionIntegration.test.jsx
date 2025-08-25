import { describe, it, expect, vi } from 'vitest';

describe('WaveformProduction Integration', () => {
  describe('Module Loading', () => {
    it('should load production configuration', async () => {
      const { getOptimizedConfig } = await import('../../../config/waveform.production.js');
      
      const config = getOptimizedConfig();
      
      expect(config).toHaveProperty('rendering');
      expect(config).toHaveProperty('analysis');
      expect(config).toHaveProperty('memory');
      expect(config).toHaveProperty('features');
      expect(config).toHaveProperty('bundling');
    });

    it('should load feature flags service', async () => {
      const { waveformFeatureFlags } = await import('../../../services/WaveformFeatureFlags.js');
      
      expect(waveformFeatureFlags).toBeDefined();
      expect(typeof waveformFeatureFlags.isEnabled).toBe('function');
      expect(typeof waveformFeatureFlags.getEnabledFeatures).toBe('function');
    });

    it('should load analytics service', async () => {
      const { waveformAnalytics } = await import('../../../services/WaveformAnalytics.js');
      
      expect(waveformAnalytics).toBeDefined();
      expect(typeof waveformAnalytics.trackEvent).toBe('function');
      expect(typeof waveformAnalytics.trackPerformance).toBe('function');
    });

    it('should load module loader service', async () => {
      const { waveformModuleLoader } = await import('../../../services/WaveformModuleLoader.js');
      
      expect(waveformModuleLoader).toBeDefined();
      expect(typeof waveformModuleLoader.loadAnalysisModule).toBe('function');
    });
  });

  describe('Bundle Optimization', () => {
    it('should provide code splitting utilities', async () => {
      const bundleUtils = await import('../../../utils/bundleOptimization.js');
      
      expect(bundleUtils.dynamicImportWithRetry).toBeDefined();
      expect(bundleUtils.preloadCriticalModules).toBeDefined();
      expect(bundleUtils.lazyLoadNonCriticalModules).toBeDefined();
    });

    it('should provide production configuration', async () => {
      const { PRODUCTION_CONFIG } = await import('../../../config/waveform.production.js');
      
      expect(PRODUCTION_CONFIG.rendering.maxFrameRate).toBeGreaterThan(0);
      expect(PRODUCTION_CONFIG.analysis.defaultSampleRate).toBeGreaterThan(0);
      expect(PRODUCTION_CONFIG.memory.maxWaveformCacheSize).toBeGreaterThan(0);
    });
  });

  describe('Feature Flags', () => {
    it('should have default feature flags configured', async () => {
      const { waveformFeatureFlags } = await import('../../../services/WaveformFeatureFlags.js');
      
      // Test core features are available
      const summary = waveformFeatureFlags.getSummary();
      expect(summary.totalFeatures).toBeGreaterThan(0);
      expect(summary.userSegment).toBeDefined();
      expect(summary.deviceCapabilities).toBeDefined();
    });

    it('should support feature flag overrides', async () => {
      const { waveformFeatureFlags } = await import('../../../services/WaveformFeatureFlags.js');
      
      // Test override functionality exists
      expect(typeof waveformFeatureFlags.override).toBe('function');
      expect(typeof waveformFeatureFlags.clearOverrides).toBe('function');
      
      // Test that override method works (implementation may vary)
      waveformFeatureFlags.override('testFeature', true);
      waveformFeatureFlags.clearOverrides();
    });
  });

  describe('Analytics', () => {
    it('should track events without errors', async () => {
      const { waveformAnalytics } = await import('../../../services/WaveformAnalytics.js');
      
      // Should not throw when tracking events
      expect(() => {
        waveformAnalytics.trackEvent('test_event', { test: true });
        waveformAnalytics.trackPerformance('test_metric', 100);
        waveformAnalytics.trackInteraction('test_interaction');
      }).not.toThrow();
    });

    it('should provide analytics summary', async () => {
      const { waveformAnalytics } = await import('../../../services/WaveformAnalytics.js');
      
      const summary = waveformAnalytics.getAnalyticsSummary();
      
      expect(summary).toHaveProperty('sessionId');
      expect(summary).toHaveProperty('totalEvents');
      expect(summary).toHaveProperty('performanceMetrics');
    });
  });

  describe('Production Build', () => {
    it('should have production scripts available', () => {
      const packageJson = require('../../../../package.json');
      
      expect(packageJson.scripts).toHaveProperty('build:production');
      expect(packageJson.scripts).toHaveProperty('deploy');
      expect(packageJson.scripts).toHaveProperty('analyze:bundle');
    });

    it('should have vite production configuration', async () => {
      // Test that vite config exists and has production optimizations
      const fs = await import('fs');
      const path = await import('path');
      
      const viteConfigPath = path.resolve(process.cwd(), 'vite.config.js');
      expect(fs.existsSync(viteConfigPath)).toBe(true);
      
      const viteConfig = fs.readFileSync(viteConfigPath, 'utf-8');
      expect(viteConfig).toContain('manualChunks');
      expect(viteConfig).toContain('waveform-core');
    });
  });

  describe('Error Handling', () => {
    it('should provide error recovery mechanisms', async () => {
      const { waveformAnalytics } = await import('../../../services/WaveformAnalytics.js');
      
      // Should handle error tracking without throwing
      expect(() => {
        waveformAnalytics.trackError('test_error', 'Test error message', {
          component: 'test'
        });
      }).not.toThrow();
    });

    it('should have dynamic import utility', async () => {
      const { dynamicImportWithRetry } = await import('../../../utils/bundleOptimization.js');
      
      expect(typeof dynamicImportWithRetry).toBe('function');
    });
  });
});