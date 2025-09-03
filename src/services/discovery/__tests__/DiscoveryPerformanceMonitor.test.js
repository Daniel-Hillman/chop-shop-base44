import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import DiscoveryPerformanceMonitor from '../DiscoveryPerformanceMonitor.js';

// Mock performance API
const mockPerformance = {
    now: vi.fn(() => 1000),
    memory: {
        usedJSHeapSize: 10 * 1024 * 1024, // 10MB
        totalJSHeapSize: 20 * 1024 * 1024, // 20MB
        jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB
    },
    getEntriesByType: vi.fn(() => [])
};

// Mock PerformanceObserver
const mockPerformanceObserver = vi.fn();
mockPerformanceObserver.prototype.observe = vi.fn();
mockPerformanceObserver.prototype.disconnect = vi.fn();

// Mock window and global objects
const mockWindow = {
    PerformanceObserver: mockPerformanceObserver,
    dispatchEvent: vi.fn(),
    CustomEvent: vi.fn()
};

describe('DiscoveryPerformanceMonitor', () => {
    let monitor;
    let originalPerformance;
    let originalWindow;

    beforeEach(() => {
        // Store original globals
        originalPerformance = global.performance;
        originalWindow = global.window;

        // Set up mocks
        global.performance = mockPerformance;
        global.window = mockWindow;

        // Reset mocks
        vi.clearAllMocks();
        mockPerformance.now.mockReturnValue(1000);

        // Create fresh monitor instance with disabled memory monitoring initially
        monitor = new DiscoveryPerformanceMonitor();
        // Clear any metrics that were added during initialization
        monitor.reset();
    });

    afterEach(() => {
        // Cleanup monitor
        if (monitor) {
            monitor.cleanup();
        }

        // Restore original globals
        global.performance = originalPerformance;
        global.window = originalWindow;
    });

    describe('Initialization', () => {
        it('should initialize with default configuration', () => {
            expect(monitor.isEnabled).toBeDefined();
            expect(monitor.thresholds).toEqual({
                pageLoad: 2000,
                filterResponse: 1000,
                apiCall: 5000,
                memoryWarning: 50 * 1024 * 1024
            });
            expect(monitor.metrics).toBeInstanceOf(Map);
            expect(monitor.timers).toBeInstanceOf(Map);
            expect(monitor.observers).toBeInstanceOf(Map);
        });

        it('should be enabled in test environment', () => {
            expect(monitor.isEnabled).toBe(true);
        });

        it('should initialize performance observers when available', () => {
            // Create a new monitor to test initialization
            const testMonitor = new DiscoveryPerformanceMonitor();
            expect(mockPerformanceObserver).toHaveBeenCalled();
            testMonitor.cleanup();
        });
    });

    describe('Timing Operations', () => {
        it('should start timing a metric', () => {
            const context = { test: 'data' };
            monitor.startTiming('testMetric', context);

            expect(monitor.timers.has('testMetric')).toBe(true);
            const timer = monitor.timers.get('testMetric');
            expect(timer.startTime).toBe(1000);
            expect(timer.context).toEqual(context);
            expect(timer.timestamp).toBeTypeOf('number');
        });

        it('should end timing and record metric', () => {
            // Start timing
            monitor.startTiming('testMetric', { initial: 'context' });

            // Mock time progression
            mockPerformance.now.mockReturnValue(1500);

            // End timing
            const duration = monitor.endTiming('testMetric', { additional: 'context' });

            expect(duration).toBe(500);
            expect(monitor.timers.has('testMetric')).toBe(false);
            expect(monitor.metrics.size).toBe(1);

            const metric = Array.from(monitor.metrics.values())[0];
            expect(metric.name).toBe('testMetric');
            expect(metric.duration).toBe(500);
            expect(metric.context).toEqual({
                initial: 'context',
                additional: 'context'
            });
        });

        it('should handle ending timing without starting', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

            const duration = monitor.endTiming('nonexistentMetric');

            expect(duration).toBe(0);
            expect(consoleSpy).toHaveBeenCalledWith('No timer found for metric: nonexistentMetric');

            consoleSpy.mockRestore();
        });

        it('should detect slow performance', () => {
            monitor.startTiming('pageLoad');
            mockPerformance.now.mockReturnValue(4000); // 3 seconds (exceeds 2s threshold)

            const duration = monitor.endTiming('pageLoad');

            expect(duration).toBe(3000);
            const metrics = Array.from(monitor.metrics.values());
            const pageLoadMetric = metrics.find(m => m.name === 'pageLoad');
            expect(pageLoadMetric.isSlowPerformance).toBe(true);
        });
    });

    describe('Metric Recording', () => {
        it('should record a metric with all properties', () => {
            const metric = {
                name: 'testMetric',
                duration: 500,
                startTime: 1000,
                endTime: 1500,
                timestamp: Date.now(),
                context: { test: 'data' },
                threshold: 1000,
                isSlowPerformance: false
            };

            monitor.recordMetric(metric);

            expect(monitor.metrics.size).toBeGreaterThanOrEqual(1);
            const metrics = Array.from(monitor.metrics.values());
            const testMetric = metrics.find(m => m.name === 'testMetric');
            expect(testMetric).toEqual(metric);
        });

        it('should emit custom event for external monitoring', () => {
            // Clear any previous calls
            mockWindow.dispatchEvent.mockClear();
            mockWindow.CustomEvent.mockClear();

            const metric = {
                name: 'testMetric',
                duration: 500,
                timestamp: Date.now(),
                context: {},
                isSlowPerformance: false
            };

            monitor.recordMetric(metric);

            expect(mockWindow.dispatchEvent).toHaveBeenCalled();
            expect(mockWindow.CustomEvent).toHaveBeenCalledWith('discoveryPerformanceMetric', {
                detail: metric
            });
        });

        it('should limit metrics storage to 100 entries', () => {
            // Add 101 metrics
            for (let i = 0; i < 101; i++) {
                monitor.recordMetric({
                    name: `metric_${i}`,
                    duration: i,
                    timestamp: Date.now() + i,
                    context: {},
                    isSlowPerformance: false
                });
            }

            expect(monitor.metrics.size).toBe(100);
        });

        it('should log warning for slow performance', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

            const metric = {
                name: 'slowMetric',
                duration: 3000,
                threshold: 1000,
                isSlowPerformance: true,
                context: { test: 'data' }
            };

            monitor.recordMetric(metric);

            expect(consoleSpy).toHaveBeenCalledWith(
                'Slow performance detected for slowMetric:',
                {
                    duration: '3000.00ms',
                    threshold: '1000ms',
                    context: { test: 'data' }
                }
            );

            consoleSpy.mockRestore();
        });
    });

    describe('Page Load Tracking', () => {
        it('should track page load metrics', () => {
            const navigationEntry = {
                domContentLoadedEventEnd: 1500,
                domContentLoadedEventStart: 1400,
                loadEventEnd: 2000,
                loadEventStart: 1900,
                navigationStart: 1000,
                domainLookupEnd: 1100,
                domainLookupStart: 1050,
                connectEnd: 1200,
                connectStart: 1150,
                responseEnd: 1400,
                requestStart: 1300,
                domComplete: 1800,
                domLoading: 1500
            };

            mockPerformance.getEntriesByType.mockReturnValue([navigationEntry]);

            monitor.trackPageLoad();

            expect(monitor.metrics.size).toBeGreaterThan(0);

            // Check that page load metrics were recorded
            const metrics = Array.from(monitor.metrics.values());
            const pageLoadMetrics = metrics.filter(m => m.name.startsWith('pageLoad_'));
            expect(pageLoadMetrics.length).toBeGreaterThan(0);
        });

        it('should handle missing navigation timing', () => {
            mockPerformance.getEntriesByType.mockReturnValue([]);

            expect(() => monitor.trackPageLoad()).not.toThrow();
        });
    });

    describe('Filter Response Tracking', () => {
        it('should track filter response with context', () => {
            // First record a filterResponse metric
            monitor.startTiming('filterResponse');
            mockPerformance.now.mockReturnValue(1500);
            monitor.endTiming('filterResponse');

            const filterState = {
                genres: ['soul', 'jazz'],
                yearRange: { start: 1960, end: 1980 },
                tempoRange: { min: 80, max: 120 }
            };

            monitor.trackFilterResponse(filterState, 25);

            const metrics = Array.from(monitor.metrics.values());
            const filterMetric = metrics.find(m => m.name === 'filterResponse');

            expect(filterMetric.context).toEqual({
                filterCount: 3,
                resultCount: 25,
                genres: 2,
                hasYearRange: true,
                hasAdvancedFilters: true
            });
        });
    });

    describe('API Call Tracking', () => {
        it('should track API call performance', () => {
            // First record an API call metric
            monitor.startTiming('apiCall_youtube');
            mockPerformance.now.mockReturnValue(2000);
            monitor.endTiming('apiCall_youtube');

            monitor.trackAPICall('youtube', true, 1024);

            const metrics = Array.from(monitor.metrics.values());
            const apiMetric = metrics.find(m => m.name === 'apiCall_youtube');

            expect(apiMetric.context).toEqual({
                success: true,
                responseSize: 1024,
                apiName: 'youtube'
            });
        });
    });

    describe('Memory Monitoring', () => {
        it('should start memory monitoring when available', () => {
            monitor.startMemoryMonitoring();

            // Should have recorded initial memory metric
            const metrics = Array.from(monitor.metrics.values());
            const memoryMetric = metrics.find(m => m.name === 'memoryUsage');

            expect(memoryMetric).toBeDefined();
            expect(memoryMetric.context.usedJSHeapSize).toBe(10 * 1024 * 1024);
            expect(memoryMetric.context.usagePercentage).toBe(10); // 10MB / 100MB * 100
        });

        it('should detect memory warnings', () => {
            // Mock high memory usage
            mockPerformance.memory.usedJSHeapSize = 60 * 1024 * 1024; // 60MB (exceeds 50MB threshold)

            monitor.startMemoryMonitoring();

            const metrics = Array.from(monitor.metrics.values());
            const memoryMetric = metrics.find(m => m.name === 'memoryUsage');

            expect(memoryMetric.isSlowPerformance).toBe(true);
        });
    });

    describe('Performance Summary', () => {
        beforeEach(() => {
            // Clear any existing metrics first
            monitor.reset();

            // Add some test metrics
            monitor.recordMetric({
                name: 'pageLoad_total',
                duration: 1500,
                timestamp: Date.now(),
                context: {},
                isSlowPerformance: false
            });

            monitor.recordMetric({
                name: 'pageLoad_dom',
                duration: 3000,
                timestamp: Date.now(),
                context: {},
                isSlowPerformance: true
            });

            monitor.recordMetric({
                name: 'filterResponse',
                duration: 800,
                timestamp: Date.now(),
                context: {},
                isSlowPerformance: false
            });
        });

        it('should generate performance summary for all metrics', () => {
            const summary = monitor.getPerformanceSummary();

            expect(summary.count).toBe(3);
            expect(summary.averageDuration).toBe((1500 + 3000 + 800) / 3);
            expect(summary.minDuration).toBe(800);
            expect(summary.maxDuration).toBe(3000);
            expect(summary.slowCount).toBe(1);
            expect(summary.slowPercentage).toBeCloseTo(33.33, 1);
        });

        it('should generate performance summary for specific metric type', () => {
            const summary = monitor.getPerformanceSummary('pageLoad');

            expect(summary.count).toBe(2);
            expect(summary.averageDuration).toBe((1500 + 3000) / 2);
            expect(summary.slowCount).toBe(1);
        });

        it('should handle empty metrics', () => {
            const emptyMonitor = new DiscoveryPerformanceMonitor();
            const summary = emptyMonitor.getPerformanceSummary();

            expect(summary.count).toBe(0);
            expect(summary.averageDuration).toBe(0);
            expect(summary.slowCount).toBe(0);
        });
    });

    describe('Debug Information', () => {
        it('should provide comprehensive debug information', () => {
            monitor.reset(); // Clear any existing metrics

            monitor.recordMetric({
                name: 'testMetric',
                duration: 500,
                timestamp: Date.now(),
                context: {},
                isSlowPerformance: false
            });

            const debugInfo = monitor.getDebugInfo();

            expect(debugInfo).toHaveProperty('isEnabled');
            expect(debugInfo).toHaveProperty('metricsCount');
            expect(debugInfo).toHaveProperty('activeTimers');
            expect(debugInfo).toHaveProperty('observers');
            expect(debugInfo).toHaveProperty('thresholds');
            expect(debugInfo).toHaveProperty('recentMetrics');
            expect(debugInfo).toHaveProperty('performanceSummary');

            expect(debugInfo.metricsCount).toBe(1);
            expect(debugInfo.performanceSummary).toHaveProperty('pageLoad');
            expect(debugInfo.performanceSummary).toHaveProperty('filterResponse');
            expect(debugInfo.performanceSummary).toHaveProperty('apiCall');
            expect(debugInfo.performanceSummary).toHaveProperty('memory');
        });
    });

    describe('Metrics Export', () => {
        beforeEach(() => {
            monitor.reset(); // Clear any existing metrics

            monitor.recordMetric({
                name: 'testMetric',
                duration: 500,
                timestamp: 1234567890,
                context: { test: 'data' },
                isSlowPerformance: false
            });
        });

        it('should export metrics as JSON', () => {
            const exported = monitor.exportMetrics('json');
            const parsed = JSON.parse(exported);

            expect(Array.isArray(parsed)).toBe(true);
            expect(parsed.length).toBe(1);
            const testMetric = parsed.find(m => m.name === 'testMetric');
            expect(testMetric.name).toBe('testMetric');
            expect(testMetric.duration).toBe(500);
        });

        it('should export metrics as CSV', () => {
            const exported = monitor.exportMetrics('csv');
            const lines = exported.split('\n');

            expect(lines[0]).toBe('name,duration,timestamp,isSlowPerformance,context');
            expect(exported).toContain('testMetric,500,1234567890,false');
        });

        it('should default to JSON export', () => {
            const exported = monitor.exportMetrics();
            expect(() => JSON.parse(exported)).not.toThrow();
        });
    });

    describe('Cleanup and Reset', () => {
        it('should reset all metrics and timers', () => {
            monitor.startTiming('testTimer');
            monitor.recordMetric({
                name: 'testMetric',
                duration: 500,
                timestamp: Date.now(),
                context: {},
                isSlowPerformance: false
            });

            monitor.reset();

            expect(monitor.metrics.size).toBe(0);
            expect(monitor.timers.size).toBe(0);
        });

        it('should cleanup observers and intervals', () => {
            const mockObserver = {
                disconnect: vi.fn()
            };
            const mockInterval = {
                interval: 123
            };

            monitor.observers.set('test1', mockObserver);
            monitor.observers.set('test2', mockInterval);

            const clearIntervalSpy = vi.spyOn(global, 'clearInterval').mockImplementation(() => { });

            monitor.cleanup();

            expect(mockObserver.disconnect).toHaveBeenCalled();
            expect(clearIntervalSpy).toHaveBeenCalledWith(123);
            expect(monitor.observers.size).toBe(0);
            expect(monitor.metrics.size).toBe(0);

            clearIntervalSpy.mockRestore();
        });
    });

    describe('Disabled State', () => {
        it('should not perform operations when disabled', () => {
            const disabledMonitor = new DiscoveryPerformanceMonitor();
            disabledMonitor.reset(); // Clear any initialization metrics
            disabledMonitor.isEnabled = false;

            disabledMonitor.startTiming('testMetric');
            disabledMonitor.recordMetric({
                name: 'testMetric',
                duration: 500,
                timestamp: Date.now(),
                context: {},
                isSlowPerformance: false
            });

            expect(disabledMonitor.timers.size).toBe(0);
            expect(disabledMonitor.metrics.size).toBe(0);

            disabledMonitor.cleanup();
        });
    });
});