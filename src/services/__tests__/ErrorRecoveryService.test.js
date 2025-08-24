import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import errorRecoveryService from '../ErrorRecoveryService.js';

describe('ErrorRecoveryService', () => {
  beforeEach(() => {
    errorRecoveryService.reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    errorRecoveryService.cleanup();
  });

  describe('classifyError', () => {
    it('classifies network errors as transient', () => {
      const networkError = new Error('Network connection failed');
      const classification = errorRecoveryService.classifyError(networkError);
      
      expect(classification.type).toBe('transient');
      expect(classification.category).toBe('network');
      expect(classification.retryable).toBe(true);
      expect(classification.severity).toBe('warning');
    });

    it('classifies permanent errors correctly', () => {
      const notFoundError = new Error('Video not found');
      const classification = errorRecoveryService.classifyError(notFoundError);
      
      expect(classification.type).toBe('permanent');
      expect(classification.retryable).toBe(false);
      expect(classification.userActionRequired).toBe(true);
    });

    it('classifies audio errors correctly', () => {
      const audioError = new Error('Audio decode failed');
      const classification = errorRecoveryService.classifyError(audioError);
      
      expect(classification.category).toBe('audio');
    });

    it('classifies timeout errors correctly', () => {
      const timeoutError = new Error('Request timeout exceeded');
      const classification = errorRecoveryService.classifyError(timeoutError);
      
      expect(classification.category).toBe('timeout');
      expect(classification.retryable).toBe(true);
    });

    it('treats unknown errors as potentially retryable', () => {
      const unknownError = new Error('Something went wrong');
      const classification = errorRecoveryService.classifyError(unknownError);
      
      expect(classification.type).toBe('unknown');
      expect(classification.retryable).toBe(true);
    });
  });

  describe('shouldRetry', () => {
    it('returns true for retryable errors within retry limit', () => {
      const networkError = new Error('Network connection failed');
      const shouldRetry = errorRecoveryService.shouldRetry(networkError, 'test-op');
      
      expect(shouldRetry).toBe(true);
    });

    it('returns false for permanent errors', () => {
      const permanentError = new Error('Video not found');
      const shouldRetry = errorRecoveryService.shouldRetry(permanentError, 'test-op');
      
      expect(shouldRetry).toBe(false);
    });

    it('returns false when retry limit is exceeded', () => {
      const networkError = new Error('Network connection failed');
      const operationId = 'test-op-limit';
      
      // Simulate multiple retry attempts
      for (let i = 0; i < 4; i++) {
        errorRecoveryService.shouldRetry(networkError, operationId);
      }
      
      const shouldRetry = errorRecoveryService.shouldRetry(networkError, operationId);
      expect(shouldRetry).toBe(false);
    });
  });

  describe('calculateRetryDelay', () => {
    it('calculates exponential backoff delay', () => {
      const delay1 = errorRecoveryService.calculateRetryDelay(0);
      const delay2 = errorRecoveryService.calculateRetryDelay(1);
      const delay3 = errorRecoveryService.calculateRetryDelay(2);
      
      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay2).toBeGreaterThanOrEqual(2000);
      expect(delay3).toBeGreaterThanOrEqual(4000);
      
      // Should not exceed max delay
      const maxDelay = errorRecoveryService.calculateRetryDelay(10);
      expect(maxDelay).toBeLessThanOrEqual(10000 * 1.3); // Including jitter
    });

    it('includes jitter in delay calculation', () => {
      const delays = [];
      for (let i = 0; i < 10; i++) {
        delays.push(errorRecoveryService.calculateRetryDelay(1));
      }
      
      // Delays should vary due to jitter
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
  });

  describe('executeWithRetry', () => {
    it('executes operation successfully on first attempt', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');
      const mockOnProgress = vi.fn();
      
      const result = await errorRecoveryService.executeWithRetry(
        mockOperation,
        'test-op',
        { onProgress: mockOnProgress }
      );
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(mockOnProgress).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'starting' })
      );
    });

    it('retries on transient errors', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValue('success');
      
      const result = await errorRecoveryService.executeWithRetry(
        mockOperation,
        'test-op-retry'
      );
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('fails after max retries', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Network timeout'));
      
      await expect(
        errorRecoveryService.executeWithRetry(mockOperation, 'test-op-fail', { maxRetries: 2 })
      ).rejects.toThrow();
      
      expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('does not retry permanent errors', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Video not found'));
      
      await expect(
        errorRecoveryService.executeWithRetry(mockOperation, 'test-op-permanent')
      ).rejects.toThrow();
      
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('calls progress callback during retries', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValue('success');
      const mockOnProgress = vi.fn();
      
      await errorRecoveryService.executeWithRetry(
        mockOperation,
        'test-op-progress',
        { onProgress: mockOnProgress }
      );
      
      expect(mockOnProgress).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'starting' })
      );
      expect(mockOnProgress).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'retrying' })
      );
    });

    it('calls retry callback on retry attempts', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValue('success');
      const mockOnRetry = vi.fn();
      
      await errorRecoveryService.executeWithRetry(
        mockOperation,
        'test-op-retry-callback',
        { onRetry: mockOnRetry }
      );
      
      expect(mockOnRetry).toHaveBeenCalledWith(
        expect.objectContaining({
          attempt: 2,
          error: expect.any(Error),
          delay: expect.any(Number)
        })
      );
    });
  });

  describe('getUserFriendlyError', () => {
    it('provides user-friendly messages for network errors', () => {
      const networkError = new Error('Network connection failed');
      networkError.classification = errorRecoveryService.classifyError(networkError);
      
      const friendlyError = errorRecoveryService.getUserFriendlyError(networkError);
      
      expect(friendlyError.title).toBe('Connection Problem');
      expect(friendlyError.message).toContain('internet connection');
      expect(friendlyError.suggestions).toContain('Check your internet connection');
    });

    it('provides user-friendly messages for audio errors', () => {
      const audioError = new Error('Audio decode failed');
      audioError.classification = errorRecoveryService.classifyError(audioError);
      
      const friendlyError = errorRecoveryService.getUserFriendlyError(audioError);
      
      expect(friendlyError.title).toBe('Audio Processing Error');
      expect(friendlyError.suggestions).toContain('Try a different YouTube video');
    });

    it('includes technical details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const error = new Error('Test error message');
      error.classification = errorRecoveryService.classifyError(error);
      
      const friendlyError = errorRecoveryService.getUserFriendlyError(error);
      
      expect(friendlyError.technical).toBe('Test error message');
      
      process.env.NODE_ENV = originalEnv;
    });

    it('hides technical details in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const error = new Error('Test error message');
      error.classification = errorRecoveryService.classifyError(error);
      
      const friendlyError = errorRecoveryService.getUserFriendlyError(error);
      
      expect(friendlyError.technical).toBeNull();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('getErrorStats', () => {
    it('tracks error statistics', () => {
      const error1 = new Error('Network error');
      const error2 = new Error('Audio decode failed');
      
      // Simulate some errors
      errorRecoveryService.classifyError(error1);
      errorRecoveryService.classifyError(error2);
      
      const stats = errorRecoveryService.getErrorStats();
      
      expect(stats).toHaveProperty('totalErrors');
      expect(stats).toHaveProperty('recentErrors');
      expect(stats).toHaveProperty('activeRetries');
      expect(stats).toHaveProperty('errorsByCategory');
      expect(stats).toHaveProperty('errorsByType');
    });
  });

  describe('reset and cleanup', () => {
    it('resets error history and retry attempts', () => {
      // Add some errors
      const error = new Error('Test error');
      errorRecoveryService.classifyError(error);
      
      errorRecoveryService.reset();
      
      const stats = errorRecoveryService.getErrorStats();
      expect(stats.totalErrors).toBe(0);
      expect(stats.activeRetries).toBe(0);
    });

    it('cleans up resources', () => {
      errorRecoveryService.cleanup();
      
      const stats = errorRecoveryService.getErrorStats();
      expect(stats.totalErrors).toBe(0);
    });
  });
});