/**
 * @fileoverview useChopperIntegration hook - Manages chopper integration functionality
 * Provides state management and methods for transferring samples to chopper workflow
 */

import { useState, useCallback } from 'react';
import { chopperIntegrationService } from '../services/discovery/ChopperIntegrationService.js';

/**
 * Hook for managing chopper integration functionality
 * @returns {Object} Chopper integration state and methods
 */
export const useChopperIntegration = () => {
  const [transferStatus, setTransferStatus] = useState({
    inProgress: false,
    success: false,
    message: null,
    error: null,
    lastTransferredSample: null
  });

  const [showGuide, setShowGuide] = useState(false);
  const [currentSample, setCurrentSample] = useState(null);

  /**
   * Resets transfer status
   */
  const resetTransferStatus = useCallback(() => {
    setTransferStatus({
      inProgress: false,
      success: false,
      message: null,
      error: null,
      lastTransferredSample: null
    });
  }, []);

  /**
   * Shows the integration guide for a sample
   * @param {import('../types/discovery.js').SampleData} sample - Sample to show guide for
   */
  const showIntegrationGuide = useCallback((sample) => {
    setCurrentSample(sample);
    setShowGuide(true);
    resetTransferStatus();
  }, [resetTransferStatus]);

  /**
   * Hides the integration guide
   */
  const hideIntegrationGuide = useCallback(() => {
    setShowGuide(false);
    setCurrentSample(null);
    // Don't reset transfer status immediately to allow user to see final state
  }, []);

  /**
   * Transfers a sample to chopper
   * @param {import('../types/discovery.js').SampleData} sample - Sample to transfer
   * @returns {Promise<{success: boolean, message: string, url?: string}>}
   */
  const transferSampleToChopper = useCallback(async (sample) => {
    // Validate sample first
    const validation = chopperIntegrationService.validateSampleForTransfer(sample);
    if (!validation.valid) {
      const error = validation.message;
      setTransferStatus({
        inProgress: false,
        success: false,
        message: null,
        error,
        lastTransferredSample: null
      });
      return { success: false, message: error };
    }

    // Set loading state
    setTransferStatus({
      inProgress: true,
      success: false,
      message: 'Preparing to transfer sample...',
      error: null,
      lastTransferredSample: sample
    });

    try {
      // Perform the transfer
      const result = await chopperIntegrationService.transferSampleToChopper(sample);

      // Update status based on result
      setTransferStatus({
        inProgress: false,
        success: result.success,
        message: result.message,
        error: result.success ? null : result.message,
        lastTransferredSample: sample
      });

      return result;

    } catch (error) {
      const errorMessage = `Transfer failed: ${error.message}`;
      
      setTransferStatus({
        inProgress: false,
        success: false,
        message: null,
        error: errorMessage,
        lastTransferredSample: sample
      });

      return { success: false, message: errorMessage };
    }
  }, []);

  /**
   * Quick transfer without showing guide
   * @param {import('../types/discovery.js').SampleData} sample - Sample to transfer
   * @returns {Promise<{success: boolean, message: string, url?: string}>}
   */
  const quickTransferToChopper = useCallback(async (sample) => {
    return await transferSampleToChopper(sample);
  }, [transferSampleToChopper]);

  /**
   * Copies sample URL to clipboard
   * @param {import('../types/discovery.js').SampleData} sample - Sample to copy URL for
   * @returns {Promise<{success: boolean, message: string}>}
   */
  const copySampleUrl = useCallback(async (sample) => {
    if (!sample?.youtubeId) {
      return { success: false, message: 'Sample missing YouTube ID' };
    }

    const youtubeUrl = chopperIntegrationService.buildYouTubeUrl(sample.youtubeId);
    return await chopperIntegrationService.copyUrlToClipboard(youtubeUrl);
  }, []);

  /**
   * Gets user guidance message for a sample
   * @param {import('../types/discovery.js').SampleData} sample - Sample to get guidance for
   * @returns {string} Guidance message
   */
  const getUserGuidance = useCallback((sample) => {
    return chopperIntegrationService.getUserGuidanceMessage(sample);
  }, []);

  /**
   * Validates if a sample can be transferred
   * @param {import('../types/discovery.js').SampleData} sample - Sample to validate
   * @returns {{valid: boolean, message: string}}
   */
  const validateSample = useCallback((sample) => {
    return chopperIntegrationService.validateSampleForTransfer(sample);
  }, []);

  /**
   * Creates a shareable link for a sample
   * @param {import('../types/discovery.js').SampleData} sample - Sample to create link for
   * @returns {string} Shareable link
   */
  const createShareableLink = useCallback((sample) => {
    return chopperIntegrationService.createShareableLink(sample);
  }, []);

  /**
   * Builds chopper URL for a sample
   * @param {import('../types/discovery.js').SampleData} sample - Sample to build URL for
   * @returns {string} Chopper URL
   */
  const buildChopperUrl = useCallback((sample) => {
    if (!sample?.youtubeId) return null;
    
    const youtubeUrl = chopperIntegrationService.buildYouTubeUrl(sample.youtubeId);
    return chopperIntegrationService.buildChopperUrl(youtubeUrl, sample);
  }, []);

  return {
    // State
    transferStatus,
    showGuide,
    currentSample,

    // Actions
    transferSampleToChopper,
    quickTransferToChopper,
    copySampleUrl,
    showIntegrationGuide,
    hideIntegrationGuide,
    resetTransferStatus,

    // Utilities
    getUserGuidance,
    validateSample,
    createShareableLink,
    buildChopperUrl
  };
};

export default useChopperIntegration;