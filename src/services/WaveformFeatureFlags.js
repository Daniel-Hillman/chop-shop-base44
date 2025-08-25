/**
 * Feature flags system for gradual rollout of waveform capabilities
 */

import React from 'react';

/**
 * Default feature flag configuration
 */
const DEFAULT_FLAGS = {
  // Core waveform features
  waveformVisualization: {
    enabled: true,
    rolloutPercentage: 100,
    description: 'Basic waveform visualization'
  },
  
  // Advanced analysis features
  webAudioAnalysis: {
    enabled: true,
    rolloutPercentage: 90,
    description: 'Web Audio API based analysis',
    requirements: ['webAudioSupport']
  },
  
  videoFrameAnalysis: {
    enabled: true,
    rolloutPercentage: 80,
    description: 'Video frame based audio analysis fallback',
    requirements: ['canvasSupport']
  },
  
  // Interactive features
  dragChopCreation: {
    enabled: true,
    rolloutPercentage: 95,
    description: 'Drag-based chop creation and editing'
  },
  
  zeroCrossingDetection: {
    enabled: true,
    rolloutPercentage: 70,
    description: 'Zero-crossing detection for clean cuts',
    requirements: ['webAudioSupport']
  },
  
  smartSnapping: {
    enabled: true,
    rolloutPercentage: 75,
    description: 'Smart snapping to optimal cut points',
    requirements: ['zeroCrossingDetection']
  },
  
  // Visual enhancements
  visualEnhancements: {
    enabled: true,
    rolloutPercentage: 60,
    description: 'Advanced visual enhancements and color coding',
    requirements: ['highPerformanceDevice']
  },
  
  frequencyAnalysis: {
    enabled: false,
    rolloutPercentage: 30,
    description: 'Real-time frequency analysis visualization',
    requirements: ['webAudioSupport', 'highPerformanceDevice']
  },
  
  // Performance features
  webWorkerAnalysis: {
    enabled: true,
    rolloutPercentage: 85,
    description: 'Background audio analysis using Web Workers',
    requirements: ['webWorkerSupport']
  },
  
  offscreenCanvas: {
    enabled: true,
    rolloutPercentage: 50,
    description: 'Offscreen canvas rendering for better performance',
    requirements: ['offscreenCanvasSupport']
  },
  
  // Experimental features
  audioWorkletAnalysis: {
    enabled: false,
    rolloutPercentage: 10,
    description: 'AudioWorklet-based real-time analysis',
    requirements: ['audioWorkletSupport', 'experimentalFeatures']
  },
  
  aiPoweredChopSuggestions: {
    enabled: false,
    rolloutPercentage: 5,
    description: 'AI-powered chop suggestions based on musical structure',
    requirements: ['experimentalFeatures', 'highPerformanceDevice']
  },
  
  // Debug and development features
  performanceMonitoring: {
    enabled: process.env.NODE_ENV === 'production',
    rolloutPercentage: 100,
    description: 'Performance monitoring and analytics'
  },
  
  debugVisualization: {
    enabled: process.env.NODE_ENV === 'development',
    rolloutPercentage: 100,
    description: 'Debug visualization overlays'
  }
};

/**
 * Feature flags manager
 */
class WaveformFeatureFlags {
  constructor() {
    this.flags = { ...DEFAULT_FLAGS };
    this.userSegment = this._determineUserSegment();
    this.deviceCapabilities = this._detectDeviceCapabilities();
    this.overrides = this._loadOverrides();
    
    // Apply overrides
    this._applyOverrides();
  }

  /**
   * Check if a feature is enabled for the current user
   */
  isEnabled(featureName) {
    const flag = this.flags[featureName];
    
    if (!flag) {
      console.warn(`Unknown feature flag: ${featureName}`);
      return false;
    }

    // Check if feature is globally disabled
    if (!flag.enabled) {
      return false;
    }

    // Check requirements
    if (flag.requirements && !this._checkRequirements(flag.requirements)) {
      return false;
    }

    // Check rollout percentage
    if (!this._isInRollout(featureName, flag.rolloutPercentage)) {
      return false;
    }

    return true;
  }

  /**
   * Get all enabled features
   */
  getEnabledFeatures() {
    return Object.keys(this.flags).filter(featureName => 
      this.isEnabled(featureName)
    );
  }

  /**
   * Get feature flag details
   */
  getFeatureDetails(featureName) {
    const flag = this.flags[featureName];
    
    if (!flag) {
      return null;
    }

    return {
      ...flag,
      isEnabled: this.isEnabled(featureName),
      requirementsMet: flag.requirements ? 
        this._checkRequirements(flag.requirements) : true,
      inRollout: this._isInRollout(featureName, flag.rolloutPercentage)
    };
  }

  /**
   * Override feature flag for testing/debugging
   */
  override(featureName, enabled) {
    if (!this.flags[featureName]) {
      console.warn(`Cannot override unknown feature: ${featureName}`);
      return;
    }

    this.overrides[featureName] = enabled;
    this._saveOverrides();
    
    console.log(`Feature flag override: ${featureName} = ${enabled}`);
  }

  /**
   * Clear all overrides
   */
  clearOverrides() {
    this.overrides = {};
    this._saveOverrides();
    console.log('All feature flag overrides cleared');
  }

  /**
   * Get feature flags summary for debugging
   */
  getSummary() {
    const enabledFeatures = this.getEnabledFeatures();
    const totalFeatures = Object.keys(this.flags).length;
    
    return {
      userSegment: this.userSegment,
      deviceCapabilities: this.deviceCapabilities,
      enabledFeatures,
      totalFeatures,
      enabledCount: enabledFeatures.length,
      overrides: this.overrides,
      flagDetails: Object.fromEntries(
        Object.keys(this.flags).map(name => [
          name, 
          this.getFeatureDetails(name)
        ])
      )
    };
  }

