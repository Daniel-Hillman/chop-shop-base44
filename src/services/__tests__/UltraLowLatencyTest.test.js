/**
 * Ultra Low-Latency System Tests
 * Comprehensive testing of latency optimization features
 */

import ultraLowLatencyEngine from '../UltraLowLatencyPlaybackEngine.js';
import latencyMonitor from '../LatencyMonitor.js';

describe('Ultra Low-Latency System', () => {
    let mockAudioContext;
    let mockAudioBuffer;

    beforeEach(() => {
        // Mock AudioContext
        mockAudioContext = {
            createBuffer: vi.fn(() => ({
                numberOfChannels: 2,
                sampleRate: 44100,
                getChannelData: vi.fn(() => new Float32Array(1024))
            })),
            createBufferSource: vi.fn(() => ({
                buffer: null,
                connect: vi.fn(),
                start: vi.fn(),
                stop: vi.fn(),
                onended: null
            })),
            createGain: vi.fn(() => ({
                gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn() },
                connect: vi.fn()
            })),
            createDynamicsCompressor: vi.fn(() => ({
                threshold: { value: -12 },
                knee: { value: 0 },
                ratio: { value: 3 },
                attack: { value: 0.001 },
                release: { value: 0.01 },
                connect: vi.fn()
            })),
            createScriptProcessor: vi.fn(() => ({
                onaudioprocess: null,
                connect: vi.fn(),
                disconnect: vi.fn()
            })),
            destination: {},
            currentTime: 0,
            sampleRate: 44100,
            baseLatency: 0.002,
            outputLatency: 0.005,
            state: 'suspended',
            resume: vi.fn(),
            close: vi.fn(),
            audioWorklet: {
                addModule: vi.fn()
            }
        };

        // Mock AudioBuffer
        mockAudioBuffer = {
            numberOfChannels: 2,
            sampleRate: 44100,
            length: 44100,
            getChannelData: vi.fn(() => {
                const data = new Float32Array(44100);
                // Fill with test sine wave
                for (let i = 0; i < data.length; i++) {
                    data[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 0.5;
                }
                return data;
            })
        };

        // Mock global AudioContext
        global.AudioContext = vi.fn(() => mockAudioContext);
        global.webkitAudioContext = vi.fn(() => mockAudioContext);
        
        // Mock performance.now
        global.performance = {
            now: vi.fn(() => Date.now())
        };

        // Clear any existing state
        latencyMonitor.clearMeasurements();
    });

    afterEach(() => {
        vi.clearAllMocks();
        latencyMonitor.stopMonitoring();
    });

    describe('UltraLowLatencyPlaybackEngine', () => {
        test('should initialize with ultra-low latency settings', async () => {
            await ultraLowLatencyEngine.initialize();
            
            expect(global.AudioContext).toHaveBeenCalledWith({
                latencyHint: 'interactive',
                sampleRate: 44100
            });
            
            expect(mockAudioContext.resume).toHaveBeenCalled();
        });

        test('should preload samples for instant playback', async () => {
            await ultraLowLatencyEngine.initialize();
            
            const sampleId = 'A1';
            const startTime = 0.5;
            const endTime = 1.5;
            
            const success = await ultraLowLatencyEngine.preloadSample(
                sampleId,
                mockAudioBuffer,
                startTime,
                endTime
            );
            
            expect(success).toBe(true);
            expect(mockAudioContext.createBuffer).toHaveBeenCalledWith(
                2, // channels
                44100, // sample length (1 second at 44.1kHz)
                44100 // sample rate
            );
        });

        test('should trigger preloaded samples with minimal latency', async () => {
            await ultraLowLatencyEngine.initialize();
            
            // Preload sample first
            const sampleId = 'A1';
            await ultraLowLatencyEngine.preloadSample(
                sampleId,
                mockAudioBuffer,
                0.5,
                1.5
            );
            
            const startTime = performance.now();
            const result = await ultraLowLatencyEngine.triggerSample(sampleId, 1.0);
            const endTime = performance.now();
            
            expect(result.success).toBe(true);
            expect(result.latency).toBeLessThan(10); // Should be under 10ms
            expect(endTime - startTime).toBeLessThan(20); // Total time under 20ms
            
            expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
            expect(mockAudioContext.createGain).toHaveBeenCalled();
        });

        test('should provide accurate performance metrics', async () => {
            await ultraLowLatencyEngine.initialize();
            
            const sampleId = 'A1';
            await ultraLowLatencyEngine.preloadSample(sampleId, mockAudioBuffer, 0, 1);
            
            // Trigger sample to generate metrics
            await ultraLowLatencyEngine.triggerSample(sampleId, 1.0);
            
            const metrics = ultraLowLatencyEngine.getPerformanceMetrics();
            
            expect(metrics).toHaveProperty('averageLatency');
            expect(metrics).toHaveProperty('activeVoices');
            expect(metrics).toHaveProperty('preloadedSamples');
            expect(metrics).toHaveProperty('audioContextLatency');
            expect(metrics).toHaveProperty('bufferSize');
            expect(metrics).toHaveProperty('sampleRate');
            
            expect(metrics.preloadedSamples).toBe(1);
            expect(metrics.bufferSize).toBe(128);
            expect(metrics.sampleRate).toBe(44100);
        });

        test('should handle fallback for non-preloaded samples', async () => {
            await ultraLowLatencyEngine.initialize();
            
            const result = await ultraLowLatencyEngine.triggerSample('NonExistent', 1.0);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Sample not preloaded');
        });
    });

    describe('LatencyMonitor', () => {
        test('should start and stop monitoring', () => {
            expect(latencyMonitor.isMonitoring).toBe(false);
            
            latencyMonitor.startMonitoring(100);
            expect(latencyMonitor.isMonitoring).toBe(true);
            
            latencyMonitor.stopMonitoring();
            expect(latencyMonitor.isMonitoring).toBe(false);
        });

        test('should record different types of latency measurements', () => {
            const keyPressLatency = latencyMonitor.recordKeyPressLatency(100, 105);
            const audioLatency = latencyMonitor.recordAudioTriggerLatency(200, 203);
            const totalLatency = latencyMonitor.recordTotalLatency(300, 310);
            
            expect(keyPressLatency).toBe(5);
            expect(audioLatency).toBe(3);
            expect(totalLatency).toBe(10);
            
            const analysis = latencyMonitor.getLatencyAnalysis();
            expect(analysis.keyPress.count).toBe(1);
            expect(analysis.audioTrigger.count).toBe(1);
            expect(analysis.totalLatency.count).toBe(1);
        });

        test('should provide performance ratings', () => {
            // Test excellent rating
            latencyMonitor.recordTotalLatency(100, 103); // 3ms
            let analysis = latencyMonitor.getLatencyAnalysis();
            expect(analysis.totalLatency.rating).toBe('excellent');
            
            // Test poor rating
            latencyMonitor.clearMeasurements();
            latencyMonitor.recordTotalLatency(100, 160); // 60ms
            analysis = latencyMonitor.getLatencyAnalysis();
            expect(analysis.totalLatency.rating).toBe('unacceptable');
        });

        test('should handle subscription callbacks', () => {
            const callback = vi.fn();
            const unsubscribe = latencyMonitor.subscribe(callback);
            
            latencyMonitor.recordTotalLatency(100, 105);
            latencyMonitor.notifyCallbacks();
            
            expect(callback).toHaveBeenCalled();
            
            unsubscribe();
            callback.mockClear();
            
            latencyMonitor.notifyCallbacks();
            expect(callback).not.toHaveBeenCalled();
        });

        test('should export performance data', () => {
            latencyMonitor.recordTotalLatency(100, 105);
            latencyMonitor.recordKeyPressLatency(200, 202);
            
            const exportData = latencyMonitor.exportData();
            
            expect(exportData).toHaveProperty('measurements');
            expect(exportData).toHaveProperty('analysis');
            expect(exportData).toHaveProperty('optimizations');
            expect(exportData).toHaveProperty('timestamp');
            
            expect(exportData.measurements.totalLatency.length).toBe(1);
            expect(exportData.measurements.keyPress.length).toBe(1);
        });
    });

    describe('Integration Tests', () => {
        test('should achieve target latency thresholds', async () => {
            // Initialize system
            await ultraLowLatencyEngine.initialize();
            latencyMonitor.startMonitoring(100);
            
            // Preload sample
            const sampleId = 'A1';
            await ultraLowLatencyEngine.preloadSample(sampleId, mockAudioBuffer, 0, 1);
            
            // Perform multiple triggers and measure latency
            const results = [];
            for (let i = 0; i < 10; i++) {
                const startTime = performance.now();
                const result = await ultraLowLatencyEngine.triggerSample(sampleId, 1.0);
                const endTime = performance.now();
                
                results.push({
                    success: result.success,
                    latency: result.latency,
                    totalTime: endTime - startTime
                });
                
                latencyMonitor.recordTotalLatency(startTime, endTime);
            }
            
            // Verify all triggers succeeded
            results.forEach(result => {
                expect(result.success).toBe(true);
            });
            
            // Check average latency
            const avgLatency = results.reduce((sum, r) => sum + r.latency, 0) / results.length;
            expect(avgLatency).toBeLessThan(10); // Target: under 10ms average
            
            latencyMonitor.stopMonitoring();
        });
    });
});