/**
 * Latency Test Page
 * Comprehensive testing interface for ultra-low latency performance
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Square, BarChart3, Download, RefreshCw, Zap } from 'lucide-react';
import ultraLowLatencyEngine from '../services/UltraLowLatencyPlaybackEngine.js';
import latencyMonitor from '../services/LatencyMonitor.js';
import LatencyDashboard from '../components/debug/LatencyDashboard.jsx';

export default function LatencyTestPage() {
    const [isInitialized, setIsInitialized] = useState(false);
    const [testResults, setTestResults] = useState([]);
    const [isRunningTest, setIsRunningTest] = useState(false);
    const [currentTest, setCurrentTest] = useState(null);
    const [performanceMetrics, setPerformanceMetrics] = useState(null);
    const [showDashboard, setShowDashboard] = useState(false);
    const [testAudioBuffer, setTestAudioBuffer] = useState(null);
    
    const testSampleRef = useRef(null);
    const testCountRef = useRef(0);

    // Initialize system
    useEffect(() => {
        const initialize = async () => {
            try {
                console.log('🚀 Initializing ultra-low latency test system...');
                
                // Initialize engine
                await ultraLowLatencyEngine.initialize();
                await ultraLowLatencyEngine.optimizeForUltraLowLatency();
                
                // Start monitoring
                latencyMonitor.startMonitoring(100);
                
                // Create test audio buffer (sine wave)
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const sampleRate = audioContext.sampleRate;
                const duration = 0.5; // 500ms
                const frequency = 440; // A4
                
                const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
                const channelData = buffer.getChannelData(0);
                
                // Generate sine wave with envelope
                for (let i = 0; i < channelData.length; i++) {
                    const t = i / sampleRate;
                    const envelope = Math.exp(-t * 3); // Exponential decay
                    channelData[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
                }
                
                setTestAudioBuffer(buffer);
                
                // Preload test sample
                await ultraLowLatencyEngine.preloadSample('TEST', buffer, 0, duration);
                
                setIsInitialized(true);
                console.log('✅ Test system initialized');
                
            } catch (error) {
                console.error('Failed to initialize test system:', error);
            }
        };

        initialize();

        return () => {
            latencyMonitor.stopMonitoring();
        };
    }, []);

    // Monitor performance
    useEffect(() => {
        if (!isInitialized) return;

        const unsubscribe = latencyMonitor.subscribe((status) => {
            setPerformanceMetrics(status);
        });

        return unsubscribe;
    }, [isInitialized]);

    // Test configurations
    const testConfigs = [
        {
            name: 'Single Trigger Test',
            description: 'Test single sample trigger latency',
            iterations: 1,
            delay: 0,
            test: async () => {
                const startTime = performance.now();
                const result = await ultraLowLatencyEngine.triggerSample('TEST', 1.0);
                const endTime = performance.now();
                
                return {
                    success: result.success,
                    latency: result.latency,
                    totalTime: endTime - startTime,
                    engineLatency: result.latency
                };
            }
        },
        {
            name: 'Rapid Fire Test',
            description: 'Test rapid successive triggers (10 triggers, 100ms apart)',
            iterations: 10,
            delay: 100,
            test: async () => {
                const startTime = performance.now();
                const result = await ultraLowLatencyEngine.triggerSample('TEST', 1.0);
                const endTime = performance.now();
                
                return {
                    success: result.success,
                    latency: result.latency,
                    totalTime: endTime - startTime,
                    engineLatency: result.latency
                };
            }
        },
        {
            name: 'Burst Test',
            description: 'Test simultaneous triggers (5 at once)',
            iterations: 5,
            delay: 0,
            simultaneous: true,
            test: async () => {
                const startTime = performance.now();
                const promises = Array(5).fill().map(() => 
                    ultraLowLatencyEngine.triggerSample('TEST', 1.0)
                );
                const results = await Promise.all(promises);
                const endTime = performance.now();
                
                const avgLatency = results.reduce((sum, r) => sum + (r.latency || 0), 0) / results.length;
                const allSuccess = results.every(r => r.success);
                
                return {
                    success: allSuccess,
                    latency: avgLatency,
                    totalTime: endTime - startTime,
                    engineLatency: avgLatency,
                    results: results
                };
            }
        },
        {
            name: 'Stress Test',
            description: 'Test system under load (50 triggers, 50ms apart)',
            iterations: 50,
            delay: 50,
            test: async () => {
                const startTime = performance.now();
                const result = await ultraLowLatencyEngine.triggerSample('TEST', 1.0);
                const endTime = performance.now();
                
                return {
                    success: result.success,
                    latency: result.latency,
                    totalTime: endTime - startTime,
                    engineLatency: result.latency
                };
            }
        }
    ];

    // Run test
    const runTest = async (config) => {
        if (isRunningTest || !isInitialized) return;

        setIsRunningTest(true);
        setCurrentTest(config.name);
        testCountRef.current = 0;

        const results = [];
        const startTime = Date.now();

        try {
            if (config.simultaneous) {
                // Run all iterations simultaneously
                const result = await config.test();
                results.push({
                    iteration: 1,
                    timestamp: Date.now(),
                    ...result
                });
            } else {
                // Run iterations sequentially
                for (let i = 0; i < config.iterations; i++) {
                    testCountRef.current = i + 1;
                    
                    const result = await config.test();
                    results.push({
                        iteration: i + 1,
                        timestamp: Date.now(),
                        ...result
                    });

                    // Record latency for monitoring
                    if (result.success) {
                        latencyMonitor.recordTotalLatency(
                            performance.now() - result.totalTime,
                            performance.now()
                        );
                    }

                    // Delay between iterations
                    if (config.delay > 0 && i < config.iterations - 1) {
                        await new Promise(resolve => setTimeout(resolve, config.delay));
                    }
                }
            }

            const endTime = Date.now();
            const testDuration = endTime - startTime;

            // Calculate statistics
            const successfulResults = results.filter(r => r.success);
            const latencies = successfulResults.map(r => r.latency);
            const totalTimes = successfulResults.map(r => r.totalTime);

            const stats = {
                testName: config.name,
                description: config.description,
                totalIterations: config.iterations,
                successfulIterations: successfulResults.length,
                successRate: (successfulResults.length / config.iterations) * 100,
                testDuration,
                latency: {
                    min: Math.min(...latencies),
                    max: Math.max(...latencies),
                    avg: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
                    median: latencies.sort((a, b) => a - b)[Math.floor(latencies.length / 2)]
                },
                totalTime: {
                    min: Math.min(...totalTimes),
                    max: Math.max(...totalTimes),
                    avg: totalTimes.reduce((sum, t) => sum + t, 0) / totalTimes.length
                },
                results,
                timestamp: new Date().toISOString()
            };

            setTestResults(prev => [stats, ...prev]);
            console.log('📊 Test completed:', stats);

        } catch (error) {
            console.error('Test failed:', error);
        } finally {
            setIsRunningTest(false);
            setCurrentTest(null);
            testCountRef.current = 0;
        }
    };

    // Export test results
    const exportResults = () => {
        const data = {
            testResults,
            performanceMetrics,
            engineMetrics: ultraLowLatencyEngine.getPerformanceMetrics(),
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `latency-test-results-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    };

    // Clear results
    const clearResults = () => {
        setTestResults([]);
        latencyMonitor.clearMeasurements();
    };

    // Manual trigger for testing
    const manualTrigger = async () => {
        if (!isInitialized) return;
        
        const startTime = performance.now();
        const result = await ultraLowLatencyEngine.triggerSample('TEST', 1.0);
        const endTime = performance.now();
        
        console.log(`🎵 Manual trigger: ${result.latency?.toFixed(2)}ms engine, ${(endTime - startTime).toFixed(2)}ms total`);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Ultra-Low Latency Test Suite</h1>
                        <p className="text-white/60">Comprehensive performance testing for audio latency optimization</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {isInitialized ? (
                            <div className="flex items-center gap-2 px-3 py-2 bg-green-500/20 text-green-300 rounded-lg">
                                <Zap className="w-4 h-4" />
                                System Ready
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/20 text-yellow-300 rounded-lg">
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Initializing...
                            </div>
                        )}
                    </div>
                </div>

                {/* Performance Status */}
                {performanceMetrics && (
                    <div className="bg-black/30 rounded-xl p-6 mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">Current Performance</h2>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-white">
                                    {performanceMetrics.overall?.latency?.toFixed(1) || '--'}ms
                                </div>
                                <div className="text-sm text-white/60">Overall Latency</div>
                            </div>
                            <div className="text-center">
                                <div className={`text-2xl font-bold ${
                                    performanceMetrics.overall?.rating === 'excellent' ? 'text-green-400' :
                                    performanceMetrics.overall?.rating === 'good' ? 'text-blue-400' :
                                    performanceMetrics.overall?.rating === 'acceptable' ? 'text-yellow-400' :
                                    'text-red-400'
                                }`}>
                                    {performanceMetrics.overall?.rating?.toUpperCase() || 'UNKNOWN'}
                                </div>
                                <div className="text-sm text-white/60">Rating</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-white">
                                    {ultraLowLatencyEngine.getPerformanceMetrics()?.activeVoices || 0}
                                </div>
                                <div className="text-sm text-white/60">Active Voices</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-white">
                                    {ultraLowLatencyEngine.getPerformanceMetrics()?.preloadedSamples || 0}
                                </div>
                                <div className="text-sm text-white/60">Preloaded</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Test Controls */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Test Configurations */}
                    <div className="bg-black/30 rounded-xl p-6">
                        <h2 className="text-xl font-semibold text-white mb-4">Test Configurations</h2>
                        <div className="space-y-3">
                            {testConfigs.map((config, index) => (
                                <div key={index} className="bg-white/5 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-semibold text-white">{config.name}</h3>
                                        <button
                                            onClick={() => runTest(config)}
                                            disabled={isRunningTest || !isInitialized}
                                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            {isRunningTest && currentTest === config.name ? (
                                                <>
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                    Running... ({testCountRef.current}/{config.iterations})
                                                </>
                                            ) : (
                                                <>
                                                    <Play className="w-4 h-4" />
                                                    Run Test
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <p className="text-sm text-white/60">{config.description}</p>
                                    <div className="text-xs text-white/40 mt-1">
                                        {config.iterations} iterations • {config.delay}ms delay
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Manual Controls */}
                    <div className="bg-black/30 rounded-xl p-6">
                        <h2 className="text-xl font-semibold text-white mb-4">Manual Controls</h2>
                        <div className="space-y-4">
                            <button
                                onClick={manualTrigger}
                                disabled={!isInitialized}
                                className="w-full px-6 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-lg font-semibold"
                            >
                                <Zap className="w-5 h-5" />
                                Manual Trigger Test
                            </button>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setShowDashboard(true)}
                                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <BarChart3 className="w-4 h-4" />
                                    Dashboard
                                </button>
                                
                                <button
                                    onClick={exportResults}
                                    disabled={testResults.length === 0}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Export
                                </button>
                            </div>
                            
                            <button
                                onClick={clearResults}
                                disabled={testResults.length === 0}
                                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <Square className="w-4 h-4" />
                                Clear Results
                            </button>
                        </div>
                    </div>
                </div>

                {/* Test Results */}
                {testResults.length > 0 && (
                    <div className="bg-black/30 rounded-xl p-6">
                        <h2 className="text-xl font-semibold text-white mb-4">Test Results</h2>
                        <div className="space-y-4">
                            {testResults.map((result, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white/5 rounded-lg p-4"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold text-white">{result.testName}</h3>
                                        <div className="text-sm text-white/60">
                                            {new Date(result.timestamp).toLocaleTimeString()}
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                                        <div>
                                            <div className="text-sm text-white/60">Success Rate</div>
                                            <div className="text-lg font-semibold text-white">
                                                {result.successRate.toFixed(1)}%
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-white/60">Avg Latency</div>
                                            <div className="text-lg font-semibold text-white">
                                                {result.latency.avg.toFixed(2)}ms
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-white/60">Min/Max</div>
                                            <div className="text-lg font-semibold text-white">
                                                {result.latency.min.toFixed(1)}/{result.latency.max.toFixed(1)}ms
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-white/60">Test Duration</div>
                                            <div className="text-lg font-semibold text-white">
                                                {(result.testDuration / 1000).toFixed(1)}s
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="text-sm text-white/60">
                                        {result.description} • {result.successfulIterations}/{result.totalIterations} successful
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Dashboard */}
                <LatencyDashboard
                    isVisible={showDashboard}
                    onClose={() => setShowDashboard(false)}
                />
            </div>
        </div>
    );
}