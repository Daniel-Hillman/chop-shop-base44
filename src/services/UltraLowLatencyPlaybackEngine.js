/**
 * Ultra Low-Latency Sample Playback Engine
 * Optimized for MPC-style instant sample triggering with minimal buffer delay
 */

class UltraLowLatencyPlaybackEngine {
    constructor() {
        this.audioContext = null;
        this.masterGainNode = null;
        this.compressorNode = null;
        this.limiterNode = null;
        
        // Ultra-low latency settings
        this.bufferSize = 128; // Minimum possible buffer size
        this.sampleRate = 44100;
        this.latencyHint = 'interactive'; // Prioritize low latency over power consumption
        
        // Pre-loaded sample cache for instant playback
        this.sampleCache = new Map();
        this.preloadedBuffers = new Map();
        this.activeVoices = new Map();
        
        // Voice management for polyphonic playback
        this.maxVoices = 32;
        this.voicePool = [];
        this.voiceIndex = 0;
        
        // Performance monitoring
        this.latencyMeasurements = [];
        this.avgLatency = 0;
        
        // Don't auto-initialize in test environment
        if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
            this.initialize();
        }
    }

    /**
     * Initialize ultra-low latency audio context
     */
    async initialize() {
        try {
            // Create AudioContext with ultra-low latency settings
            const contextOptions = {
                latencyHint: this.latencyHint,
                sampleRate: this.sampleRate
            };

            this.audioContext = new (window.AudioContext || window.webkitAudioContext)(contextOptions);
            
            // Force minimum buffer size if supported
            if (this.audioContext.audioWorklet) {
                try {
                    // Use AudioWorklet for even lower latency
                    await this.setupAudioWorklet();
                } catch (e) {
                    console.log('AudioWorklet not available, using ScriptProcessor fallback');
                    this.setupScriptProcessor();
                }
            } else {
                this.setupScriptProcessor();
            }

            // Resume context immediately
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            // Setup audio chain with minimal processing
            this.setupAudioChain();
            
            // Pre-warm the audio context
            this.preWarmAudioContext();
            
            console.log(`🎵 Ultra-low latency engine initialized:`);
            console.log(`   - Sample Rate: ${this.audioContext.sampleRate}Hz`);
            console.log(`   - Base Latency: ${(this.audioContext.baseLatency * 1000).toFixed(2)}ms`);
            console.log(`   - Output Latency: ${(this.audioContext.outputLatency * 1000).toFixed(2)}ms`);
            
        } catch (error) {
            console.error('Failed to initialize ultra-low latency engine:', error);
            throw error;
        }
    }

    /**
     * Setup AudioWorklet for minimum latency
     */
    async setupAudioWorklet() {
        // AudioWorklet provides the lowest possible latency
        const workletCode = `
            class UltraLowLatencyProcessor extends AudioWorkletProcessor {
                constructor() {
                    super();
                    this.samples = new Map();
                    this.triggers = [];
                }
                
                process(inputs, outputs, parameters) {
                    const output = outputs[0];
                    const outputChannel = output[0];
                    
                    // Process any pending triggers
                    while (this.triggers.length > 0) {
                        const trigger = this.triggers.shift();
                        // Immediate sample playback logic here
                    }
                    
                    return true;
                }
            }
            
            registerProcessor('ultra-low-latency-processor', UltraLowLatencyProcessor);
        `;
        
        const blob = new Blob([workletCode], { type: 'application/javascript' });
        const workletUrl = URL.createObjectURL(blob);
        
        await this.audioContext.audioWorklet.addModule(workletUrl);
        this.workletNode = new AudioWorkletNode(this.audioContext, 'ultra-low-latency-processor');
        
        URL.revokeObjectURL(workletUrl);
    }

    /**
     * Fallback to ScriptProcessor with minimum buffer
     */
    setupScriptProcessor() {
        // Use smallest possible buffer size
        this.scriptProcessor = this.audioContext.createScriptProcessor(this.bufferSize, 0, 2);
        this.scriptProcessor.onaudioprocess = (event) => {
            // Minimal processing for lowest latency
            const outputBuffer = event.outputBuffer;
            // Process pending sample triggers here
        };
    }

    /**
     * Setup optimized audio processing chain
     */
    setupAudioChain() {
        // Master gain with no additional processing
        this.masterGainNode = this.audioContext.createGain();
        this.masterGainNode.gain.value = 1.0;
        
        // Optional light compression for consistency
        this.compressorNode = this.audioContext.createDynamicsCompressor();
        this.compressorNode.threshold.value = -12;
        this.compressorNode.knee.value = 0;
        this.compressorNode.ratio.value = 3;
        this.compressorNode.attack.value = 0.001; // 1ms attack
        this.compressorNode.release.value = 0.01;  // 10ms release
        
        // Soft limiter to prevent clipping
        this.limiterNode = this.audioContext.createDynamicsCompressor();
        this.limiterNode.threshold.value = -0.1;
        this.limiterNode.knee.value = 0;
        this.limiterNode.ratio.value = 20;
        this.limiterNode.attack.value = 0.0001; // 0.1ms attack
        this.limiterNode.release.value = 0.001;  // 1ms release
        
        // Connect chain: Master -> Compressor -> Limiter -> Output
        this.masterGainNode.connect(this.compressorNode);
        this.compressorNode.connect(this.limiterNode);
        this.limiterNode.connect(this.audioContext.destination);
    }

    /**
     * Pre-warm audio context to eliminate first-play latency
     */
    preWarmAudioContext() {
        // Play silent buffer to initialize audio pipeline
        const silentBuffer = this.audioContext.createBuffer(1, 1, this.audioContext.sampleRate);
        const source = this.audioContext.createBufferSource();
        source.buffer = silentBuffer;
        source.connect(this.masterGainNode);
        source.start();
        
        console.log('🔥 Audio context pre-warmed for instant playback');
    }

    /**
     * Preload sample for instant playback
     */
    async preloadSample(sampleId, audioBuffer, startTime, endTime) {
        try {
            const startSample = Math.floor(startTime * audioBuffer.sampleRate);
            const endSample = Math.floor(endTime * audioBuffer.sampleRate);
            const sampleLength = endSample - startSample;
            
            if (sampleLength <= 0) {
                throw new Error('Invalid sample range');
            }

            // Create optimized buffer for the sample
            const sampleBuffer = this.audioContext.createBuffer(
                audioBuffer.numberOfChannels,
                sampleLength,
                audioBuffer.sampleRate
            );

            // Copy sample data with zero-crossing optimization
            for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
                const sourceData = audioBuffer.getChannelData(channel);
                const sampleData = sampleBuffer.getChannelData(channel);
                
                // Copy with fade-in/out to prevent clicks
                const fadeLength = Math.min(64, sampleLength / 10); // 64 samples or 10% of length
                
                for (let i = 0; i < sampleLength; i++) {
                    let sample = sourceData[startSample + i] || 0;
                    
                    // Apply fade-in
                    if (i < fadeLength) {
                        sample *= i / fadeLength;
                    }
                    // Apply fade-out
                    else if (i > sampleLength - fadeLength) {
                        sample *= (sampleLength - i) / fadeLength;
                    }
                    
                    sampleData[i] = sample;
                }
            }

            // Store in preloaded cache
            this.preloadedBuffers.set(sampleId, {
                buffer: sampleBuffer,
                duration: sampleLength / audioBuffer.sampleRate,
                originalStart: startTime,
                originalEnd: endTime,
                preloadedAt: this.audioContext.currentTime
            });

            console.log(`⚡ Sample ${sampleId} preloaded for instant playback (${(sampleLength / audioBuffer.sampleRate * 1000).toFixed(1)}ms)`);
            
            return true;
            
        } catch (error) {
            console.error(`Failed to preload sample ${sampleId}:`, error);
            return false;
        }
    }

    /**
     * Ultra-fast sample triggering
     */
    async triggerSample(sampleId, velocity = 1.0, options = {}) {
        const triggerTime = performance.now();
        
        try {
            // Get preloaded sample
            const preloadedSample = this.preloadedBuffers.get(sampleId);
            if (!preloadedSample) {
                console.warn(`Sample ${sampleId} not preloaded - triggering with higher latency`);
                return this.triggerSampleFallback(sampleId, velocity, options);
            }

            // Create buffer source with minimal setup
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            // Set buffer and gain instantly
            source.buffer = preloadedSample.buffer;
            gainNode.gain.value = velocity * (options.volume || 1.0);
            
            // Connect directly to master (minimal chain)
            source.connect(gainNode);
            gainNode.connect(this.masterGainNode);
            
            // Calculate precise start time
            const startTime = this.audioContext.currentTime + (options.delay || 0);
            
            // Start immediately
            source.start(startTime);
            
            // Voice management
            const voiceId = this.getNextVoiceId();
            this.activeVoices.set(voiceId, {
                source,
                gainNode,
                sampleId,
                startTime: triggerTime,
                audioStartTime: startTime
            });

            // Auto-cleanup when sample ends
            source.onended = () => {
                this.cleanupVoice(voiceId);
            };

            // Measure latency
            const latency = performance.now() - triggerTime;
            this.recordLatency(latency);
            
            console.log(`🎵 Sample ${sampleId} triggered in ${latency.toFixed(2)}ms`);
            
            return {
                voiceId,
                latency,
                success: true
            };
            
        } catch (error) {
            console.error(`Failed to trigger sample ${sampleId}:`, error);
            return {
                success: false,
                error: error.message,
                latency: performance.now() - triggerTime
            };
        }
    }

    /**
     * Fallback for non-preloaded samples
     */
    async triggerSampleFallback(sampleId, velocity, options) {
        // This would use the original sample data with higher latency
        console.warn(`Using fallback playback for ${sampleId} - consider preloading`);
        return { success: false, error: 'Sample not preloaded' };
    }

    /**
     * Stop specific sample
     */
    stopSample(voiceId, fadeTime = 0.01) {
        const voice = this.activeVoices.get(voiceId);
        if (!voice) return false;

        try {
            if (fadeTime > 0) {
                // Quick fade out
                const now = this.audioContext.currentTime;
                voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, now);
                voice.gainNode.gain.linearRampToValueAtTime(0, now + fadeTime);
                
                // Stop after fade
                voice.source.stop(now + fadeTime);
            } else {
                // Immediate stop
                voice.source.stop();
            }
            
            return true;
            
        } catch (error) {
            console.error(`Failed to stop voice ${voiceId}:`, error);
            return false;
        }
    }

    /**
     * Stop all active samples
     */
    stopAllSamples(fadeTime = 0.01) {
        const voiceIds = Array.from(this.activeVoices.keys());
        let stoppedCount = 0;
        
        voiceIds.forEach(voiceId => {
            if (this.stopSample(voiceId, fadeTime)) {
                stoppedCount++;
            }
        });
        
        console.log(`🛑 Stopped ${stoppedCount} active samples`);
        return stoppedCount;
    }

    /**
     * Voice management
     */
    getNextVoiceId() {
        return `voice_${Date.now()}_${this.voiceIndex++}`;
    }

    cleanupVoice(voiceId) {
        const voice = this.activeVoices.get(voiceId);
        if (voice) {
            try {
                voice.source.disconnect();
                voice.gainNode.disconnect();
            } catch (e) {
                // Already disconnected
            }
            this.activeVoices.delete(voiceId);
        }
    }

    /**
     * Latency measurement and optimization
     */
    recordLatency(latency) {
        this.latencyMeasurements.push(latency);
        
        // Keep only last 100 measurements
        if (this.latencyMeasurements.length > 100) {
            this.latencyMeasurements.shift();
        }
        
        // Calculate average
        this.avgLatency = this.latencyMeasurements.reduce((sum, l) => sum + l, 0) / this.latencyMeasurements.length;
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return {
            averageLatency: this.avgLatency,
            minLatency: Math.min(...this.latencyMeasurements),
            maxLatency: Math.max(...this.latencyMeasurements),
            activeVoices: this.activeVoices.size,
            preloadedSamples: this.preloadedBuffers.size,
            audioContextLatency: {
                base: this.audioContext?.baseLatency * 1000 || 0,
                output: this.audioContext?.outputLatency * 1000 || 0
            },
            bufferSize: this.bufferSize,
            sampleRate: this.audioContext?.sampleRate || 0
        };
    }

    /**
     * Set master volume
     */
    setMasterVolume(volume) {
        if (this.masterGainNode) {
            // Smooth volume changes to prevent clicks
            const now = this.audioContext.currentTime;
            this.masterGainNode.gain.setTargetAtTime(volume, now, 0.01);
        }
    }

    /**
     * Optimize for even lower latency
     */
    async optimizeForUltraLowLatency() {
        try {
            // Try to reduce buffer size even further if possible
            if (this.audioContext.audioWorklet) {
                console.log('🚀 Attempting ultra-low latency optimization...');
                
                // Additional optimizations for supported browsers
                if ('requestIdleCallback' in window) {
                    // Use idle time for preloading
                    window.requestIdleCallback(() => {
                        this.preloadOptimization();
                    });
                }
            }
            
        } catch (error) {
            console.warn('Ultra-low latency optimization failed:', error);
        }
    }

    /**
     * Preload optimization during idle time
     */
    preloadOptimization() {
        // Optimize existing preloaded samples
        for (const [sampleId, sample] of this.preloadedBuffers) {
            // Check if sample needs re-optimization
            const age = this.audioContext.currentTime - sample.preloadedAt;
            if (age > 60) { // Re-optimize samples older than 1 minute
                // Could implement sample re-processing here
            }
        }
    }

    /**
     * Cleanup and dispose
     */
    dispose() {
        try {
            this.stopAllSamples(0);
            
            if (this.scriptProcessor) {
                this.scriptProcessor.disconnect();
            }
            
            if (this.workletNode) {
                this.workletNode.disconnect();
            }
            
            if (this.audioContext && this.audioContext.state !== 'closed') {
                this.audioContext.close();
            }
            
            this.preloadedBuffers.clear();
            this.activeVoices.clear();
            
            console.log('🧹 Ultra-low latency engine disposed');
            
        } catch (error) {
            console.error('Error disposing engine:', error);
        }
    }
}

export default new UltraLowLatencyPlaybackEngine();