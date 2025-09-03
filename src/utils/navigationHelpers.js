/**
 * @fileoverview Navigation helpers for Sample Discovery chopper integration
 * Provides utilities for URL handling, navigation, and user guidance
 */

/**
 * Navigation utilities for chopper integration
 */
export const NavigationHelpers = {
  /**
   * Safely navigates to a URL with fallback options
   * @param {string} url - URL to navigate to
   * @param {Object} options - Navigation options
   * @param {boolean} options.newTab - Open in new tab
   * @param {boolean} options.replace - Replace current history entry
   * @returns {boolean} Success status
   */
  navigateTo(url, options = {}) {
    try {
      if (options.newTab) {
        window.open(url, '_blank', 'noopener,noreferrer');
        return true;
      }

      if (options.replace) {
        window.location.replace(url);
        return true;
      }

      window.location.href = url;
      return true;
    } catch (error) {
      console.error('Navigation failed:', error);
      return false;
    }
  },

  /**
   * Builds URL with query parameters
   * @param {string} baseUrl - Base URL
   * @param {Object} params - Query parameters
   * @returns {string} Complete URL with parameters
   */
  buildUrlWithParams(baseUrl, params = {}) {
    const url = new URL(baseUrl, window.location.origin);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.set(key, value.toString());
      }
    });

    return url.toString();
  },

  /**
   * Extracts query parameters from current URL
   * @returns {Object} Query parameters object
   */
  getQueryParams() {
    const params = {};
    const searchParams = new URLSearchParams(window.location.search);
    
    for (const [key, value] of searchParams) {
      params[key] = value;
    }
    
    return params;
  },

  /**
   * Checks if navigation is supported
   * @returns {boolean} Navigation support status
   */
  isNavigationSupported() {
    return typeof window !== 'undefined' && 
           typeof window.location !== 'undefined';
  },

  /**
   * Gets current page URL
   * @returns {string} Current page URL
   */
  getCurrentUrl() {
    return window.location.href;
  },

  /**
   * Checks if URL is valid
   * @param {string} url - URL to validate
   * @returns {boolean} Validation result
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * URL copying utilities
 */
export const UrlCopyHelpers = {
  /**
   * Copies text to clipboard with multiple fallback methods
   * @param {string} text - Text to copy
   * @returns {Promise<{success: boolean, method: string, error?: string}>}
   */
  async copyToClipboard(text) {
    // Method 1: Modern Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return { success: true, method: 'clipboard-api' };
      } catch (error) {
        console.warn('Clipboard API failed:', error);
      }
    }

    // Method 2: execCommand fallback
    try {
      const result = this.execCommandCopy(text);
      if (result) {
        return { success: true, method: 'exec-command' };
      }
    } catch (error) {
      console.warn('execCommand copy failed:', error);
    }

    // Method 3: Manual selection fallback
    try {
      this.selectText(text);
      return { success: true, method: 'manual-selection' };
    } catch (error) {
      console.warn('Manual selection failed:', error);
    }

    return { 
      success: false, 
      method: 'none', 
      error: 'All copy methods failed' 
    };
  },

  /**
   * Copy using execCommand (fallback for older browsers)
   * @param {string} text - Text to copy
   * @returns {boolean} Success status
   */
  execCommandCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.setAttribute('readonly', '');
    
    document.body.appendChild(textArea);
    textArea.select();
    textArea.setSelectionRange(0, 99999);
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    return successful;
  },

  /**
   * Select text for manual copying
   * @param {string} text - Text to select
   */
  selectText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '50%';
    textArea.style.top = '50%';
    textArea.style.transform = 'translate(-50%, -50%)';
    textArea.style.padding = '10px';
    textArea.style.border = '2px solid #007bff';
    textArea.style.borderRadius = '4px';
    textArea.style.backgroundColor = 'white';
    textArea.style.color = 'black';
    textArea.style.zIndex = '10000';
    textArea.setAttribute('readonly', '');
    
    document.body.appendChild(textArea);
    textArea.select();
    textArea.setSelectionRange(0, 99999);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (document.body.contains(textArea)) {
        document.body.removeChild(textArea);
      }
    }, 5000);
  },

  /**
   * Checks if clipboard operations are supported
   * @returns {boolean} Clipboard support status
   */
  isClipboardSupported() {
    return !!(navigator.clipboard || document.execCommand);
  }
};

/**
 * User guidance utilities
 */
export const UserGuidanceHelpers = {
  /**
   * Gets appropriate guidance message based on context
   * @param {string} action - Action being performed
   * @param {Object} context - Additional context
   * @returns {string} Guidance message
   */
  getGuidanceMessage(action, context = {}) {
    const messages = {
      'use-in-chopper': `Click "Use in Chopper" to copy the YouTube URL and navigate to the Chopper page where you can create audio samples.`,
      'copy-url': 'URL copied to clipboard! You can now paste it in the Chopper page.',
      'copy-failed': 'Could not copy URL automatically. The URL will be available in the Chopper page.',
      'navigation-failed': 'Could not navigate automatically. Please manually go to the Chopper page.',
      'sample-invalid': 'This sample cannot be used in Chopper. Please select a different sample.',
      'offline-mode': 'You are offline. Some features may not work as expected.'
    };

    return messages[action] || 'No guidance available for this action.';
  },

  /**
   * Creates user guidance for chopper integration workflow
   * @param {import('../types/discovery.js').SampleData} sample - Sample being transferred
   * @returns {Object} Guidance object with steps and messages
   */
  createChopperIntegrationGuidance(sample) {
    return {
      title: 'Using Sample in Chopper',
      steps: [
        {
          step: 1,
          title: 'Copy YouTube URL',
          description: `The YouTube URL for "${sample.title}" will be copied to your clipboard.`,
          status: 'pending'
        },
        {
          step: 2,
          title: 'Navigate to Chopper',
          description: 'You will be automatically redirected to the Chopper page.',
          status: 'pending'
        },
        {
          step: 3,
          title: 'Load Sample',
          description: 'The sample will be automatically loaded in the Chopper interface.',
          status: 'pending'
        },
        {
          step: 4,
          title: 'Create Audio Samples',
          description: 'Use the Chopper tools to create audio samples from the track.',
          status: 'pending'
        }
      ],
      tips: [
        'Make sure you have a stable internet connection for the best experience.',
        'The YouTube URL will be available in your clipboard for manual use if needed.',
        'You can return to Sample Discovery anytime to find more samples.'
      ]
    };
  },

  /**
   * Formats sample information for user display
   * @param {import('../types/discovery.js').SampleData} sample - Sample to format
   * @returns {string} Formatted sample information
   */
  formatSampleInfo(sample) {
    const parts = [];
    
    if (sample.title) parts.push(sample.title);
    if (sample.artist) parts.push(`by ${sample.artist}`);
    if (sample.year) parts.push(`(${sample.year})`);
    if (sample.genre) parts.push(sample.genre);

    return parts.join(' ');
  }
};

export default {
  NavigationHelpers,
  UrlCopyHelpers,
  UserGuidanceHelpers
};