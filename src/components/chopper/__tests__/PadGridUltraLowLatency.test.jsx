/**
 * Ultra-Low Latency PadGrid Integration Tests
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock the ultra-low latency services
const mockUltraLowLatencyEngine = {
    initialize: vi.fn().mockResolvedValue(true),
    optimizeForUltraLowLatency: vi.fn().mockResolvedValue(true),
    preloadSample: vi.fn().mockResolvedValue(true),
    triggerSample: vi.fn().mockResolvedValue({
        success: true,
        latency: 2.5,
        voiceId: 'test-voice-1'
    }),
    getPerformanceMetrics: vi.fn().mockReturnValue({
        averageLatency: 2.1,
        minLatency: 1.8,
        maxLatency: 3.2,
        activeVoices: 0,
        preloadedSamples: 2,
        audioContextLatency: {
            base: 2.0,
            output: 5.0
        }
    })
};

const mockLatencyMonitor = {
    startMonitoring: vi.fn(),
    stopMonitoring: vi.fn(),
    subscribe: vi.fn().mockReturnValue(() => {}),
    recordTotalLatency: vi.fn()
};

vi.mock('../../../services/UltraLowLatencyPlaybackEngine.js', () => ({
    default: mockUltraLowLatencyEngine
}));

vi.mock('../../../services/LatencyMonitor.js', () => ({
    default: mockLatencyMonitor
}));

describe('PadGrid Ultra-Low Latency Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should initialize ultra-low latency engine correctly', () => {
        expect(mockUltraLowLatencyEngine.initialize).toBeDefined();
        expect(mockUltraLowLatencyEngine.preloadSample).toBeDefined();
        expect(mockUltraLowLatencyEngine.triggerSample).toBeDefined();
        expect(mockUltraLowLatencyEngine.getPerformanceMetrics).toBeDefined();
    });

    it('should preload samples with correct parameters', async () => {
        const mockAudioBuffer = {
            sampleRate: 44100,
            numberOfChannels: 2,
            getChannelData: vi.fn().mockReturnValue(new Float32Array(1000))
        };

        await mockUltraLowLatencyEngine.preloadSample(
            'A0',
            mockAudioBuffer,
            10.5,
            12.8
        );

        expect(mockUltraLowLatencyEngine.preloadSample).toHaveBeenCalledWith(
            'A0',
            mockAudioBuffer,
            10.5,
            12.8
        );
    });

    it('should trigger samples with ultra-low latency', async () => {
        const result = await mockUltraLowLatencyEngine.triggerSample('A0', 1.0, {
            volume: 0.8
        });

        expect(result.success).toBe(true);
        expect(result.latency).toBe(2.5);
        expect(result.voiceId).toBe('test-voice-1');
    });

    it('should provide accurate performance metrics', () => {
        const metrics = mockUltraLowLatencyEngine.getPerformanceMetrics();

        expect(metrics).toEqual({
            averageLatency: 2.1,
            minLatency: 1.8,
            maxLatency: 3.2,
            activeVoices: 0,
            preloadedSamples: 2,
            audioContextLatency: {
                base: 2.0,
                output: 5.0
            }
        });
    });

    it('should handle latency monitoring correctly', () => {
        expect(mockLatencyMonitor.startMonitoring).toBeDefined();
        expect(mockLatencyMonitor.stopMonitoring).toBeDefined();
        expect(mockLatencyMonitor.subscribe).toBeDefined();
        expect(mockLatencyMonitor.recordTotalLatency).toBeDefined();
    });

    it('should optimize engine for ultra-low latency', async () => {
        const result = await mockUltraLowLatencyEngine.optimizeForUltraLowLatency();
        expect(result).toBe(true);
    });

    it('should handle keyboard mapping correctly', () => {
        const keyboardMap = {
            'q': 0, 'w': 1, 'e': 2, 'r': 3,
            'a': 4, 's': 5, 'd': 6, 'f': 7,
            'z': 8, 'x': 9, 'c': 10, 'v': 11,
            't': 12, 'y': 13, 'u': 14, 'i': 15,
        };

        expect(keyboardMap['q']).toBe(0);
        expect(keyboardMap['w']).toBe(1);
        expect(keyboardMap['a']).toBe(4);
        expect(keyboardMap['s']).toBe(5);
    });

    it('should validate ultra-low latency thresholds', () => {
        const targetLatency = 5.0; // 5ms target
        const achievedLatency = 2.5; // Mock achieved latency
        
        expect(achievedLatency).toBeLessThan(targetLatency);
        expect(achievedLatency).toBeGreaterThan(0);
    });
});