  // Private methods
  _determineUserSegment() {
    // Determine user segment for A/B testing
    const userId = this._getUserId();
    const hash = this._hashString(userId);
    
    // Segment users into groups
    const segmentValue = hash % 100;
    
    if (segmentValue < 10) return 'early_adopters';
    if (segmentValue < 30) return 'beta_users';
    if (segmentValue < 80) return 'regular_users';
    return 'conservative_users';
  }

  _detectDeviceCapabilities() {
    return {
      webAudioSupport: 'AudioContext' in window || 'webkitAudioContext' in window,
      webWorkerSupport: 'Worker' in window,
      offscreenCanvasSupport: 'OffscreenCanvas' in window,
      audioWorkletSupport: 'AudioWorklet' in window,
      canvasSupport: 'HTMLCanvasElement' in window,
      highPerformanceDevice: this._isHighPerformanceDevice(),
      experimentalFeatures: this._allowExperimentalFeatures()
    };
  }

  _isHighPerformanceDevice() {
    // Detect high-performance devices
    const hardwareConcurrency = navigator.hardwareConcurrency || 2;
    const deviceMemory = navigator.deviceMemory || 2;
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    return hardwareConcurrency >= 4 && deviceMemory >= 4 && !isMobile;
  }

  _allowExperimentalFeatures() {
    // Allow experimental features for developers and early adopters
    return process.env.NODE_ENV === 'development' || 
           this.userSegment === 'early_adopters' ||
           localStorage.getItem('waveform_experimental_features') === 'true';
  }

  _checkRequirements(requirements) {
    return requirements.every(requirement => {
      if (requirement in this.deviceCapabilities) {
        return this.deviceCapabilities[requirement];
      }
      
      // Check for feature dependencies
      if (requirement in this.flags) {
        return this.isEnabled(requirement);
      }
      
      console.warn(`Unknown requirement: ${requirement}`);
      return false;
    });
  }

  _isInRollout(featureName, rolloutPercentage) {
    if (rolloutPercentage >= 100) return true;
    if (rolloutPercentage <= 0) return false;
    
    // Use consistent hash for stable rollout
    const userId = this._getUserId();
    const featureHash = this._hashString(`${userId}_${featureName}`);
    const userPercentile = featureHash % 100;
    
    return userPercentile < rolloutPercentage;
  }

  _getUserId() {
    // Generate or retrieve stable user ID
    let userId = localStorage.getItem('waveform_user_id');
    
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('waveform_user_id', userId);
    }
    
    return userId;
  }

  _hashString(str) {
    // Simple hash function for consistent user segmentation
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  _loadOverrides() {
    try {
      const overrides = localStorage.getItem('waveform_feature_overrides');
      return overrides ? JSON.parse(overrides) : {};
    } catch (error) {
      console.warn('Failed to load feature flag overrides:', error);
      return {};
    }
  }

  _saveOverrides() {
    try {
      localStorage.setItem('waveform_feature_overrides', JSON.stringify(this.overrides));
    } catch (error) {
      console.warn('Failed to save feature flag overrides:', error);
    }
  }

  _applyOverrides() {
    for (const [featureName, enabled] of Object.entries(this.overrides)) {
      if (this.flags[featureName]) {
        this.flags[featureName].enabled = enabled;
      }
    }
  }
}

// Singleton instance
export const waveformFeatureFlags = new WaveformFeatureFlags();

/**
 * React hook for using feature flags
 */
export const useWaveformFeatureFlag = (featureName) => {
  const [isEnabled, setIsEnabled] = React.useState(
    waveformFeatureFlags.isEnabled(featureName)
  );

  React.useEffect(() => {
    // Re-check feature flag if overrides change
    const checkFlag = () => {
      setIsEnabled(waveformFeatureFlags.isEnabled(featureName));
    };

    // Listen for storage changes (overrides from other tabs)
    window.addEventListener('storage', checkFlag);
    
    return () => {
      window.removeEventListener('storage', checkFlag);
    };
  }, [featureName]);

  return isEnabled;
};

/**
 * Higher-order component for feature flag gating
 */
export const withFeatureFlag = (featureName, FallbackComponent = null) => {
  return (WrappedComponent) => {
    return (props) => {
      const isEnabled = useWaveformFeatureFlag(featureName);
      
      if (!isEnabled) {
        return FallbackComponent ? React.createElement(FallbackComponent, props) : null;
      }
      
      return React.createElement(WrappedComponent, props);
    };
  };
};

/**
 * Feature flag debugging utilities
 */
export const debugFeatureFlags = () => {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('Feature flag debugging only available in development');
    return;
  }

  console.group('Waveform Feature Flags Debug');
  console.log('Summary:', waveformFeatureFlags.getSummary());
  console.log('Enabled features:', waveformFeatureFlags.getEnabledFeatures());
  console.groupEnd();

  // Add global debug functions
  window.waveformFeatureFlags = {
    isEnabled: waveformFeatureFlags.isEnabled.bind(waveformFeatureFlags),
    override: waveformFeatureFlags.override.bind(waveformFeatureFlags),
    clearOverrides: waveformFeatureFlags.clearOverrides.bind(waveformFeatureFlags),
    getSummary: waveformFeatureFlags.getSummary.bind(waveformFeatureFlags)
  };

  console.log('Debug functions available at window.waveformFeatureFlags');
};