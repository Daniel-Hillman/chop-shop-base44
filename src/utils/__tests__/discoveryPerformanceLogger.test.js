import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DiscoveryPerformanceLogger } from '../discoveryPerformanceLogger.js';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
};

// Mock window and global objects
const mockWindow = {
  localStorage: mockLocalStorage,
  location: { href: 'http://localhost:3000/sample-discovery' }
};

const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Test Browser)'
};

const mockPerformance = {
  memory: {
    usedJSHeapSize: 10 * 1024 * 1024,
    totalJSHeapSize: 20 * 1024 * 1024,
    jsHeapSizeLimit: 100 * 1024 * 1024
  }
};

describe('DiscoveryPerformanceLogger', () => {
  let logger;
  let originalWindow;
  let originalNavigator;
  let originalPerformance;
  let consoleSpy;

  beforeEach(() => {
    // Store originals
    originalWindow = global.window;
    originalNavigator = global.navigator;
    originalPerformance = global.performance;

    // Set up mocks
    global.window = mockWindow;
    global.navigator = mockNavigator;
    global.performance = mockPerformance;

    // Reset mocks
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);

    // Spy on console methods
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      log: vi.spyOn(console, 'log').mockImplementation(() => {})
    };

    // Create fresh logger instance
    logger = new DiscoveryPerformanceLogger();
  });

  afterEach(() => {
    // Cleanup logger
    if (logger) {
      logger.cleanup();
    }

    // Restore originals
    global.window = originalWindow;
    global.navigator = originalNavigator;
    global.performance = originalPerformance;

    // Restore console methods
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(logger.config).toBeDefined();
      expect(logger.logBuffer).toEqual([]);
      expect(logger.maxBufferSize).toBe(100);
      expect(logger.alertCallbacks).toBeInstanceOf(Set);
    });

    it('should load existing logs from localStorage', () => {
      const existingLogs = [
        { timestamp: Date.now(), level: 'INFO', message: 'Test log' }
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingLogs));

      const newLogger = new DiscoveryPerformanceLogger();
      expect(newLogger.logBuffer).toEqual(existingLogs);
      newLogger.cleanup();
    });

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      expect(() => new DiscoveryPerformanceLogger()).not.toThrow();
    });
  });

  describe('Log Level Management', () => {
    it('should determine correct log level based on duration', () => {
      expect(logger.getLogLevel(100)).toBe('debug');
      expect(logger.getLogLevel(600)).toBe('info');
      expect(logger.getLogLevel(1500)).toBe('warn');
      expect(logger.getLogLevel(3500)).toBe('error');
    });

    it('should check if should log at given level', () => {
      logger.config.currentLevel = 1; // INFO level

      expect(logger.shouldLog('debug')).toBe(false);
      expect(logger.shouldLog('info')).toBe(true);
      expect(logger.shouldLog('warn')).toBe(true);
      expect(logger.shouldLog('error')).toBe(true);
    });
  });

  describe('Metric Logging', () => {
    it('should log a performance metric', () => {
      const metric = {
        name: 'testMetric',
        duration: 500,
        isSlowPerformance: false,
        context: { test: 'data' }
      };

      logger.logMetric(metric, 'info', 'Test message');

      expect(logger.logBuffer.length).toBe(1);
      const logEntry = logger.logBuffer[0];
      expect(logEntry.level).toBe('INFO');
      expect(logEntry.message).toBe('Test message');
      expect(logEntry.metric).toEqual(metric);
      expect(logEntry.context).toBeDefined();
    });

    it('should generate automatic message when none provided', () => {
      const metric = {
        name: 'testMetric',
        duration: 750,
        isSlowPerformance: false
      };

      logger.logMetric(metric);

      const logEntry = logger.logBuffer[0];
      expect(logEntry.message).toBe('testMetric: 750.00ms');
    });

    it('should not log when level is below threshold', () => {
      logger.config.currentLevel = 2; // WARN level

      logger.logMetric({ name: 'test' }, 'debug');
      logger.logMetric({ name: 'test' }, 'info');

      expect(logger.logBuffer.length).toBe(0);
    });
  });

  describe('Specialized Logging Methods', () => {
    it('should log page load performance', () => {
      const pageLoadMetrics = {
        totalPageLoad: 1500,
        domContentLoaded: 800,
        loadComplete: 200
      };

      logger.logPageLoad(pageLoadMetrics);

      expect(logger.logBuffer.length).toBe(1);
      const logEntry = logger.logBuffer[0];
      expect(logEntry.metric.type).toBe('pageLoad');
      expect(logEntry.message).toContain('Page loaded in 1500.00ms');
    });

    it('should log filter operation performance', () => {
      const filterMetrics = {
        duration: 800,
        context: { filterCount: 3 }
      };

      logger.logFilterOperation(filterMetrics);

      expect(logger.logBuffer.length).toBe(1);
      const logEntry = logger.logBuffer[0];
      expect(logEntry.metric.type).toBe('filterOperation');
      expect(logEntry.message).toContain('Filter operation completed in 800.00ms');
    });

    it('should log successful API call performance', () => {
      const apiMetrics = {
        duration: 1200,
        context: { success: true, apiName: 'youtube' }
      };

      logger.logAPICall(apiMetrics);

      expect(logger.logBuffer.length).toBe(1);
      const logEntry = logger.logBuffer[0];
      expect(logEntry.metric.type).toBe('apiCall');
      expect(logEntry.message).toContain('API call (youtube) completed in 1200.00ms');
    });

    it('should log failed API call as error', () => {
      const apiMetrics = {
        duration: 5000,
        context: { success: false, apiName: 'youtube' }
      };

      logger.logAPICall(apiMetrics);

      expect(logger.logBuffer.length).toBe(1);
      const logEntry = logger.logBuffer[0];
      expect(logEntry.level).toBe('ERROR');
      expect(logEntry.message).toContain('API call (youtube) failed after 5000.00ms');
    });

    it('should log memory usage with appropriate level', () => {
      const memoryMetrics = {
        context: { usagePercentage: 85 }
      };

      logger.logMemoryUsage(memoryMetrics);

      expect(logger.logBuffer.length).toBe(1);
      const logEntry = logger.logBuffer[0];
      expect(logEntry.level).toBe('ERROR');
      expect(logEntry.message).toContain('Memory usage: 85.0%');
    });
  });

  describe('Alert System', () => {
    it('should log performance alerts', () => {
      logger.logAlert('SLOW_PERFORMANCE', { duration: 3000 }, 'Operation too slow');

      expect(logger.logBuffer.length).toBe(1);
      const alertEntry = logger.logBuffer[0];
      expect(alertEntry.level).toBe('ALERT');
      expect(alertEntry.alertType).toBe('SLOW_PERFORMANCE');
      expect(alertEntry.message).toBe('Operation too slow');
    });

    it('should check for slow performance alerts', () => {
      const metric = {
        name: 'slowOperation',
        duration: 3000,
        threshold: 1000,
        isSlowPerformance: true
      };

      logger.logMetric(metric);

      // Should have both the metric log and the alert
      expect(logger.logBuffer.length).toBe(2);
      const alertEntry = logger.logBuffer.find(entry => entry.level === 'ALERT');
      expect(alertEntry.alertType).toBe('SLOW_PERFORMANCE');
    });

    it('should check for memory usage alerts', () => {
      const metric = {
        type: 'memoryUsage',
        context: { usagePercentage: 85 }
      };

      logger.logMetric(metric);

      // Should have both the metric log and the alert
      expect(logger.logBuffer.length).toBe(2);
      const alertEntry = logger.logBuffer.find(entry => entry.level === 'ALERT');
      expect(alertEntry.alertType).toBe('HIGH_MEMORY_USAGE');
    });

    it('should check for API failure alerts', () => {
      const metric = {
        type: 'apiCall',
        context: { success: false, apiName: 'youtube' }
      };

      logger.logMetric(metric);

      // Should have both the metric log and the alert
      expect(logger.logBuffer.length).toBe(2);
      const alertEntry = logger.logBuffer.find(entry => entry.level === 'ALERT');
      expect(alertEntry.alertType).toBe('API_FAILURE');
    });

    it('should support alert callbacks', () => {
      const alertCallback = vi.fn();
      const unsubscribe = logger.onAlert(alertCallback);

      logger.logAlert('TEST_ALERT', {}, 'Test alert');

      expect(alertCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'ALERT',
          alertType: 'TEST_ALERT',
          message: 'Test alert'
        })
      );

      // Test unsubscribe
      unsubscribe();
      logger.logAlert('TEST_ALERT_2', {}, 'Test alert 2');
      expect(alertCallback).toHaveBeenCalledTimes(1);
    });

    it('should handle alert callback errors gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error');
      });
      logger.onAlert(errorCallback);

      expect(() => {
        logger.logAlert('TEST_ALERT', {}, 'Test alert');
      }).not.toThrow();

      expect(consoleSpy.error).toHaveBeenCalledWith('Alert callback failed:', expect.any(Error));
    });
  });

  describe('Console Output', () => {
    it('should output logs to console with correct methods', () => {
      logger.logMetric({ name: 'test' }, 'debug', 'Debug message');
      logger.logMetric({ name: 'test' }, 'info', 'Info message');
      logger.logMetric({ name: 'test' }, 'warn', 'Warn message');
      logger.logMetric({ name: 'test' }, 'error', 'Error message');

      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG] Debug message'),
        expect.any(Object)
      );
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] Info message'),
        expect.any(Object)
      );
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('[WARN] Warn message'),
        expect.any(Object)
      );
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] Error message'),
        expect.any(Object)
      );
    });

    it('should not output to console when disabled', () => {
      logger.config.features.console = false;

      logger.logMetric({ name: 'test' }, 'info', 'Test message');

      expect(consoleSpy.info).not.toHaveBeenCalled();
    });
  });

  describe('Buffer Management', () => {
    it('should maintain buffer size limit', () => {
      logger.maxBufferSize = 5;

      // Add 7 entries
      for (let i = 0; i < 7; i++) {
        logger.logMetric({ name: `test${i}` }, 'info', `Message ${i}`);
      }

      expect(logger.logBuffer.length).toBe(5);
      // Should keep the last 5 entries
      expect(logger.logBuffer[0].message).toBe('Message 2');
      expect(logger.logBuffer[4].message).toBe('Message 6');
    });
  });

  describe('Context Information', () => {
    it('should include context information in logs', () => {
      logger.logMetric({ name: 'test' });

      const logEntry = logger.logBuffer[0];
      expect(logEntry.context).toEqual({
        timestamp: expect.any(Number),
        userAgent: 'Mozilla/5.0 (Test Browser)',
        url: 'http://localhost:3000/sample-discovery',
        memory: {
          used: 10 * 1024 * 1024,
          total: 20 * 1024 * 1024,
          limit: 100 * 1024 * 1024
        }
      });
    });
  });

  describe('Log Retrieval and Analysis', () => {
    beforeEach(() => {
      // Add test logs
      logger.logMetric({ name: 'test1', duration: 500, type: 'pageLoad' }, 'info');
      logger.logMetric({ name: 'test2', duration: 1500, type: 'filterOperation' }, 'warn');
      logger.logAlert('TEST_ALERT', {}, 'Test alert');
    });

    it('should get recent logs', () => {
      const recentLogs = logger.getRecentLogs(2);
      expect(recentLogs.length).toBe(2);
      expect(recentLogs[1].level).toBe('ALERT');
    });

    it('should filter logs by level', () => {
      const warnLogs = logger.getRecentLogs(10, 'warn');
      expect(warnLogs.length).toBe(1);
      expect(warnLogs[0].level).toBe('WARN');
    });

    it('should generate performance summary', () => {
      const summary = logger.getPerformanceSummary();

      expect(summary.totalLogs).toBe(3);
      expect(summary.metricsCount).toBe(2);
      expect(summary.alertsCount).toBe(1);
      expect(summary.byType).toHaveProperty('pageLoad');
      expect(summary.byType).toHaveProperty('filterOperation');
      expect(summary.averageDuration).toBe(1000); // (500 + 1500) / 2
    });
  });

  describe('Export Functionality', () => {
    beforeEach(() => {
      logger.logMetric({ name: 'test', duration: 500, type: 'test' }, 'info', 'Test message');
    });

    it('should export logs as JSON', () => {
      const exported = logger.exportLogs('json');
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
      expect(parsed[0].message).toBe('Test message');
    });

    it('should export logs as CSV', () => {
      const exported = logger.exportLogs('csv');
      const lines = exported.split('\n');

      expect(lines[0]).toBe('timestamp,level,message,type,duration,context');
      expect(lines[1]).toContain('INFO,"Test message",test,500');
    });

    it('should default to JSON export', () => {
      const exported = logger.exportLogs();
      expect(() => JSON.parse(exported)).not.toThrow();
    });
  });

  describe('Persistence', () => {
    it('should persist logs to localStorage', () => {
      logger.logMetric({ name: 'test' }, 'info', 'Test message');
      logger.persistLogs();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'discoveryPerformanceLogs',
        expect.stringContaining('Test message')
      );
    });

    it('should handle localStorage persistence errors', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => logger.persistLogs()).not.toThrow();
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        'Failed to persist performance logs:',
        expect.any(Error)
      );
    });

    it('should clear logs and localStorage', () => {
      logger.logMetric({ name: 'test' });
      logger.clearLogs();

      expect(logger.logBuffer.length).toBe(0);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('discoveryPerformanceLogs');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup intervals and callbacks', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval').mockImplementation(() => {});
      
      // Add some callbacks
      logger.onAlert(() => {});
      logger.onAlert(() => {});

      logger.cleanup();

      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(logger.alertCallbacks.size).toBe(0);
      expect(mockLocalStorage.setItem).toHaveBeenCalled(); // Final persist

      clearIntervalSpy.mockRestore();
    });
  });
});