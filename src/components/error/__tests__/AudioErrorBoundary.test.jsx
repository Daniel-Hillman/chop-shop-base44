import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AudioErrorBoundary from '../AudioErrorBoundary';

describe('AudioErrorBoundary', () => {
  let mockOnError;
  let mockOnRetry;
  let mockOnReset;

  beforeEach(() => {
    mockOnError = vi.fn();
    mockOnRetry = vi.fn();
    mockOnReset = vi.fn();
    
    // Mock console.error to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates AudioErrorBoundary component', () => {
    const boundary = new AudioErrorBoundary({
      onError: mockOnError,
      onRetry: mockOnRetry,
      onReset: mockOnReset
    });

    expect(boundary).toBeDefined();
    expect(boundary.state.hasError).toBe(false);
  });

  it('classifies network errors correctly', () => {
    const boundary = new AudioErrorBoundary({});
    const networkError = new Error('Network connection failed');
    
    const errorType = boundary.getErrorType(networkError);
    expect(errorType).toBe('network');
  });

  it('classifies audio errors correctly', () => {
    const boundary = new AudioErrorBoundary({});
    const audioError = new Error('Audio decode failed');
    
    const errorType = boundary.getErrorType(audioError);
    expect(errorType).toBe('audio');
  });

  it('classifies timeout errors correctly', () => {
    const boundary = new AudioErrorBoundary({});
    const timeoutError = new Error('Request timeout exceeded');
    
    const errorType = boundary.getErrorType(timeoutError);
    expect(errorType).toBe('timeout');
  });

  it('classifies quota errors correctly', () => {
    const boundary = new AudioErrorBoundary({});
    const quotaError = new Error('Rate limit exceeded');
    
    const errorType = boundary.getErrorType(quotaError);
    expect(errorType).toBe('quota');
  });

  it('classifies unavailable errors correctly', () => {
    const boundary = new AudioErrorBoundary({});
    const unavailableError = new Error('Video is private or unavailable');
    
    const errorType = boundary.getErrorType(unavailableError);
    expect(errorType).toBe('unavailable');
  });

  it('provides correct error details for network errors', () => {
    const boundary = new AudioErrorBoundary({});
    const networkError = new Error('Network connection failed');
    
    const errorDetails = boundary.getErrorDetails('network', networkError);
    expect(errorDetails.title).toBe('Network Connection Error');
    expect(errorDetails.canRetry).toBe(true);
    expect(errorDetails.severity).toBe('warning');
  });

  it('provides correct error details for audio errors', () => {
    const boundary = new AudioErrorBoundary({});
    const audioError = new Error('Audio decode failed');
    
    const errorDetails = boundary.getErrorDetails('audio', audioError);
    expect(errorDetails.title).toBe('Audio Processing Error');
    expect(errorDetails.canRetry).toBe(true);
    expect(errorDetails.severity).toBe('error');
  });

  it('provides correct error details for quota errors', () => {
    const boundary = new AudioErrorBoundary({});
    const quotaError = new Error('Rate limit exceeded');
    
    const errorDetails = boundary.getErrorDetails('quota', quotaError);
    expect(errorDetails.title).toBe('Service Limit Reached');
    expect(errorDetails.canRetry).toBe(false);
    expect(errorDetails.severity).toBe('warning');
  });

  it('handles retry state correctly', async () => {
    const boundary = new AudioErrorBoundary({
      onRetry: mockOnRetry
    });
    
    boundary.setState({ hasError: true, error: new Error('Test error') });
    
    mockOnRetry.mockResolvedValue();
    await boundary.handleRetry();
    
    expect(mockOnRetry).toHaveBeenCalled();
  });

  it('handles reset state correctly', () => {
    const boundary = new AudioErrorBoundary({
      onReset: mockOnReset
    });
    
    boundary.setState({ hasError: true, error: new Error('Test error') });
    boundary.handleReset();
    
    expect(boundary.state.hasError).toBe(false);
    expect(boundary.state.error).toBe(null);
    expect(mockOnReset).toHaveBeenCalled();
  });
});