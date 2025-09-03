/**
 * Discovery Performance Debugger - Interactive debugging utilities for performance monitoring
 * 
 * Provides a comprehensive debugging interface for analyzing performance metrics,
 * identifying bottlenecks, and generating performance reports.
 */

import DiscoveryPerformanceMonitor from '../services/discovery/DiscoveryPerformanceMonitor.js';
import discoveryPerformanceLogger from './discoveryPerformanceLogger.js';

/**
 * Performance Debugger Class
 */
class DiscoveryPerformanceDebugger {
  constructor() {
    this.monitor = new DiscoveryPerformanceMonitor();
    this.logger = discoveryPerformanceLogger;
    this.isDebugging = false;
    this.debugPanel = null;
    this.updateInterval = null;
    
    this.initializeDebugger();
  }

  /**
   * Initialize the debugger
   */
  initializeDebugger() {
    // Only enable in development or when explicitly enabled
    this.isEnabled = process.env.NODE_ENV === 'development' || 
                    process.env.VITE_ENABLE_PERFORMANCE_DEBUG === 'true';

    if (this.isEnabled && typeof window !== 'undefined') {
      // Add global debug functions
      window.discoveryPerformanceDebug = {
        start: () => this.startDebugging(),
        stop: () => this.stopDebugging(),
        report: () => this.generateReport(),
        clear: () => this.clearData(),
        export: (format) => this.exportData(format),
        monitor: this.monitor,
        logger: this.logger
      };

      // Listen for keyboard shortcut (Ctrl+Shift+P)
      document.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.shiftKey && event.key === 'P') {
          this.toggleDebugging();
        }
      });
    }
  }

  /**
   * Start debugging mode
   */
  startDebugging() {
    if (!this.isEnabled || this.isDebugging) return;

    this.isDebugging = true;
    this.createDebugPanel();
    this.startRealTimeUpdates();
    
    console.log('🔍 Discovery Performance Debugging Started');
    console.log('Use Ctrl+Shift+P to toggle debug panel');
    console.log('Available commands: window.discoveryPerformanceDebug');
  }

  /**
   * Stop debugging mode
   */
  stopDebugging() {
    if (!this.isDebugging) return;

    this.isDebugging = false;
    this.removeDebugPanel();
    this.stopRealTimeUpdates();
    
    console.log('🔍 Discovery Performance Debugging Stopped');
  }

  /**
   * Toggle debugging mode
   */
  toggleDebugging() {
    if (this.isDebugging) {
      this.stopDebugging();
    } else {
      this.startDebugging();
    }
  }

  /**
   * Create debug panel UI
   */
  createDebugPanel() {
    if (typeof document === 'undefined' || this.debugPanel) return;

    this.debugPanel = document.createElement('div');
    this.debugPanel.id = 'discovery-performance-debug-panel';
    this.debugPanel.innerHTML = this.getDebugPanelHTML();
    
    // Apply styles
    this.applyDebugPanelStyles();
    
    document.body.appendChild(this.debugPanel);
    
    // Add event listeners
    this.attachDebugPanelEvents();
  }

  /**
   * Remove debug panel
   */
  removeDebugPanel() {
    if (this.debugPanel) {
      this.debugPanel.remove();
      this.debugPanel = null;
    }
  }

  /**
   * Get debug panel HTML
   */
  getDebugPanelHTML() {
    return `
      <div class="debug-header">
        <h3>🔍 Discovery Performance Debug</h3>
        <div class="debug-controls">
          <button id="debug-refresh">Refresh</button>
          <button id="debug-clear">Clear</button>
          <button id="debug-export">Export</button>
          <button id="debug-close">×</button>
        </div>
      </div>
      
      <div class="debug-tabs">
        <button class="debug-tab active" data-tab="overview">Overview</button>
        <button class="debug-tab" data-tab="metrics">Metrics</button>
        <button class="debug-tab" data-tab="alerts">Alerts</button>
        <button class="debug-tab" data-tab="logs">Logs</button>
      </div>
      
      <div class="debug-content">
        <div id="debug-overview" class="debug-tab-content active">
          <div class="debug-stats" id="debug-stats"></div>
          <div class="debug-charts" id="debug-charts"></div>
        </div>
        
        <div id="debug-metrics" class="debug-tab-content">
          <div class="debug-metrics-list" id="debug-metrics-list"></div>
        </div>
        
        <div id="debug-alerts" class="debug-tab-content">
          <div class="debug-alerts-list" id="debug-alerts-list"></div>
        </div>
        
        <div id="debug-logs" class="debug-tab-content">
          <div class="debug-logs-list" id="debug-logs-list"></div>
        </div>
      </div>
    `;
  }

  /**
   * Apply styles to debug panel
   */
  applyDebugPanelStyles() {
    if (!this.debugPanel) return;

    const styles = `
      #discovery-performance-debug-panel {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 400px;
        height: 500px;
        background: rgba(0, 0, 0, 0.95);
        color: #fff;
        border: 1px solid #333;
        border-radius: 8px;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        z-index: 10000;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      }
      
      .debug-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px;
        background: #1a1a1a;
        border-bottom: 1px solid #333;
      }
      
      .debug-header h3 {
        margin: 0;
        font-size: 14px;
      }
      
      .debug-controls button {
        background: #333;
        color: #fff;
        border: none;
        padding: 4px 8px;
        margin-left: 4px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
      }
      
      .debug-controls button:hover {
        background: #555;
      }
      
      .debug-tabs {
        display: flex;
        background: #2a2a2a;
        border-bottom: 1px solid #333;
      }
      
      .debug-tab {
        flex: 1;
        background: none;
        color: #ccc;
        border: none;
        padding: 8px;
        cursor: pointer;
        font-size: 11px;
      }
      
      .debug-tab.active {
        background: #333;
        color: #fff;
      }
      
      .debug-content {
        height: calc(100% - 100px);
        overflow-y: auto;
        padding: 10px;
      }
      
      .debug-tab-content {
        display: none;
      }
      
      .debug-tab-content.active {
        display: block;
      }
      
      .debug-stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-bottom: 15px;
      }
      
      .debug-stat {
        background: #1a1a1a;
        padding: 8px;
        border-radius: 4px;
        text-align: center;
      }
      
      .debug-stat-value {
        font-size: 16px;
        font-weight: bold;
        color: #4CAF50;
      }
      
      .debug-stat-label {
        font-size: 10px;
        color: #ccc;
        margin-top: 2px;
      }
      
      .debug-metric, .debug-alert, .debug-log {
        background: #1a1a1a;
        margin-bottom: 5px;
        padding: 8px;
        border-radius: 4px;
        border-left: 3px solid #333;
      }
      
      .debug-metric.slow {
        border-left-color: #f44336;
      }
      
      .debug-alert {
        border-left-color: #ff9800;
      }
      
      .debug-log.error {
        border-left-color: #f44336;
      }
      
      .debug-log.warn {
        border-left-color: #ff9800;
      }
      
      .debug-log.info {
        border-left-color: #2196F3;
      }
      
      .debug-metric-name {
        font-weight: bold;
        color: #4CAF50;
      }
      
      .debug-metric-duration {
        color: #ff9800;
      }
      
      .debug-metric-context {
        font-size: 10px;
        color: #ccc;
        margin-top: 4px;
      }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }

  /**
   * Attach event listeners to debug panel
   */
  attachDebugPanelEvents() {
    if (!this.debugPanel) return;

    // Tab switching
    this.debugPanel.querySelectorAll('.debug-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        this.switchTab(tabName);
      });
    });

    // Control buttons
    this.debugPanel.querySelector('#debug-refresh').addEventListener('click', () => {
      this.updateDebugPanel();
    });

    this.debugPanel.querySelector('#debug-clear').addEventListener('click', () => {
      this.clearData();
      this.updateDebugPanel();
    });

    this.debugPanel.querySelector('#debug-export').addEventListener('click', () => {
      this.exportData('json');
    });

    this.debugPanel.querySelector('#debug-close').addEventListener('click', () => {
      this.stopDebugging();
    });
  }

  /**
   * Switch debug panel tab
   */
  switchTab(tabName) {
    if (!this.debugPanel) return;

    // Update tab buttons
    this.debugPanel.querySelectorAll('.debug-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update tab content
    this.debugPanel.querySelectorAll('.debug-tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `debug-${tabName}`);
    });

    // Update content for the active tab
    this.updateTabContent(tabName);
  }

  /**
   * Update tab content
   */
  updateTabContent(tabName) {
    switch (tabName) {
      case 'overview':
        this.updateOverviewTab();
        break;
      case 'metrics':
        this.updateMetricsTab();
        break;
      case 'alerts':
        this.updateAlertsTab();
        break;
      case 'logs':
        this.updateLogsTab();
        break;
    }
  }

  /**
   * Update overview tab
   */
  updateOverviewTab() {
    const statsElement = this.debugPanel?.querySelector('#debug-stats');
    if (!statsElement) return;

    const debugInfo = this.monitor.getDebugInfo();
    const logSummary = this.logger.getPerformanceSummary();

    statsElement.innerHTML = `
      <div class="debug-stat">
        <div class="debug-stat-value">${debugInfo.metricsCount}</div>
        <div class="debug-stat-label">Metrics</div>
      </div>
      <div class="debug-stat">
        <div class="debug-stat-value">${logSummary.alertsCount}</div>
        <div class="debug-stat-label">Alerts</div>
      </div>
      <div class="debug-stat">
        <div class="debug-stat-value">${logSummary.averageDuration.toFixed(0)}ms</div>
        <div class="debug-stat-label">Avg Duration</div>
      </div>
      <div class="debug-stat">
        <div class="debug-stat-value">${logSummary.slowOperations}</div>
        <div class="debug-stat-label">Slow Ops</div>
      </div>
    `;

    // Update charts section with performance summary by type
    const chartsElement = this.debugPanel?.querySelector('#debug-charts');
    if (chartsElement) {
      const chartHTML = Object.entries(logSummary.byType)
        .map(([type, data]) => `
          <div class="debug-stat">
            <div class="debug-stat-value">${data.average.toFixed(0)}ms</div>
            <div class="debug-stat-label">${type} (${data.count})</div>
          </div>
        `).join('');
      
      chartsElement.innerHTML = chartHTML;
    }
  }

  /**
   * Update metrics tab
   */
  updateMetricsTab() {
    const metricsElement = this.debugPanel?.querySelector('#debug-metrics-list');
    if (!metricsElement) return;

    const debugInfo = this.monitor.getDebugInfo();
    const recentMetrics = debugInfo.recentMetrics || [];

    const metricsHTML = recentMetrics.map(metric => `
      <div class="debug-metric ${metric.isSlowPerformance ? 'slow' : ''}">
        <div class="debug-metric-name">${metric.name}</div>
        <div class="debug-metric-duration">${metric.duration?.toFixed(2) || 0}ms</div>
        <div class="debug-metric-context">${JSON.stringify(metric.context || {})}</div>
      </div>
    `).join('');

    metricsElement.innerHTML = metricsHTML || '<div>No metrics recorded</div>';
  }

  /**
   * Update alerts tab
   */
  updateAlertsTab() {
    const alertsElement = this.debugPanel?.querySelector('#debug-alerts-list');
    if (!alertsElement) return;

    const recentLogs = this.logger.getRecentLogs(20, 'alert');

    const alertsHTML = recentLogs.map(alert => `
      <div class="debug-alert">
        <div class="debug-metric-name">${alert.alertType}</div>
        <div>${alert.message}</div>
        <div class="debug-metric-context">
          ${new Date(alert.timestamp).toLocaleTimeString()}
        </div>
      </div>
    `).join('');

    alertsElement.innerHTML = alertsHTML || '<div>No alerts recorded</div>';
  }

  /**
   * Update logs tab
   */
  updateLogsTab() {
    const logsElement = this.debugPanel?.querySelector('#debug-logs-list');
    if (!logsElement) return;

    const recentLogs = this.logger.getRecentLogs(30);

    const logsHTML = recentLogs.map(log => `
      <div class="debug-log ${log.level.toLowerCase()}">
        <div class="debug-metric-name">[${log.level}] ${log.message}</div>
        <div class="debug-metric-context">
          ${new Date(log.timestamp).toLocaleTimeString()}
        </div>
      </div>
    `).join('');

    logsElement.innerHTML = logsHTML || '<div>No logs recorded</div>';
  }

  /**
   * Start real-time updates
   */
  startRealTimeUpdates() {
    if (this.updateInterval) return;

    this.updateInterval = setInterval(() => {
      this.updateDebugPanel();
    }, 2000); // Update every 2 seconds
  }

  /**
   * Stop real-time updates
   */
  stopRealTimeUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Update debug panel content
   */
  updateDebugPanel() {
    if (!this.debugPanel) return;

    const activeTab = this.debugPanel.querySelector('.debug-tab.active');
    if (activeTab) {
      this.updateTabContent(activeTab.dataset.tab);
    }
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const debugInfo = this.monitor.getDebugInfo();
    const logSummary = this.logger.getPerformanceSummary();
    const recentLogs = this.logger.getRecentLogs(50);

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalMetrics: debugInfo.metricsCount,
        totalLogs: logSummary.totalLogs,
        totalAlerts: logSummary.alertsCount,
        slowOperations: logSummary.slowOperations,
        averageDuration: logSummary.averageDuration
      },
      performanceByType: logSummary.byType,
      thresholds: debugInfo.thresholds,
      recentMetrics: debugInfo.recentMetrics,
      recentLogs: recentLogs.slice(-20),
      recommendations: this.generateRecommendations(debugInfo, logSummary)
    };

    console.log('📊 Performance Report:', report);
    return report;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations(debugInfo, logSummary) {
    const recommendations = [];

    // Check for slow operations
    if (logSummary.slowOperations > 0) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: `${logSummary.slowOperations} slow operations detected. Consider optimizing these operations.`
      });
    }

    // Check average duration by type
    Object.entries(logSummary.byType).forEach(([type, data]) => {
      if (data.average > 1000) {
        recommendations.push({
          type: 'performance',
          priority: 'medium',
          message: `${type} operations averaging ${data.average.toFixed(0)}ms. Consider optimization.`
        });
      }
    });

    // Check alert frequency
    if (logSummary.alertsCount > 5) {
      recommendations.push({
        type: 'stability',
        priority: 'high',
        message: `High number of alerts (${logSummary.alertsCount}). Review error handling and performance.`
      });
    }

    return recommendations;
  }

  /**
   * Clear all performance data
   */
  clearData() {
    this.monitor.reset();
    this.logger.clearLogs();
    console.log('🧹 Performance data cleared');
  }

  /**
   * Export performance data
   */
  exportData(format = 'json') {
    const report = this.generateReport();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `discovery-performance-${timestamp}`;

    if (format === 'json') {
      this.downloadData(JSON.stringify(report, null, 2), `${filename}.json`, 'application/json');
    } else if (format === 'csv') {
      const csvData = this.logger.exportLogs('csv');
      this.downloadData(csvData, `${filename}.csv`, 'text/csv');
    }

    console.log(`📁 Performance data exported as ${format.toUpperCase()}`);
  }

  /**
   * Download data as file
   */
  downloadData(data, filename, mimeType) {
    if (typeof document === 'undefined') return;

    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Cleanup debugger
   */
  cleanup() {
    this.stopDebugging();
    this.monitor.cleanup();
    this.logger.cleanup();

    if (typeof window !== 'undefined') {
      delete window.discoveryPerformanceDebug;
    }
  }
}

// Create singleton instance
const discoveryPerformanceDebugger = new DiscoveryPerformanceDebugger();

export default discoveryPerformanceDebugger;