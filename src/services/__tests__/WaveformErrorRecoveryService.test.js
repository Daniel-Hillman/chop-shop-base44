import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WaveformErrorRecoveryService } from '../WaveformErrorRecoveryService';

describe('WaveformErrorRecoveryService', () => {
  let service;
  let mockCanvas;
  let mockAudioContext;

  beforeEach(() => {
    service = new WaveformErrorRecoveryService();
    
    // Mock canvas
    mockCanvas = {
      getContext: vi.fn().mockReturnValue({
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        canvas: { width: 100, height: 50 }
      }),
      width: 100,
      height: 50
    };
    
    // Mock audio context
    mockAudioContext = {
      state: 'running',
      close: vi.fn().mockResolvedValue(),
      resume: vi.fn().mockResolvedValue()
    };

    // Mock DOM methods
    global.document = {
      createElement: vi.fn().mockReturnValue(mockCanvas)
    };

    global.window = {
      AudioContext: vi.fn().mockImplementation(() => mockAudioContext),
      webkitAudioContext: vi.fn().mockImplementation(() => mockAudioContext),
      gc: vi.fn(),
      waveformCanvasContexts: [],
      waveformAudioContexts: [],
      waveformCache: { clear: vi.fn() },
      waveformBuffers: []
    };

    global.navigator = {
      onLine: true,
      deviceMemory: 4
    };

    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Error Classification', () => {
    it('classifies canvas errors correctly', () => {
      const canvasError = new Error('Canvas context lost');
      expect(service.classifyError(canvasError)).toBe('canvas');
    });

    it('classifies audio errors correctly', () => {
      const audioError = new Error('Web Audio API not supported');
      expect(service.classifyError(audioError)).toBe('audio');
    });

    it('classifies memory errors correctly', () => {
      const memoryError = new Error('Memory allocation failed');
      expect(service.classifyError(memoryError)).toBe('memory');
    });

    it('classifies network errors correctly', () => {
      const networkError = new Error('Network fetch failed');
      expect(service.classifyError(networkError)).toBe('network');
    });

    it('classifies unknown errors as generic', () => {
      const unknownError = new Error('Unknown error');
      expect(service.classifyError(unknownError)).toBe('generic');
    });

    it('handles null errors', () => {
      expect(service.classifyError(null)).toBe('generic');
    });
  });

  describe('Error Reporting', () => {
    it('reports errors with proper structure', () => {
      const error = new Error('Test error');
      const errorData = { error, component: 'TestComponent' };
      
      const record = service.reportError(errorData);
      
      expect(record).toHaveProperty('id');
      expect(record).toHaveProperty('reportedAt');
      expect(record).toHaveProperty('errorType');
      expect(record.error).toBe(error);
      expect(record.component).toBe('TestComponent');
    });

    it('maintains error history', () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');
      
      service.reportError({ error: error1 });
      service.reportError({ error: error2 });
      
      expect(service.errorHistory).toHaveLength(2);
    });

    it('limits error history size', () => {
      // Add more errors than the limit
      for (let i = 0; i < 60; i++) {
        service.reportError({ error: new Error(`Error ${i}`) });
      }
      
      expect(service.errorHistory.length).toBeLessThanOrEqual(50);
    });
  });

  describe('Canvas Recovery', () => {
    it('recovers from canvas context errors', async () => {
      const canvasError = new Error('Canvas context lost');
      
      await expect(service.recoverCanvasContext(canvasError)).resolves.not.toThrow();
      expect(mockCanvas.getContext).toHaveBeenCalled();
    });

    it('clears existing canvas contexts during recovery', async () => {
      const mockContext = { clearRect: vi.fn(), canvas: { width: 100, height: 50 } };
      global.window.waveformCanvasContexts = [mockContext];
      
      const canvasError = new Error('Canvas context lost');
      await service.recoverCanvasContext(canvasError);
      
      expect(mockContext.clearRect).toHaveBeenCalled();
      expect(global.window.waveformCanvasContexts).toHaveLength(0);
    });

    it('throws error if canvas recovery fails', async () => {
      mockCanvas.getContext.mockReturnValue(null);
      
      const canvasError = new Error('Canvas context lost');
      
      await expect(service.recoverCanvasContext(canvasError)).rejects.toThrow();
    });
  });

  describe('Audio Recovery', () => {
    it('recovers from audio context errors', async () => {
      const audioError = new Error('Audio context suspended');
      
      await expect(service.recoverAudioContext(audioError)).resolves.not.toThrow();
    });

    it('closes existing audio contexts during recovery', async () => {
      global.window.waveformAudioContexts = [mockAudioContext];
      
      const audioError = new Error('Audio context error');
      await service.recoverAudioContext(audioError);
      
      expect(mockAudioContext.close).toHaveBeenCalled();
      expect(global.window.waveformAudioContexts).toHaveLength(0);
    });

    it('resumes suspended audio context during test', async () => {
      mockAudioContext.state = 'suspended';
      
      const audioError = new Error('Audio context suspended');
      await service.recoverAudioContext(audioError);
      
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });
  });

  describe('Memory Recovery', () => {
    it('recovers from memory errors', async () => {
      const memoryError = new Error('Memory allocation failed');
      
      await expect(service.recoverMemoryIssues(memoryError)).resolves.not.toThrow();
      expect(global.window.waveformCache.clear).toHaveBeenCalled();
    });

    it('clears waveform buffers during memory recovery', async () => {
      const mockBuffer = { length: 1000, fill: vi.fn() };
      global.window.waveformBuffers = [mockBuffer];
      
      const memoryError = new Error('Out of memory');
      await service.recoverMemoryIssues(memoryError);
      
      expect(mockBuffer.fill).toHaveBeenCalledWith(0);
      expect(global.window.waveformBuffers).toHaveLength(0);
    });

    it('throws error for insufficient device memory', async () => {
      global.navigator.deviceMemory = 1; // Low memory device
      
      const memoryError = new Error('Memory allocation failed');
      
      await expect(service.recoverMemoryIssues(memoryError)).rejects.toThrow(/insufficient device memory/i);
    });
  });

  describe('Network Recovery', () => {
    it('recovers from network errors', async () => {
      const networkError = new Error('Network timeout');
      
      await expect(service.recoverNetworkIssues(networkError)).resolves.not.toThrow();
      expect(global.fetch).toHaveBeenCalled();
    });

    it('throws error when offline', async () => {
      global.navigator.onLine = false;
      
      const networkError = new Error('Network error');
      
      await expect(service.recoverNetworkIssues(networkError)).rejects.toThrow(/no network connection/i);
    });

    it('throws error when connectivity test fails', async () => {
      global.fetch.mockRejectedValue(new Error('Fetch failed'));
      
      const networkError = new Error('Network error');
      
      await expect(service.recoverNetworkIssues(networkError)).rejects.toThrow(/network recovery failed/i);
    });
  });

  describe('Generic Recovery', () => {
    it('performs generic recovery', async () => {
      const genericError = new Error('Unknown error');
      
      await expect(service.genericRecovery(genericError)).resolves.not.toThrow();
    });

    it('clears global waveform state', async () => {
      global.window.waveformState = { some: 'data' };
      
      const genericError = new Error('Generic error');
      await service.genericRecovery(genericError);
      
      expect(global.window.waveformState).toBeNull();
    });

    it('throws error when canvas is not supported', async () => {
      mockCanvas.getContext = undefined;
      
      const genericError = new Error('Generic error');
      
      await expect(service.genericRecovery(genericError)).rejects.toThrow(/canvas support not available/i);
    });
  });

  describe('System Health', () => {
    it('reports healthy system with no recent errors', () => {
      expect(service.isSystemHealthy()).toBe(true);
    });

    it('reports unhealthy system with many recent errors', () => {
      // Add many recent errors
      for (let i = 0; i < 6; i++) {
        service.reportError({ error: new Error(`Error ${i}`) });
      }
      
      expect(service.isSystemHealthy()).toBe(false);
    });

    it('reports unhealthy system with critical errors', () => {
      service.reportError({ error: new Error('Canvas context lost') });
      service.reportError({ error: new Error('Canvas rendering failed') });
      service.reportError({ error: new Error('Canvas initialization error') });
      
      expect(service.isSystemHealthy()).toBe(false);
    });
  });

  describe('Error Statistics', () => {
    it('provides error statistics', () => {
      service.reportError({ error: new Error('Canvas error') });
      service.reportError({ error: new Error('Audio error') });
      
      const stats = service.getErrorStatistics();
      
      expect(stats.totalErrors).toBe(2);
      expect(stats.errorsByType.canvas).toBe(1);
      expect(stats.errorsByType.audio).toBe(1);
      expect(stats.lastError).toBeDefined();
    });

    it('filters recent errors correctly', () => {
      // Add old error
      const oldError = service.reportError({ error: new Error('Old error') });
      oldError.reportedAt = Date.now() - 400000; // 6+ minutes ago
      
      // Add recent error
      service.reportError({ error: new Error('Recent error') });
      
      const stats = service.getErrorStatistics();
      
      expect(stats.totalErrors).toBe(2);
      expect(stats.recentErrors).toBe(1);
    });
  });

  describe('Recovery Attempt', () => {
    it('attempts recovery with appropriate strategy', async () => {
      const canvasError = new Error('Canvas context lost');
      
      const result = await service.attemptRecovery(canvasError);
      
      expect(result).toBe(true);
    });

    it('throws error when recovery fails', async () => {
      mockCanvas.getContext.mockReturnValue(null);
      const canvasError = new Error('Canvas context lost');
      
      await expect(service.attemptRecovery(canvasError)).rejects.toThrow();
    });

    it('uses generic strategy for unknown errors', async () => {
      const unknownError = new Error('Unknown error type');
      
      const result = await service.attemptRecovery(unknownError);
      
      expect(result).toBe(true);
    });
  });

  describe('Utility Methods', () => {
    it('generates unique error IDs', () => {
      const id1 = service.generateErrorId();
      const id2 = service.generateErrorId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^waveform_error_\d+_[a-z0-9]+$/);
    });

    it('provides delay utility', async () => {
      const start = Date.now();
      await service.delay(100);
      const end = Date.now();
      
      expect(end - start).toBeGreaterThanOrEqual(90);
    });

    it('clears error history', () => {
      service.reportError({ error: new Error('Test error') });
      expect(service.errorHistory).toHaveLength(1);
      
      service.clearErrorHistory();
      expect(service.errorHistory).toHaveLength(0);
    });
  });
});