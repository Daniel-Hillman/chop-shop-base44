/**
 * Latency Monitor
 * Real-time monitoring and optimization of audio latency
 */

class LatencyMonitor {
    constructor() {
        this.measurements = {
            keyPress: [],
            audioTrigger: [],
            bufferLatency: [],
            totalLatency: []
        };
        
        this.thresholds = {
            excellent: 5,   // < 5ms
            good: 10,       // < 10ms
            acceptable: 20, // < 20ms
            poor: 50        // < 50ms
        };
        
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.callbacks = new Set();
        
        // Performance optimization flags
        this.optimizations = {
            bufferSizeReduced: false,
            audioWorkletEnabled: false,
            preloadingActive: false,
            contextOptimized: false
        };
    }

    /**
     * Start latency monitoring
     */
    startMonitoring(intervalMs = 1000) {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        console.log('📊 Starting latency monitoring...');
        
        this.monitoringInterval = setInterval(() => {
            this.collectSystemMetrics();
            this.analyzePerformance();
            this.notifyCallbacks();
        }, intervalMs);
    }

    /**
     * Stop latency monitoring
     */
    stopMonitoring() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        console.log('📊 Latency monitoring stopped');
    }

    /**
     * Record key press latency
     */
    recordKeyPressLatency(startTime, endTime) {
        const latency = endTime - startTime;
        this.addMeasurement('keyPress', latency);
        return latency;
    }

    /**
     * Record audio trigger latency
     */
    recordAudioTriggerLatency(startTime, endTime) {
        const latency = endTime - startTime;
        this.addMeasurement('audioTrigger', latency);
        return latency;
    }

    /**
     * Record buffer latency
     */
    recordBufferLatency(latency) {
        this.addMeasurement('bufferLatency', latency);
        return latency;
    }

    /**
     * Record total end-to-end latency
     */
    recordTotalLatency(keyPressTime, audioOutputTime) {
        const latency = audioOutputTime - keyPressTime;
        this.addMeasurement('totalLatency', latency);
        return latency;
    }

    /**
     * Add measurement to specific category
     */
    addMeasurement(category, value) {
        if (!this.measurements[category]) {
            this.measurements[category] = [];
        }
        
        this.measurements[category].push({
            value,
            timestamp: performance.now()
        });
        
        // Keep only last 100 measurements per category
        if (this.measurements[category].length > 100) {
            this.measurements[category].shift();
        }
    }

    /**
     * Collect system-level metrics
     */
    collectSystemMetrics() {
        try {
            // Audio context metrics
            if (window.AudioContext || window.webkitAudioContext) {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                
                // Create temporary context to check capabilities
                const tempContext = new AudioContextClass({ latencyHint: 'interactive' });
                
                this.recordBufferLatency(tempContext.baseLatency * 1000);
                
                tempContext.close();
            }
            
            // Browser performance metrics
            if (performance.memory) {
                const memory = performance.memory;
                this.lastMemoryUsage = {
                    used: memory.usedJSHeapSize / 1024 / 1024, // MB
                    total: memory.totalJSHeapSize / 1024 / 1024, // MB
                    limit: memory.jsHeapSizeLimit / 1024 / 1024 // MB
                };
            }
            
        } catch (error) {
            console.warn('Failed to collect system metrics:', error);
        }
    }

    /**
     * Analyze performance and suggest optimizations
     */
    analyzePerformance() {
        const analysis = this.getLatencyAnalysis();
        
        // Check if performance is degrading
        if (analysis.totalLatency.average > this.thresholds.acceptable) {
            this.suggestOptimizations(analysis);
        }
        
        // Auto-optimize if possible
        this.autoOptimize(analysis);
    }

    /**
     * Suggest performance optimizations
     */
    suggestOptimizations(analysis) {
        const suggestions = [];
        
        if (analysis.bufferLatency.average > 10) {
            suggestions.push({
                type: 'buffer',
                message: 'Consider reducing audio buffer size',
                impact: 'high',
                action: () => this.optimizeBufferSize()
            });
        }
        
        if (analysis.keyPress.average > 5) {
            suggestions.push({
                type: 'input',
                message: 'Key input latency is high - check for blocking operations',
                impact: 'medium',
                action: () => this.optimizeInputHandling()
            });
        }
        
        if (this.lastMemoryUsage && this.lastMemoryUsage.used > this.lastMemoryUsage.limit * 0.8) {
            suggestions.push({
                type: 'memory',
                message: 'High memory usage detected - consider cleanup',
                impact: 'medium',
                action: () => this.optimizeMemoryUsage()
            });
        }
        
        if (suggestions.length > 0) {
            console.warn('🚨 Performance suggestions:', suggestions);
            this.notifyCallbacks({ type: 'suggestions', suggestions });
        }
    }

    /**
     * Auto-optimize performance
     */
    autoOptimize(analysis) {
        // Auto-enable preloading if latency is high
        if (!this.optimizations.preloadingActive && analysis.totalLatency.average > 15) {
            this.enablePreloading();
        }
        
        // Auto-optimize audio context if not done
        if (!this.optimizations.contextOptimized && analysis.bufferLatency.average > 8) {
            this.optimizeAudioContext();
        }
    }

    /**
     * Enable aggressive preloading
     */
    enablePreloading() {
        this.optimizations.preloadingActive = true;
        console.log('🚀 Auto-enabled aggressive sample preloading');
        
        // Notify system to preload more aggressively
        this.notifyCallbacks({ 
            type: 'optimization', 
            action: 'enablePreloading' 
        });
    }

    /**
     * Optimize audio context settings
     */
    optimizeAudioContext() {
        this.optimizations.contextOptimized = true;
        console.log('🚀 Auto-optimizing audio context for lower latency');
        
        this.notifyCallbacks({ 
            type: 'optimization', 
            action: 'optimizeAudioContext' 
        });
    }

    /**
     * Get comprehensive latency analysis
     */
    getLatencyAnalysis() {
        const analysis = {};
        
        for (const [category, measurements] of Object.entries(this.measurements)) {
            if (measurements.length === 0) {
                analysis[category] = {
                    average: 0,
                    min: 0,
                    max: 0,
                    count: 0,
                    rating: 'unknown'
                };
                continue;
            }
            
            const values = measurements.map(m => m.value);
            const average = values.reduce((sum, val) => sum + val, 0) / values.length;
            const min = Math.min(...values);
            const max = Math.max(...values);
            
            analysis[category] = {
                average: parseFloat(average.toFixed(2)),
                min: parseFloat(min.toFixed(2)),
                max: parseFloat(max.toFixed(2)),
                count: measurements.length,
                rating: this.getRating(average)
            };
        }
        
        return analysis;
    }

    /**
     * Get performance rating based on latency
     */
    getRating(latency) {
        if (latency < this.thresholds.excellent) return 'excellent';
        if (latency < this.thresholds.good) return 'good';
        if (latency < this.thresholds.acceptable) return 'acceptable';
        if (latency < this.thresholds.poor) return 'poor';
        return 'unacceptable';
    }

    /**
     * Get real-time performance status
     */
    getPerformanceStatus() {
        const analysis = this.getLatencyAnalysis();
        const overallLatency = analysis.totalLatency.average || 0;
        
        return {
            overall: {
                latency: overallLatency,
                rating: this.getRating(overallLatency),
                status: overallLatency < this.thresholds.good ? 'optimal' : 'needs-optimization'
            },
            breakdown: analysis,
            optimizations: this.optimizations,
            recommendations: this.getRecommendations(analysis)
        };
    }

    /**
     * Get performance recommendations
     */
    getRecommendations(analysis) {
        const recommendations = [];
        
        if (analysis.totalLatency.average > this.thresholds.acceptable) {
            recommendations.push('Consider using a dedicated audio interface');
            recommendations.push('Close other audio applications');
            recommendations.push('Reduce browser tab count');
        }
        
        if (analysis.bufferLatency.average > 10) {
            recommendations.push('Try using Chrome or Firefox for better audio performance');
            recommendations.push('Enable hardware acceleration in browser settings');
        }
        
        if (analysis.keyPress.average > 5) {
            recommendations.push('Disable browser extensions that might interfere');
            recommendations.push('Use a wired keyboard for better response');
        }
        
        return recommendations;
    }

    /**
     * Subscribe to performance updates
     */
    subscribe(callback) {
        this.callbacks.add(callback);
        return () => this.callbacks.delete(callback);
    }

    /**
     * Notify all subscribers
     */
    notifyCallbacks(data = null) {
        const status = this.getPerformanceStatus();
        this.callbacks.forEach(callback => {
            try {
                callback(data || status);
            } catch (error) {
                console.error('Error in latency monitor callback:', error);
            }
        });
    }

    /**
     * Export performance data
     */
    exportData() {
        return {
            measurements: this.measurements,
            analysis: this.getLatencyAnalysis(),
            optimizations: this.optimizations,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Clear all measurements
     */
    clearMeasurements() {
        for (const category of Object.keys(this.measurements)) {
            this.measurements[category] = [];
        }
        console.log('📊 Latency measurements cleared');
    }

    /**
     * Dispose of monitor
     */
    dispose() {
        this.stopMonitoring();
        this.callbacks.clear();
        this.clearMeasurements();
    }
}

export default new LatencyMonitor();