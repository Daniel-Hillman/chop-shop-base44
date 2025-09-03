/**
 * Performance monitoring component for sampler sequencer
 * Tracks render performance, memory usage, and interaction latency
 */

import React, { useEffect, useRef, useState, memo } from 'react';

const SamplerPerformanceMonitor = memo(function SamplerPerformanceMonitor({
  enabled = process.env.NODE_ENV === 'development',
  onPerformanceData,
  className = ''
}) {
  const [metrics, setMetrics] = useState({
    renderCount: 0,
    averageRenderTime: 0,
    memoryUsage: 0,
    lastInteractionLatency: 0
  });

  const renderStartTime = useRef(Date.now());
  const renderTimes = useRef([]);
  const interactionStartTime = useRef(null);

  // Track render performance
  useEffect(() => {
    if (!enabled) return;

    const renderEndTime = Date.now();
    const renderTime = renderEndTime - renderStartTime.current;
    
    renderTimes.current.push(renderTime);
    
    // Keep only last 10 render times for average calculation
    if (renderTimes.current.length > 10) {
      renderTimes.current.shift();
    }

    const averageRenderTime = renderTimes.current.reduce((sum, time) => sum + time, 0) / renderTimes.current.length;

    setMetrics(prev => ({
      ...prev,
      renderCount: prev.renderCount + 1,
      averageRenderTime: Math.round(averageRenderTime * 100) / 100
    }));

    renderStartTime.current = Date.now();
  });

  // Track memory usage
  useEffect(() => {
    if (!enabled || !performance.memory) return;

    const updateMemoryUsage = () => {
      const memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100;
      
      setMetrics(prev => ({
        ...prev,
        memoryUsage
      }));
    };

    const interval = setInterval(updateMemoryUsage, 2000);
    updateMemoryUsage();

    return () => clearInterval(interval);
  }, [enabled]);

  // Track interaction latency
  const trackInteraction = (type) => {
    if (!enabled) return;
    
    interactionStartTime.current = Date.now();
    
    // Use requestAnimationFrame to measure when the interaction is processed
    requestAnimationFrame(() => {
      if (interactionStartTime.current) {
        const latency = Date.now() - interactionStartTime.current;
        
        setMetrics(prev => ({
          ...prev,
          lastInteractionLatency: latency
        }));
        
        interactionStartTime.current = null;
      }
    });
  };

  // Expose tracking function to parent components
  useEffect(() => {
    if (onPerformanceData) {
      onPerformanceData({ trackInteraction, metrics });
    }
  }, [onPerformanceData, metrics]);

  // Performance warnings
  useEffect(() => {
    if (!enabled) return;

    const { averageRenderTime, memoryUsage, lastInteractionLatency } = metrics;

    // Warn about slow renders (>16ms for 60fps)
    if (averageRenderTime > 16) {
      console.warn(`[Sampler Performance] Slow renders detected: ${averageRenderTime}ms average (target: <16ms)`);
    }

    // Warn about high memory usage (>100MB)
    if (memoryUsage > 100) {
      console.warn(`[Sampler Performance] High memory usage: ${memoryUsage}MB`);
    }

    // Warn about high interaction latency (>50ms)
    if (lastInteractionLatency > 50) {
      console.warn(`[Sampler Performance] High interaction latency: ${lastInteractionLatency}ms`);
    }
  }, [enabled, metrics]);

  if (!enabled) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 right-4 bg-black/80 text-white text-xs p-2 rounded border border-white/20 font-mono ${className}`}>
      <div className="space-y-1">
        <div>Renders: {metrics.renderCount}</div>
        <div>Avg Render: {metrics.averageRenderTime}ms</div>
        <div>Memory: {metrics.memoryUsage}MB</div>
        <div>Latency: {metrics.lastInteractionLatency}ms</div>
      </div>
    </div>
  );
});

export default SamplerPerformanceMonitor;