import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import discoveryErrorService from '../DiscoveryErrorService';

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

describe('DiscoveryErrorService', () => {
  beforeEach(() => {
    // Mock console methods
    console.error = vi.fn();
    console.warn = vi.fn();
    console.log = vi.fn();

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(() => '[]'),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock
    });

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000/sample-discovery'
      },
      writable: true
    });

    // Clear any existing error reporter
    delete window.discoveryErrorReporter;
    delete window.Sentry;

    // Clear service state
    discoveryErrorService.clearErrorLogs();
  });

  afterEach(() => {
    // Restore console methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.log = originalConsoleLog;

    // Clear mocks
    vi.clearAllMocks();
  });

  describe('Retry Logic with Exponential Backoff', () => {
    it('executes operation successfully on first try', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');
      
      const result = await discoveryErrorService.withRetry(mockOperation, {
        context: 'test-operation'
      });

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('retries failed operations with exponential backoff', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      const result = await discoveryErrorService.withRetry(mockOperation, {
        context: 'retry-test',
        baseDelay: 10 // Use small delay for testing
      });

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('respects maxRetries limit', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Persistent error'));

      await expect(
        discoveryErrorService.withRetry(mockOperation, {
          context: 'max-retries-test',
          maxRetries: 2,
          baseDelay: 10
        })
      ).rejects.toThrow('Persistent error');

      expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('uses fallback when all retries fail', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Always fails'));
      const mockFallback = vi.fn().mockResolvedValue('fallback-result');

      const result = await discoveryErrorService.withRetry(mockOperation, {
        context: 'fallback-test',
        maxRetries: 1,
        baseDelay: 10,
        fallback: mockFallback
      });

      expect(result).toBe('fallback-result');
      expect(mockOperation).toHaveBeenCalledTimes(2);
      expect(mockFallback).toHaveBeenCalledWith(expect.any(Error));
    });

    it('calculates exponential backoff delays correctly', () => {
      const delay1 = discoveryErrorService.calculateDelay(1000, 0);
      const delay2 = discoveryErrorService.calculateDelay(1000, 1);
      const delay3 = discoveryErrorService.calculateDelay(1000, 2);

      expect(delay1).toBeGreaterThanOrEqual(500); // Base delay with jitter
      expect(delay1).toBeLessThanOrEqual(1500);
      
      expect(delay2).toBeGreaterThanOrEqual(1000); // 2x base delay with jitter
      expect(delay2).toBeLessThanOrEqual(3000);
      
      expect(delay3).toBeGreaterThanOrEqual(2000); // 4x base delay with jitter
      expect(delay3).toBeLessThanOrEqual(6000);
    });

    it('caps delay at maximum value', () => {
      const delay = discoveryErrorService.calculateDelay(1000, 10);
      expect(delay).toBeLessThanOrEqual(30000 * 1.5); // Max delay with jitter
    });
  });

  describe('YouTube API Error Handling', () => {
    it('handles quota exceeded errors', () => {
      const quotaError = new Error('YouTube API quota exceeded');
      quotaError.status = 403;

      const result = discoveryErrorService.handleYouTubeAPIError(quotaError);

      expect(result.type).toBe('quota_exceeded');
      expect(result.severity).toBe('warning');
      expect(result.canRetry).toBe(false);
      expect(result.fallbackToMock).toBe(true);
      expect(result.userMessage).toContain('quota exceeded');
    });

    it('handles video unavailable errors', () => {
      const unavailableError = new Error('Video not found');
      unavailableError.status = 404;

      const result = discoveryErrorService.handleYouTubeAPIError(unavailableError);

      expect(result.type).toBe('video_unavailable');
      expect(result.severity).toBe('warning');
      expect(result.canRetry).toBe(false);
      expect(result.fallbackToMock).toBe(false);
      expect(result.userMessage).toContain('not available');
    });

    it('handles rate limiting errors', () => {
      const rateLimitError = new Error('Too many requests');
      rateLimitError.status = 429;

      const result = discoveryErrorService.handleYouTubeAPIError(rateLimitError);

      expect(result.type).toBe('rate_limited');
      expect(result.severity).toBe('warning');
      expect(result.canRetry).toBe(true);
      expect(result.fallbackToMock).toBe(true);
      expect(result.retryAfter).toBe(60000);
    });

    it('handles network errors', () => {
      const networkError = new Error('Network timeout');

      const result = discoveryErrorService.handleYouTubeAPIError(networkError);

      expect(result.type).toBe('network_error');
      expect(result.severity).toBe('warning');
      expect(result.canRetry).toBe(true);
      expect(result.fallbackToMock).toBe(true);
      expect(result.retryAfter).toBe(5000);
    });

    it('handles unknown API errors', () => {
      const unknownError = new Error('Unknown API error');

      const result = discoveryErrorService.handleYouTubeAPIError(unknownError);

      expect(result.type).toBe('unknown_api_error');
      expect(result.severity).toBe('error');
      expect(result.canRetry).toBe(true);
      expect(result.fallbackToMock).toBe(true);
    });
  });

  describe('Network Error Handling', () => {
    it('handles offline state', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      const networkError = new Error('Network connection failed');
      const result = discoveryErrorService.handleNetworkError(networkError);

      expect(result.type).toBe('offline');
      expect(result.severity).toBe('warning');
      expect(result.canRetry).toBe(false);
      expect(result.fallbackToMock).toBe(true);
      expect(result.userMessage).toContain('offline');
    });

    it('handles CORS errors', () => {
      const corsError = new Error('CORS policy blocked request');
      const result = discoveryErrorService.handleNetworkError(corsError);

      expect(result.type).toBe('cors_error');
      expect(result.severity).toBe('error');
      expect(result.canRetry).toBe(false);
      expect(result.fallbackToMock).toBe(true);
      expect(result.userMessage).toContain('configuration issue');
    });

    it('handles timeout errors', () => {
      const timeoutError = new Error('Request timeout');
      const result = discoveryErrorService.handleNetworkError(timeoutError);

      expect(result.type).toBe('timeout');
      expect(result.severity).toBe('warning');
      expect(result.canRetry).toBe(true);
      expect(result.fallbackToMock).toBe(true);
      expect(result.retryAfter).toBe(10000);
    });

    it('handles general network errors', () => {
      const networkError = new Error('Connection refused');
      const result = discoveryErrorService.handleNetworkError(networkError);

      expect(result.type).toBe('network_error');
      expect(result.severity).toBe('warning');
      expect(result.canRetry).toBe(true);
      expect(result.fallbackToMock).toBe(true);
      expect(result.retryAfter).toBe(5000);
    });
  });

  describe('Error Logging', () => {
    it('logs errors with context and metadata', () => {
      const testError = new Error('Test error message');
      
      discoveryErrorService.logError('test-context', testError, {
        customData: 'test-value'
      });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'discoveryErrorLogs',
        expect.stringContaining('Test error message')
      );
    });

    it('generates unique error IDs', () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      discoveryErrorService.logError('context1', error1);
      discoveryErrorService.logError('context2', error2);

      const calls = localStorage.setItem.mock.calls;
      const log1 = JSON.parse(calls[0][1])[0];
      const log2 = JSON.parse(calls[1][1])[0];

      expect(log1.id).toBeDefined();
      expect(log2.id).toBeDefined();
      expect(log1.id).not.toBe(log2.id);
    });

    it('includes comprehensive metadata', () => {
      const testError = new Error('Metadata test');
      
      discoveryErrorService.logError('metadata-test', testError);

      const logCall = localStorage.setItem.mock.calls[0];
      const logData = JSON.parse(logCall[1])[0];

      expect(logData).toHaveProperty('timestamp');
      expect(logData).toHaveProperty('context', 'metadata-test');
      expect(logData).toHaveProperty('error.message', 'Metadata test');
      expect(logData).toHaveProperty('metadata.userAgent');
      expect(logData).toHaveProperty('metadata.url');
      expect(logData).toHaveProperty('metadata.isOnline');
    });

    it('limits stored error logs to prevent memory issues', () => {
      // Add more than 20 errors
      for (let i = 0; i < 25; i++) {
        discoveryErrorService.logError(`context-${i}`, new Error(`Error ${i}`));
      }

      const lastCall = localStorage.setItem.mock.calls[localStorage.setItem.mock.calls.length - 1];
      const storedLogs = JSON.parse(lastCall[1]);

      expect(storedLogs.length).toBeLessThanOrEqual(20);
    });

    it('handles localStorage failures gracefully', () => {
      localStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      expect(() => {
        discoveryErrorService.logError('storage-fail', new Error('Test error'));
      }).not.toThrow();

      expect(console.warn).toHaveBeenCalledWith(
        'Failed to store error log:',
        expect.any(Error)
      );
    });
  });

  describe('External Error Reporting', () => {
    it('reports to external monitoring service when available', () => {
      const mockReporter = vi.fn();
      window.discoveryErrorReporter = mockReporter;

      const testError = new Error('External reporting test');
      discoveryErrorService.logError('external-test', testError);

      expect(mockReporter).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'external-test',
          error: expect.objectContaining({
            message: 'External reporting test'
          })
        })
      );
    });

    it('reports to Sentry when available', () => {
      const mockSentry = {
        captureException: vi.fn()
      };
      window.Sentry = mockSentry;

      const testError = new Error('Sentry test');
      discoveryErrorService.logError('sentry-test', testError);

      expect(mockSentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({
            component: 'SampleDiscovery',
            context: 'sentry-test'
          })
        })
      );
    });

    it('handles external reporting failures gracefully', () => {
      window.discoveryErrorReporter = () => {
        throw new Error('Reporter failed');
      };

      expect(() => {
        discoveryErrorService.logError('reporter-fail', new Error('Test error'));
      }).not.toThrow();

      expect(console.warn).toHaveBeenCalledWith(
        'Failed to report error to monitoring:',
        expect.any(Error)
      );
    });
  });

  describe('Retry Attempt Tracking', () => {
    it('tracks retry attempts correctly', () => {
      const error = new Error('Retry tracking test');
      
      discoveryErrorService.logRetryAttempt('retry-context', 0, error, 3);
      discoveryErrorService.logRetryAttempt('retry-context', 1, error, 3);
      discoveryErrorService.logRetryAttempt('retry-context', 2, error, 3);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Discovery Retry 1/4'),
        'Retry tracking test'
      );
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Discovery Retry 2/4'),
        'Retry tracking test'
      );
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Discovery Retry 3/4'),
        'Retry tracking test'
      );
    });

    it('logs successful recovery', () => {
      const lastError = new Error('Last error before success');
      
      discoveryErrorService.logRecovery('recovery-context', 3, lastError);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Discovery Recovery: recovery-context succeeded after 3 attempts')
      );
    });

    it('logs final failure after all retries', () => {
      const finalError = new Error('Final failure error');
      
      discoveryErrorService.logFinalFailure('final-context', 3, finalError);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Discovery Final Failure: final-context failed after 4 attempts')
      );
    });
  });

  describe('Error Statistics', () => {
    it('provides error statistics', () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      discoveryErrorService.logError('context1', error1);
      discoveryErrorService.logError('context2', error2);

      const stats = discoveryErrorService.getErrorStats();

      expect(stats).toHaveProperty('totalErrors');
      expect(stats).toHaveProperty('recentErrors');
      expect(stats).toHaveProperty('errorsByContext');
      expect(stats).toHaveProperty('retryAttempts');
      expect(stats.totalErrors).toBeGreaterThan(0);
    });

    it('filters recent errors correctly', () => {
      // Mock Date.now to control timestamps
      const originalNow = Date.now;
      const mockNow = vi.fn();
      Date.now = mockNow;

      const oneHourAgo = 1000000;
      const now = oneHourAgo + (60 * 60 * 1000) + 1000; // Just over 1 hour later

      // Add old error
      mockNow.mockReturnValue(oneHourAgo);
      discoveryErrorService.logError('old-context', new Error('Old error'));

      // Add recent error
      mockNow.mockReturnValue(now);
      discoveryErrorService.logError('recent-context', new Error('Recent error'));

      const stats = discoveryErrorService.getErrorStats();

      expect(stats.recentErrors).toBe(1); // Only recent error should be counted

      // Restore Date.now
      Date.now = originalNow;
    });
  });

  describe('Service Management', () => {
    it('clears error logs when requested', () => {
      const testError = new Error('Clear test');
      discoveryErrorService.logError('clear-test', testError);

      discoveryErrorService.clearErrorLogs();

      const stats = discoveryErrorService.getErrorStats();
      expect(stats.totalErrors).toBe(0);
      expect(localStorage.removeItem).toHaveBeenCalledWith('discoveryErrorLogs');
    });

    it('handles localStorage clear failures gracefully', () => {
      localStorage.removeItem.mockImplementation(() => {
        throw new Error('Clear failed');
      });

      expect(() => {
        discoveryErrorService.clearErrorLogs();
      }).not.toThrow();

      expect(console.warn).toHaveBeenCalledWith(
        'Failed to clear stored error logs:',
        expect.any(Error)
      );
    });
  });

  describe('Integration with Mock Data Fallback', () => {
    it('provides fallback when YouTube API fails', async () => {
      const failingOperation = vi.fn().mockRejectedValue(new Error('YouTube API quota exceeded'));
      const mockDataFallback = vi.fn().mockResolvedValue(['mock', 'samples']);

      const result = await discoveryErrorService.withRetry(failingOperation, {
        context: 'youtube-fallback',
        maxRetries: 1,
        baseDelay: 10,
        fallback: mockDataFallback
      });

      expect(result).toEqual(['mock', 'samples']);
      expect(mockDataFallback).toHaveBeenCalled();
    });

    it('gracefully degrades to mock data on network failures', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      const networkOperation = vi.fn().mockRejectedValue(new Error('Network unavailable'));
      const mockFallback = () => Promise.resolve({ samples: [], source: 'mock' });

      const result = await discoveryErrorService.withRetry(networkOperation, {
        context: 'network-fallback',
        maxRetries: 0, // Don't retry when offline
        fallback: mockFallback
      });

      expect(result.source).toBe('mock');
      expect(result.samples).toEqual([]);
    });
  });

  describe('Development vs Production Behavior', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('logs detailed information in development mode', () => {
      process.env.NODE_ENV = 'development';
      
      const testError = new Error('Development test');
      discoveryErrorService.logError('dev-test', testError);

      expect(console.group).toHaveBeenCalledWith('🔍 Discovery Error: dev-test');
      expect(console.error).toHaveBeenCalledWith('Error:', testError);
      expect(console.groupEnd).toHaveBeenCalled();
    });

    it('reduces logging in production mode', () => {
      process.env.NODE_ENV = 'production';
      
      const testError = new Error('Production test');
      discoveryErrorService.logError('prod-test', testError);

      expect(console.group).not.toHaveBeenCalled();
      expect(console.groupEnd).not.toHaveBeenCalled();
    });
  });
});