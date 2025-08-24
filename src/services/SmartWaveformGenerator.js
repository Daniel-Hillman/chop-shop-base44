/**
 * Smart Waveform Generator - Creates visual waveforms for YouTube videos
 * Uses multiple fallback strategies when full audio analysis isn't available
 */

class SmartWaveformGenerator {
    constructor() {
        this.cache = new Map();
        this.isGenerating = false;
    }

    /**
     * Generate a waveform using the best available method
     * @param {string} videoId - YouTube video ID
     * @param {number} duration - Video duration in seconds
     * @param {Object} options - Generation options
     */
    async generateWaveform(videoId, duration, options = {}) {
        const cacheKey = `${videoId}_${duration}`;
        
        // Return cached if available
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        if (this.isGenerating) {
            // Wait for current generation to complete
            await this.waitForGeneration();
            return this.cache.get(cacheKey) || this.generateFallbackWaveform(duration);
        }

        this.isGenerating = true;

        try {
            // Method 1: Try to extract audio from video element (if available)
            const audioWaveform = await this.tryAudioExtraction(duration);
            if (audioWaveform) {
                this.cache.set(cacheKey, audioWaveform);
                return audioWaveform;
            }

            // Method 2: Generate procedural waveform based on video metadata
            const proceduralWaveform = await this.generateProceduralWaveform(videoId, duration);
            if (proceduralWaveform) {
                this.cache.set(cacheKey, proceduralWaveform);
                return proceduralWaveform;
            }

            // Method 3: Fallback to generic musical waveform
            const fallbackWaveform = this.generateFallbackWaveform(duration);
            this.cache.set(cacheKey, fallbackWaveform);
            return fallbackWaveform;

        } finally {
            this.isGenerating = false;
        }
    }

    /**
     * Try to extract audio data from video element using Web Audio API
     */
    async tryAudioExtraction(duration) {
        try {
            const video = document.querySelector('video');
            if (!video || video.muted) return null;

            console.log('🎵 Attempting real-time audio extraction...');

            // Create audio context for analysis
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Resume context if suspended (required by some browsers)
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            const source = audioContext.createMediaElementSource(video);
            const analyser = audioContext.createAnalyser();
            
            // Configure analyser for better frequency resolution
            analyser.fftSize = 4096;
            analyser.smoothingTimeConstant = 0.3;
            
            source.connect(analyser);
            analyser.connect(audioContext.destination);

            // Higher resolution sampling
            const samples = Math.min(2000, duration * 25); // 25 samples per second
            const waveformData = new Float32Array(samples);
            const frequencyData = new Uint8Array(analyser.frequencyBinCount);
            const timeData = new Uint8Array(analyser.fftSize);

            let sampleIndex = 0;
            const sampleInterval = (duration * 1000) / samples;
            const startTime = Date.now();

            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    console.log('⏰ Audio extraction timeout, using partial data');
                    resolve(waveformData.slice(0, sampleIndex));
                }, 30000); // 30 second timeout

                const sampleAudio = () => {
                    if (sampleIndex >= samples) {
                        clearTimeout(timeout);
                        console.log(`✅ Audio extraction complete: ${samples} samples in ${Date.now() - startTime}ms`);
                        resolve(waveformData);
                        return;
                    }

                    // Get both frequency and time domain data
                    analyser.getByteFrequencyData(frequencyData);
                    analyser.getByteTimeDomainData(timeData);
                    
                    // Combine frequency and time domain for better representation
                    let frequencySum = 0;
                    let timeSum = 0;
                    
                    // Focus on musical frequency range (80Hz - 8kHz)
                    const startBin = Math.floor((80 / (audioContext.sampleRate / 2)) * frequencyData.length);
                    const endBin = Math.floor((8000 / (audioContext.sampleRate / 2)) * frequencyData.length);
                    
                    for (let i = startBin; i < endBin; i++) {
                        frequencySum += frequencyData[i];
                    }
                    
                    for (let i = 0; i < timeData.length; i++) {
                        timeSum += Math.abs(timeData[i] - 128); // Center around 0
                    }
                    
                    const frequencyAvg = frequencySum / (endBin - startBin);
                    const timeAvg = timeSum / timeData.length;
                    
                    // Combine both measurements with weighting
                    const combinedAmplitude = (frequencyAvg * 0.7 + timeAvg * 0.3) / 255;
                    waveformData[sampleIndex] = (combinedAmplitude * 2) - 1; // Normalize to -1 to 1

                    sampleIndex++;
                    
                    // Use requestAnimationFrame for better performance
                    if (sampleIndex % 10 === 0) {
                        requestAnimationFrame(() => setTimeout(sampleAudio, sampleInterval));
                    } else {
                        setTimeout(sampleAudio, sampleInterval);
                    }
                };

