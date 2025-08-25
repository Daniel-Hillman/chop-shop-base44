/**
 * Analytics service for tracking waveform usage patterns and performance metrics
 */
class WaveformAnalytics {
  constructor() {
    this.sessionId = this._generateSessionId();
    this.events = [];
    this.performanceMetrics = new Map();
    this.userBehaviorPatterns = new Map();
    this.isEnabled = this._checkAnalyticsConsent();
  }

  /**
   * Track waveform interaction events
   */
  trackEvent(eventType, eventData = {}) {
    if (!this.isEnabled) return;

    const event = {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      type: eventType,
      data: {
        ...eventData,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    };

    this.events.push(event);
    this._processEvent(event);

    // Batch send events to prevent performance impact
    if (this.events.length >= 10) {
      this._flushEvents();
    }
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metricName, value, metadata = {}) {
    if (!this.isEnabled) return;

    const metric = {
      name: metricName,
      value,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      metadata
    };

    if (!this.performanceMetrics.has(metricName)) {
      this.performanceMetrics.set(metricName, []);
    }

    this.performanceMetrics.get(metricName).push(metric);
    
    // Track performance trends
    this._analyzePerformanceTrend(metricName, value);
  }

  /**
   * Track waveform generation performance
   */
  trackWaveformGeneration(analysisMethod, duration, audioLength, quality) {
    this.trackEvent('waveform_generation', {
      analysisMethod,
      generationTime: duration,
      audioLength,
      quality,
      efficiency: audioLength / duration // seconds of audio per second of processing
    });

    this.trackPerformance('waveform_generation_time', duration, {
      analysisMethod,
      audioLength,
      quality
    });
  }

  /**
   * Track user interaction patterns
   */
  trackInteraction(interactionType, details = {}) {
    this.trackEvent('waveform_interaction', {
      interactionType,
      ...details
    });

    // Update behavior patterns
    const patternKey = `interaction_${interactionType}`;
    const currentCount = this.userBehaviorPatterns.get(patternKey) || 0;
    this.userBehaviorPatterns.set(patternKey, currentCount + 1);
  }

  /**
   * Track chop creation and editing patterns
   */
  trackChopActivity(activity, chopData = {}) {
    this.trackEvent('chop_activity', {
      activity, // 'create', 'edit', 'delete', 'play'
      chopDuration: chopData.duration,
      chopPosition: chopData.startTime,
      creationMethod: chopData.creationMethod, // 'click', 'drag', 'keyboard'
      snapUsed: chopData.snapUsed || false
    });
  }

  /**
   * Track zoom and navigation usage
   */
  trackNavigation(action, zoomLevel, timeRange) {
    this.trackEvent('waveform_navigation', {
      action, // 'zoom_in', 'zoom_out', 'pan', 'seek'
      zoomLevel,
      timeRange: {
        start: timeRange.start,
        end: timeRange.end,
        duration: timeRange.end - timeRange.start
      }
    });
  }

  /**
   * Track error occurrences and recovery
   */
  trackError(errorType, errorMessage, context = {}) {
    this.trackEvent('waveform_error', {
      errorType,
      errorMessage,
      context,
      recoveryAttempted: context.recoveryAttempted || false,
      recoverySuccessful: context.recoverySuccessful || false
    });
  }

  /**
   * Track feature usage and adoption
   */
  trackFeatureUsage(featureName, usageContext = {}) {
    this.trackEvent('feature_usage', {
      featureName,
      ...usageContext
    });

    // Update feature adoption metrics
    const adoptionKey = `feature_${featureName}`;
    const currentUsage = this.userBehaviorPatterns.get(adoptionKey) || 0;
    this.userBehaviorPatterns.set(adoptionKey, currentUsage + 1);
  }

  /**
   * Get analytics summary for debugging and optimization
   */
  getAnalyticsSummary() {
    return {
      sessionId: this.sessionId,
      totalEvents: this.events.length,
      performanceMetrics: Object.fromEntries(
        Array.from(this.performanceMetrics.entries()).map(([key, values]) => [
          key,
          {
            count: values.length,
            average: values.reduce((sum, v) => sum + v.value, 0) / values.length,
            latest: values[values.length - 1]?.value
          }
        ])
      ),
      userBehaviorPatterns: Object.fromEntries(this.userBehaviorPatterns),
      topInteractions: this._getTopInteractions(),
      performanceTrends: this._getPerformanceTrends()
    };
  }

  /**
   * Export analytics data for analysis
   */
  exportAnalyticsData() {
    if (!this.isEnabled) return null;

    return {
      sessionId: this.sessionId,
      events: this.events,
      performanceMetrics: Object.fromEntries(this.performanceMetrics),
      userBehaviorPatterns: Object.fromEntries(this.userBehaviorPatterns),
      exportedAt: Date.now()
    };
  }

  // Private methods
  _generateSessionId() {
    return `waveform_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  _checkAnalyticsConsent() {
    // Check for user consent (implement based on your privacy policy)
    return localStorage.getItem('waveform_analytics_consent') === 'true';
  }

  _processEvent(event) {
    // Process event for real-time insights
    switch (event.type) {
      case 'waveform_generation':
        this._analyzeGenerationPerformance(event.data);
        break;
      case 'waveform_interaction':
        this._analyzeInteractionPattern(event.data);
        break;
      case 'waveform_error':
        this._analyzeErrorPattern(event.data);
        break;
    }
  }

  _analyzeGenerationPerformance(data) {
    // Analyze if generation performance is degrading
    const recentGenerations = this.events
      .filter(e => e.type === 'waveform_generation')
      .slice(-5);

    if (recentGenerations.length >= 3) {
      const avgTime = recentGenerations.reduce((sum, e) => sum + e.data.generationTime, 0) / recentGenerations.length;
      
      if (avgTime > 5000) { // More than 5 seconds
        console.warn('Waveform generation performance degrading:', avgTime);
      }
    }
  }

  _analyzeInteractionPattern(data) {
    // Analyze user interaction patterns for UX insights
    const interactionType = data.interactionType;
    const recentInteractions = this.events
      .filter(e => e.type === 'waveform_interaction' && e.data.interactionType === interactionType)
      .slice(-10);

    // Track interaction frequency
    if (recentInteractions.length >= 5) {
      const timeSpan = recentInteractions[recentInteractions.length - 1].timestamp - recentInteractions[0].timestamp;
      const frequency = recentInteractions.length / (timeSpan / 1000); // interactions per second
      
      if (frequency > 2) { // More than 2 interactions per second might indicate confusion
        console.log(`High frequency ${interactionType} interactions detected:`, frequency);
      }
    }
  }

  _analyzeErrorPattern(data) {
    // Analyze error patterns for stability insights
    const errorType = data.errorType;
    const recentErrors = this.events
      .filter(e => e.type === 'waveform_error' && e.data.errorType === errorType)
      .slice(-5);

    if (recentErrors.length >= 3) {
      console.warn(`Recurring ${errorType} errors detected:`, recentErrors.length);
    }
  }

  _analyzePerformanceTrend(metricName, value) {
    const metrics = this.performanceMetrics.get(metricName) || [];
    if (metrics.length >= 5) {
      const recent = metrics.slice(-5);
      const trend = recent[recent.length - 1].value - recent[0].value;
      
      if (Math.abs(trend) > value * 0.5) { // 50% change
        console.log(`Performance trend detected for ${metricName}:`, trend > 0 ? 'degrading' : 'improving');
      }
    }
  }

  _getTopInteractions() {
    const interactions = Array.from(this.userBehaviorPatterns.entries())
      .filter(([key]) => key.startsWith('interaction_'))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    return interactions.map(([key, count]) => ({
      interaction: key.replace('interaction_', ''),
      count
    }));
  }

  _getPerformanceTrends() {
    const trends = {};
    
    for (const [metricName, values] of this.performanceMetrics.entries()) {
      if (values.length >= 3) {
        const recent = values.slice(-3);
        const trend = recent[recent.length - 1].value - recent[0].value;
        trends[metricName] = {
          trend: trend > 0 ? 'increasing' : 'decreasing',
          magnitude: Math.abs(trend),
          latest: recent[recent.length - 1].value
        };
      }
    }
    
    return trends;
  }

  _flushEvents() {
    // In a real implementation, send events to analytics service
    console.log('Flushing analytics events:', this.events.length);
    
    // Clear events after sending
    this.events = [];
  }
}

// Singleton instance
export const waveformAnalytics = new WaveformAnalytics();

/**
 * React hook for analytics tracking
 */
export const useWaveformAnalytics = () => {
  return {
    trackEvent: waveformAnalytics.trackEvent.bind(waveformAnalytics),
    trackPerformance: waveformAnalytics.trackPerformance.bind(waveformAnalytics),
    trackInteraction: waveformAnalytics.trackInteraction.bind(waveformAnalytics),
    trackChopActivity: waveformAnalytics.trackChopActivity.bind(waveformAnalytics),
    trackNavigation: waveformAnalytics.trackNavigation.bind(waveformAnalytics),
    trackError: waveformAnalytics.trackError.bind(waveformAnalytics),
    trackFeatureUsage: waveformAnalytics.trackFeatureUsage.bind(waveformAnalytics),
    getSummary: waveformAnalytics.getAnalyticsSummary.bind(waveformAnalytics)
  };
};