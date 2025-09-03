/**
 * @fileoverview Sampler Performance Dashboard
 * Real-time performance monitoring and optimization controls
 * Helps identify and resolve performance bottlenecks
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import { Activity, Cpu, Zap, AlertTriangle, CheckCircle, Settings } from 'lucide-react';

/**
 * Performance dashboard for monitoring sequencer performance
 * Displays real-time metrics and optimization controls
 */
const SamplerPerformanceDashboard = memo(function SamplerPerformanceDashboard({
  service = null,
  isVisible = false,
  onToggle,
  className = ''
}) {
  // Performance metrics state
  const [metrics, setMetrics] = useState({
    engine: { jitter: 0, drift: 0, cpuUsage: 0 },
    renderer: { frameTime: 0, droppedFrames: 0, renderCalls: 0 },
    service: { activeChops: 0, totalChops: 0, config: {} }
  });
  
  // Performance status
  const [performanceStatus, setPerformanceStatus] = useState('good'); // good, warning, critical
  const [recommendations, setRecommendations] = useState([]);
  
  // Auto-optimization settings
  const [autoOptimize, setAutoOptimize] = useState(true);
  const [optimizationLevel, setOptimizationLevel] = useState('balanced'); // conservative, balanced, aggressive

  // Update metrics from service
  const updateMetrics = useCallback(() => {
    if (!service || typeof service.getPerformanceMetrics !== 'function') {
      return;
    }

    try {
      const newMetrics = service.getPerformanceMetrics();
      setMetrics(newMetrics);
      
      // Analyze performance and generate recommendations
      analyzePerformance(newMetrics);
      
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
    }
  }, [service]);

  // Analyze performance metrics and generate recommendations
  const analyzePerformance = useCallback((metrics) => {
    const issues = [];
    let status = 'good';

    // Check engine performance
    if (metrics.engine.jitter > 20) {
      issues.push({
        type: 'critical',
        message: 'High audio jitter detected',
        recommendation: 'Reduce concurrent chops or increase buffer size'
      });
      status = 'critical';
    } else if (metrics.engine.jitter > 10) {
      issues.push({
        type: 'warning',
        message: 'Moderate audio jitter',
        recommendation: 'Consider reducing visual effects or background processes'
      });
      if (status !== 'critical') status = 'warning';
    }

    // Check renderer performance
    if (metrics.renderer.droppedFrames > 10) {
      issues.push({
        type: 'critical',
        message: 'High number of dropped frames',
        recommendation: 'Enable hardware acceleration or reduce visual complexity'
      });
      status = 'critical';
    } else if (metrics.renderer.droppedFrames > 3) {
      issues.push({
        type: 'warning',
        message: 'Some frames dropped',
        recommendation: 'Close unnecessary browser tabs or applications'
      });
      if (status !== 'critical') status = 'warning';
    }

    // Check service performance
    if (metrics.service.activeChops > 6) {
      issues.push({
        type: 'warning',
        message: 'High number of concurrent chops',
        recommendation: 'Limit simultaneous chop playback for better performance'
      });
      if (status !== 'critical') status = 'warning';
    }

    setPerformanceStatus(status);
    setRecommendations(issues);

    // Auto-optimize if enabled
    if (autoOptimize && status !== 'good') {
      applyAutoOptimizations(metrics, status);
    }
  }, [autoOptimize]);

  // Apply automatic optimizations based on performance
  const applyAutoOptimizations = useCallback((metrics, status) => {
    if (!service || typeof service.performanceConfig === 'undefined') {
      return;
    }

    try {
      const config = { ...service.performanceConfig };
      let changed = false;

      if (status === 'critical') {
        // Aggressive optimizations for critical performance
        if (optimizationLevel === 'aggressive') {
          config.maxConcurrentChops = Math.max(2, config.maxConcurrentChops - 2);
          config.renderThrottle = Math.max(33, config.renderThrottle + 8); // Reduce to 30fps
          changed = true;
        } else if (optimizationLevel === 'balanced') {
          config.maxConcurrentChops = Math.max(4, config.maxConcurrentChops - 1);
          config.renderThrottle = Math.max(20, config.renderThrottle + 4);
          changed = true;
        }
      } else if (status === 'warning') {
        // Moderate optimizations for warning status
        if (optimizationLevel !== 'conservative') {
          config.maxConcurrentChops = Math.max(4, config.maxConcurrentChops - 1);
          changed = true;
        }
      }

      if (changed) {
        service.performanceConfig = config;
        console.log('Auto-optimization applied:', config);
      }

    } catch (error) {
      console.error('Auto-optimization failed:', error);
    }
  }, [service, optimizationLevel]);

  // Manual optimization controls
  const handleManualOptimization = useCallback((type) => {
    if (!service) return;

    try {
      const config = { ...service.performanceConfig };

      switch (type) {
        case 'reduce_chops':
          config.maxConcurrentChops = Math.max(2, config.maxConcurrentChops - 1);
          break;
        case 'increase_chops':
          config.maxConcurrentChops = Math.min(8, config.maxConcurrentChops + 1);
          break;
        case 'reduce_quality':
          config.renderThrottle = Math.max(33, config.renderThrottle + 8);
          break;
        case 'increase_quality':
          config.renderThrottle = Math.max(16, config.renderThrottle - 8);
          break;
        case 'reset':
          config.maxConcurrentChops = 6;
          config.renderThrottle = 16;
          config.audioLookahead = 25;
          break;
      }

      service.performanceConfig = config;
      
    } catch (error) {
      console.error('Manual optimization failed:', error);
    }
  }, [service]);

  // Update metrics periodically
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(updateMetrics, 1000); // Update every second
    updateMetrics(); // Initial update

    return () => clearInterval(interval);
  }, [isVisible, updateMetrics]);

  // Get status color
  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'good': return '#10b981'; // Green
      case 'warning': return '#f59e0b'; // Amber
      case 'critical': return '#ef4444'; // Red
      default: return '#6b7280'; // Gray
    }
  }, []);

  // Get status icon
  const getStatusIcon = useCallback((status) => {
    switch (status) {
      case 'good': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'critical': return AlertTriangle;
      default: return Activity;
    }
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="performance-toggle"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: getStatusColor(performanceStatus),
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          zIndex: 1000
        }}
      >
        <Activity className="w-6 h-6" />
      </button>
    );
  }

  const StatusIcon = getStatusIcon(performanceStatus);

  return (
    <div className={`performance-dashboard ${className}`} style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '400px',
      maxHeight: '600px',
      background: 'rgba(0, 0, 0, 0.9)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '20px',
      color: 'white',
      fontSize: '14px',
      overflow: 'auto',
      zIndex: 1000
    }}>
      {/* Header */}
      <div className="dashboard-header" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <StatusIcon 
            className="w-5 h-5" 
            style={{ color: getStatusColor(performanceStatus) }}
          />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
            Performance Dashboard
          </h3>
        </div>
        <button
          onClick={onToggle}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          ×
        </button>
      </div>

      {/* Status Overview */}
      <div className="status-overview" style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '16px'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          marginBottom: '8px'
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: getStatusColor(performanceStatus)
          }} />
          <span style={{ fontWeight: '500', textTransform: 'capitalize' }}>
            {performanceStatus} Performance
          </span>
        </div>
        
        {recommendations.length > 0 && (
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
            {recommendations.length} recommendation{recommendations.length > 1 ? 's' : ''} available
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="metrics-section" style={{ marginBottom: '16px' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '500' }}>
          Real-time Metrics
        </h4>
        
        <div className="metrics-grid" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px'
        }}>
          <div className="metric-card" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '6px',
            padding: '8px'
          }}>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
              Audio Jitter
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>
              {metrics.engine.jitter.toFixed(1)}ms
            </div>
          </div>
          
          <div className="metric-card" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '6px',
            padding: '8px'
          }}>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
              Dropped Frames
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>
              {metrics.renderer.droppedFrames}
            </div>
          </div>
          
          <div className="metric-card" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '6px',
            padding: '8px'
          }}>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
              Active Chops
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>
              {metrics.service.activeChops}/{metrics.service.config.maxConcurrentChops || 6}
            </div>
          </div>
          
          <div className="metric-card" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '6px',
            padding: '8px'
          }}>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
              Frame Time
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>
              {metrics.renderer.frameTime.toFixed(1)}ms
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="recommendations-section" style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '500' }}>
            Recommendations
          </h4>
          
          {recommendations.map((rec, index) => (
            <div key={index} className="recommendation" style={{
              background: rec.type === 'critical' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              border: `1px solid ${rec.type === 'critical' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
              borderRadius: '6px',
              padding: '8px',
              marginBottom: '8px'
            }}>
              <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                {rec.message}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
                {rec.recommendation}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="controls-section">
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '500' }}>
          Optimization Controls
        </h4>
        
        {/* Auto-optimization toggle */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '12px'
        }}>
          <span>Auto-optimize</span>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoOptimize}
              onChange={(e) => setAutoOptimize(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
          </label>
        </div>
        
        {/* Optimization level */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px' }}>
            Optimization Level
          </label>
          <select
            value={optimizationLevel}
            onChange={(e) => setOptimizationLevel(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              padding: '6px',
              color: 'white'
            }}
          >
            <option value="conservative">Conservative</option>
            <option value="balanced">Balanced</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </div>
        
        {/* Manual controls */}
        <div className="manual-controls" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px'
        }}>
          <button
            onClick={() => handleManualOptimization('reduce_chops')}
            style={{
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '4px',
              padding: '6px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Reduce Chops
          </button>
          
          <button
            onClick={() => handleManualOptimization('increase_chops')}
            style={{
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '4px',
              padding: '6px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Increase Chops
          </button>
          
          <button
            onClick={() => handleManualOptimization('reduce_quality')}
            style={{
              background: 'rgba(245, 158, 11, 0.2)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '4px',
              padding: '6px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Reduce Quality
          </button>
          
          <button
            onClick={() => handleManualOptimization('reset')}
            style={{
              background: 'rgba(107, 114, 128, 0.2)',
              border: '1px solid rgba(107, 114, 128, 0.3)',
              borderRadius: '4px',
              padding: '6px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
});

export default SamplerPerformanceDashboard;