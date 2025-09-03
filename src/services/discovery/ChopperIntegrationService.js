/**
 * @fileoverview ChopperIntegrationService - Handles integration between Sample Discovery and Chopper
 * Provides URL copying, navigation helpers, and clear user guidance for chopper workflow integration
 */

/**
 * Service for handling integration between Sample Discovery and Chopper functionality
 * Provides methods for transferring YouTube URLs and navigating to chopper workflow
 */
export class ChopperIntegrationService {
  constructor() {
    this.baseChopperUrl = '/chopper';
  }

  /**
   * Transfers a sample to the chopper by copying URL and navigating
   * @param {import('../../types/discovery.js').SampleData} sample - Sample to transfer
   * @returns {Promise<{success: boolean, message: string, url?: string}>}
   */
  async transferSampleToChopper(sample) {
    try {
      if (!sample?.youtubeId) {
        throw new Error('Sample missing YouTube ID');
      }

      const youtubeUrl = this.buildYouTubeUrl(sample.youtubeId);
      const chopperUrl = this.buildChopperUrl(youtubeUrl, sample);

      // Attempt to copy URL to clipboard
      const copyResult = await this.copyUrlToClipboard(youtubeUrl);
      
      // Navigate to chopper regardless of clipboard success
      this.navigateToChopper(chopperUrl);

      return {
        success: true,
        message: copyResult.success 
          ? 'URL copied to clipboard and navigating to Chopper'
          : 'Navigating to Chopper (clipboard copy failed)',
        url: youtubeUrl
      };

    } catch (error) {
      console.error('Failed to transfer sample to chopper:', error);
      return {
        success: false,
        message: `Failed to transfer sample: ${error.message}`
      };
    }
  }

  /**
   * Builds YouTube URL from video ID
   * @param {string} youtubeId - YouTube video ID
   * @returns {string} Complete YouTube URL
   */
  buildYouTubeUrl(youtubeId) {
    if (!youtubeId) {
      throw new Error('YouTube ID is required');
    }
    return `https://www.youtube.com/watch?v=${youtubeId}`;
  }

  /**
   * Builds chopper URL with sample data
   * @param {string} youtubeUrl - YouTube URL to load
   * @param {import('../../types/discovery.js').SampleData} sample - Sample metadata
   * @returns {string} Chopper URL with parameters
   */
  buildChopperUrl(youtubeUrl, sample) {
    const params = new URLSearchParams();
    params.set('url', youtubeUrl);
    
    // Add sample metadata for better UX
    if (sample.title) params.set('title', sample.title);
    if (sample.artist) params.set('artist', sample.artist);
    if (sample.year) params.set('year', sample.year.toString());
    if (sample.genre) params.set('genre', sample.genre);
    
    return `${this.baseChopperUrl}?${params.toString()}`;
  }

  /**
   * Copies URL to clipboard with fallback handling
   * @param {string} url - URL to copy
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async copyUrlToClipboard(url) {
    try {
      // Modern clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        return {
          success: true,
          message: 'URL copied to clipboard'
        };
      }

      // Fallback for older browsers
      const result = this.fallbackCopyToClipboard(url);
      return result;

    } catch (error) {
      console.warn('Clipboard copy failed:', error);
      return {
        success: false,
        message: 'Failed to copy URL to clipboard'
      };
    }
  }

  /**
   * Fallback clipboard copy method for older browsers
   * @param {string} text - Text to copy
   * @returns {{success: boolean, message: string}}
   */
  fallbackCopyToClipboard(text) {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      return {
        success: successful,
        message: successful ? 'URL copied to clipboard' : 'Failed to copy URL'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Clipboard not supported'
      };
    }
  }

  /**
   * Navigates to chopper page
   * @param {string} chopperUrl - URL to navigate to
   */
  navigateToChopper(chopperUrl) {
    try {
      // Use window.location.href for full page navigation
      // This ensures the chopper page loads with the sample data
      window.location.href = chopperUrl;
    } catch (error) {
      console.error('Navigation failed:', error);
      // Fallback: try opening in new tab
      window.open(chopperUrl, '_blank');
    }
  }

  /**
   * Gets user guidance message for chopper integration
   * @param {import('../../types/discovery.js').SampleData} sample - Sample being transferred
   * @returns {string} User guidance message
   */
  getUserGuidanceMessage(sample) {
    return `Click "Use in Chopper" to copy the YouTube URL for "${sample.title}" and navigate to the Chopper page where you can create audio samples from this track.`;
  }

  /**
   * Validates if a sample can be transferred to chopper
   * @param {import('../../types/discovery.js').SampleData} sample - Sample to validate
   * @returns {{valid: boolean, message: string}}
   */
  validateSampleForTransfer(sample) {
    if (!sample) {
      return {
        valid: false,
        message: 'No sample provided'
      };
    }

    if (!sample.youtubeId) {
      return {
        valid: false,
        message: 'Sample missing YouTube ID'
      };
    }

    if (sample.isMock) {
      return {
        valid: true,
        message: 'Demo sample - will open YouTube directly'
      };
    }

    return {
      valid: true,
      message: 'Sample ready for chopper integration'
    };
  }

  /**
   * Creates a shareable link for the sample
   * @param {import('../../types/discovery.js').SampleData} sample - Sample to share
   * @returns {string} Shareable discovery URL
   */
  createShareableLink(sample) {
    const params = new URLSearchParams();
    params.set('sample', sample.id);
    return `${window.location.origin}/sample-discovery?${params.toString()}`;
  }
}

// Export singleton instance
export const chopperIntegrationService = new ChopperIntegrationService();
export default chopperIntegrationService;