                // Start sampling
                sampleAudio();
            });

        } catch (error) {
            console.log('Audio extraction failed:', error.message);
            
            // If CORS or other issues, try alternative approach
            return this.tryAlternativeAudioExtraction(duration);
        }
    }

    /**
     * Alternative audio extraction method using MediaRecorder
     */
    async tryAlternativeAudioExtraction(duration) {
        try {
            console.log('🎵 Trying alternative audio extraction...');
            
            const video = document.querySelector('video');
            if (!video) return null;

            // Create a canvas to capture video frames and analyze visual patterns
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 256;
            canvas.height = 144;

            const samples = Math.min(1000, duration * 20);
            const waveformData = new Float32Array(samples);
            const sampleInterval = (duration * 1000) / samples;

            return new Promise((resolve) => {
                let sampleIndex = 0;
                const startTime = Date.now();

                const analyzeFrame = () => {
                    if (sampleIndex >= samples) {
                        console.log(`✅ Visual analysis complete: ${samples} samples`);
                        resolve(waveformData);
                        return;
                    }

                    try {
                        // Draw current video frame
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const pixels = imageData.data;

                        // Analyze visual complexity as proxy for audio activity
                        let complexity = 0;
                        let brightness = 0;
                        
                        for (let i = 0; i < pixels.length; i += 4) {
                            const r = pixels[i];
                            const g = pixels[i + 1];
                            const b = pixels[i + 2];
                            
                            brightness += (r + g + b) / 3;
                            
                            // Calculate local variance (complexity)
                            if (i > 4) {
                                const prevR = pixels[i - 4];
                                const prevG = pixels[i - 3];
                                const prevB = pixels[i - 2];
                                complexity += Math.abs(r - prevR) + Math.abs(g - prevG) + Math.abs(b - prevB);
                            }
                        }

                        brightness /= (pixels.length / 4);
                        complexity /= (pixels.length / 4);

                        // Convert to waveform amplitude
                        const amplitude = Math.min(1, (complexity / 100) * (brightness / 255));
                        waveformData[sampleIndex] = (amplitude * 2) - 1;

                    } catch (e) {
                        // Fallback to time-based pattern
                        const time = (sampleIndex / samples) * duration;
                        waveformData[sampleIndex] = 0.3 * Math.sin(time * 0.5) + 0.1 * Math.sin(time * 2.1);
                    }

                    sampleIndex++;
                    setTimeout(analyzeFrame, sampleInterval);
                };

                analyzeFrame();
            });

        } catch (error) {
            console.log('Alternative audio extraction failed:', error.message);
            return null;
        }
    }

    /**
     * Generate procedural waveform based on video characteristics
     */
    async generateProceduralWaveform(videoId, duration) {
        try {
            // Create a musically-inspired waveform pattern
            const samples = Math.min(2000, duration * 20); // Higher resolution
            const waveformData = new Float32Array(samples);
            
            // Use video ID as seed for consistent generation
            const seed = this.hashCode(videoId);
            const random = this.seededRandom(seed);

            for (let i = 0; i < samples; i++) {
                const progress = i / samples;
                const time = progress * duration;

                // Create musical patterns
                let amplitude = 0;

                // Base rhythm pattern (simulates drums/bass)
                const beatFreq = 2; // 2 beats per second
                const beatPhase = (time * beatFreq) % 1;
                if (beatPhase < 0.1) {
                    amplitude += 0.8 * Math.exp(-beatPhase * 20);
                }

                // Melodic content (simulates higher frequencies)
                amplitude += 0.3 * Math.sin(time * 0.5 + random() * Math.PI);
                amplitude += 0.2 * Math.sin(time * 1.2 + random() * Math.PI);
                amplitude += 0.1 * Math.sin(time * 2.8 + random() * Math.PI);

                // Add some randomness for texture
                amplitude += (random() - 0.5) * 0.1;

                // Dynamic envelope (music tends to build and release)
                const envelope = this.createMusicalEnvelope(progress, duration);
                amplitude *= envelope;

                // Clamp to valid range
                waveformData[i] = Math.max(-1, Math.min(1, amplitude));
            }

            console.log(`Generated procedural waveform for ${videoId}: ${samples} samples`);
            return waveformData;

        } catch (error) {
            console.log('Procedural waveform generation failed:', error.message);
            return null;
        }
    }

    /**
     * Generate fallback waveform with generic musical characteristics
     */
    generateFallbackWaveform(duration) {
        const samples = Math.min(1000, duration * 10);
        const waveformData = new Float32Array(samples);

        for (let i = 0; i < samples; i++) {
            const progress = i / samples;
            const time = progress * duration;

            // Simple musical pattern
            let amplitude = 0.4 * Math.sin(time * 0.8);
            amplitude += 0.2 * Math.sin(time * 2.1);
            amplitude += 0.1 * Math.sin(time * 4.3);
            
            // Add some variation
            amplitude *= (0.8 + 0.4 * Math.sin(time * 0.1));
            
            waveformData[i] = amplitude;
        }

        console.log(`Generated fallback waveform: ${samples} samples`);
        return waveformData;
    }

    /**
     * Create musical envelope (intro, build, climax, outro)
     */
    createMusicalEnvelope(progress, duration) {
        // Typical song structure envelope
        if (progress < 0.1) {
            // Intro - gradual build
            return progress * 10 * 0.6;
        } else if (progress < 0.3) {
            // Verse - moderate level
            return 0.6 + (progress - 0.1) * 0.5;
        } else if (progress < 0.7) {
            // Chorus/main section - higher energy
            return 0.8 + 0.2 * Math.sin((progress - 0.3) * Math.PI * 2);
        } else if (progress < 0.9) {
            // Bridge/breakdown - varies
            return 0.7 + 0.3 * Math.sin((progress - 0.7) * Math.PI * 5);
        } else {
            // Outro - fade
            return 0.8 * (1 - (progress - 0.9) * 10);
        }
    }

    /**
     * Hash function for consistent randomness
     */
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Seeded random number generator
     */
    seededRandom(seed) {
        let currentSeed = seed;
        return function() {
            currentSeed = (currentSeed * 9301 + 49297) % 233280;
            return currentSeed / 233280;
        };
    }

    /**
     * Wait for current generation to complete
     */
    async waitForGeneration() {
        while (this.isGenerating) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }
}

export default new SmartWaveformGenerator();