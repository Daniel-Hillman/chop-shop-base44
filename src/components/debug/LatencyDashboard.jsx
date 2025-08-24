/**
 * Latency Dashboard
 * Real-time performance monitoring and optimization interface
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Zap, AlertTriangle, CheckCircle, Settings } from 'lucide-react';
import latencyMonitor from '../../services/LatencyMonitor.js';
import ultraLowLatencyEngine from '../../services/UltraLowLatencyPlaybackEngine.js';

export default function LatencyDashboard({ isVisible, onClose }) {
    const [performanceData, setPerformanceData] = useState(null);
    const [engineMetrics, setEngineMetrics] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [isOptimizing, setIsOptimizing] = useState(false);

    // Update performance data
    useEffect(() => {
        if (!isVisible) return;

        const updateData = () => {
            const status = latencyMonitor.getPerformanceStatus();
            const metrics = ultraLowLatencyEngine.getPerformanceMetrics();
            
            setPerformanceData(status);
            setEngineMetrics(metrics);
            setRecommendations(status.recommendations || []);
        };

        // Initial update
        updateData();

        // Subscribe to updates
        const unsubscribe = latencyMonitor.subscribe(updateData);
        
        // Regular updates
        const interval = setInterval(updateData, 1000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, [isVisible]);

    // Auto-optimize performance
    const handleOptimize = async () => {
        setIsOptimizing(true);
        
        try {
            console.log('🚀 Starting performance optimization...');
            
            // Clear old measurements
            latencyMonitor.clearMeasurements();
            
            // Optimize engine
            await ultraLowLatencyEngine.optimizeForUltraLowLatency();
            
            // Wait a bit for new measurements
            setTimeout(() => {
                setIsOptimizing(false);
                console.log('✅ Performance optimization complete');
            }, 2000);
            
        } catch (error) {
            console.error('Failed to optimize performance:', error);
            setIsOptimizing(false);
        }
    };

    // Export performance data
    const handleExportData = () => {
        const data = latencyMonitor.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `latency-report-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    };

    // Get status color
    const getStatusColor = (rating) => {
        switch (rating) {
            case 'excellent': return 'text-green-400 bg-green-500/20';
            case 'good': return 'text-blue-400 bg-blue-500/20';
            case 'acceptable': return 'text-yellow-400 bg-yellow-500/20';
            case 'poor': return 'text-orange-400 bg-orange-500/20';
            case 'unacceptable': return 'text-red-400 bg-red-500/20';
            default: return 'text-gray-400 bg-gray-500/20';
        }
    };

    // Get status icon
    const getStatusIcon = (rating) => {
        switch (rating) {
            case 'excellent': return <Zap className="w-4 h-4" />;
            case 'good': return <CheckCircle className="w-4 h-4" />;
            case 'acceptable': return <Activity className="w-4 h-4" />;
            case 'poor': 
            case 'unacceptable': return <AlertTriangle className="w-4 h-4" />;
            default: return <Activity className="w-4 h-4" />;
        }
    };

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-gray-900 border border-white/20 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <Activity className="w-6 h-6 text-cyan-400" />
                            <h2 className="text-xl font-bold text-white">Performance Dashboard</h2>
                            {performanceData?.overall && (
                                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${getStatusColor(performanceData.overall.rating)}`}>
                                    {getStatusIcon(performanceData.overall.rating)}
                                    {performanceData.overall.rating.toUpperCase()}
                                </div>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleOptimize}
                                disabled={isOptimizing}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
                            >
                                {isOptimizing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Optimizing...
                                    </>
                                ) : (
                                    <>
                                        <Settings className="w-4 h-4" />
                                        Optimize
                                    </>
                                )}
                            </button>
                            
                            <button
                                onClick={handleExportData}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                            >
                                Export Data
                            </button>
                            
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 text-white rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                        {/* Overall Status */}
                        {performanceData?.overall && (
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-white mb-3">Overall Performance</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-black/30 rounded-lg p-4">
                                        <div className="text-sm text-white/60 mb-1">Total Latency</div>
                                        <div className="text-2xl font-bold text-white">
                                            {performanceData.overall.latency.toFixed(1)}ms
                                        </div>
                                    </div>
                                    <div className="bg-black/30 rounded-lg p-4">
                                        <div className="text-sm text-white/60 mb-1">Status</div>
                                        <div className={`text-lg font-semibold ${getStatusColor(performanceData.overall.rating).split(' ')[0]}`}>
                                            {performanceData.overall.status.replace('-', ' ').toUpperCase()}
                                        </div>
                                    </div>
                                    <div className="bg-black/30 rounded-lg p-4">
                                        <div className="text-sm text-white/60 mb-1">Rating</div>
                                        <div className={`text-lg font-semibold ${getStatusColor(performanceData.overall.rating).split(' ')[0]}`}>
                                            {performanceData.overall.rating.toUpperCase()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Detailed Metrics */}
                        {performanceData?.breakdown && (
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-white mb-3">Latency Breakdown</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {Object.entries(performanceData.breakdown).map(([category, data]) => (
                                        <div key={category} className="bg-black/30 rounded-lg p-4">
                                            <div className="text-sm text-white/60 mb-2 capitalize">
                                                {category.replace(/([A-Z])/g, ' $1').trim()}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between">
                                                    <span className="text-xs text-white/40">Avg:</span>
                                                    <span className="text-sm text-white">{data.average}ms</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-xs text-white/40">Min:</span>
                                                    <span className="text-sm text-white">{data.min}ms</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-xs text-white/40">Max:</span>
                                                    <span className="text-sm text-white">{data.max}ms</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-xs text-white/40">Count:</span>
                                                    <span className="text-sm text-white">{data.count}</span>
                                                </div>
                                                <div className={`text-xs px-2 py-1 rounded ${getStatusColor(data.rating)} text-center`}>
                                                    {data.rating.toUpperCase()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Engine Metrics */}
                        {engineMetrics && (
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-white mb-3">Engine Status</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="bg-black/30 rounded-lg p-4">
                                        <div className="text-sm text-white/60 mb-1">Active Voices</div>
                                        <div className="text-xl font-bold text-white">{engineMetrics.activeVoices}</div>
                                    </div>
                                    <div className="bg-black/30 rounded-lg p-4">
                                        <div className="text-sm text-white/60 mb-1">Preloaded Samples</div>
                                        <div className="text-xl font-bold text-white">{engineMetrics.preloadedSamples}</div>
                                    </div>
                                    <div className="bg-black/30 rounded-lg p-4">
                                        <div className="text-sm text-white/60 mb-1">Buffer Size</div>
                                        <div className="text-xl font-bold text-white">{engineMetrics.bufferSize}</div>
                                    </div>
                                    <div className="bg-black/30 rounded-lg p-4">
                                        <div className="text-sm text-white/60 mb-1">Sample Rate</div>
                                        <div className="text-xl font-bold text-white">{engineMetrics.sampleRate}Hz</div>
                                    </div>
                                </div>
                                
                                {engineMetrics.audioContextLatency && (
                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-black/30 rounded-lg p-4">
                                            <div className="text-sm text-white/60 mb-1">Base Latency</div>
                                            <div className="text-xl font-bold text-white">
                                                {engineMetrics.audioContextLatency.base.toFixed(2)}ms
                                            </div>
                                        </div>
                                        <div className="bg-black/30 rounded-lg p-4">
                                            <div className="text-sm text-white/60 mb-1">Output Latency</div>
                                            <div className="text-xl font-bold text-white">
                                                {engineMetrics.audioContextLatency.output.toFixed(2)}ms
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Recommendations */}
                        {recommendations.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-white mb-3">Recommendations</h3>
                                <div className="space-y-2">
                                    {recommendations.map((rec, index) => (
                                        <div key={index} className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                                            <div className="flex items-start gap-2">
                                                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                                                <span className="text-sm text-yellow-200">{rec}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Optimizations Status */}
                        {performanceData?.optimizations && (
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3">Active Optimizations</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Object.entries(performanceData.optimizations).map(([key, enabled]) => (
                                        <div key={key} className="bg-black/30 rounded-lg p-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-white capitalize">
                                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                                </span>
                                                <div className={`w-3 h-3 rounded-full ${enabled ? 'bg-green-400' : 'bg-gray-500'}`} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}