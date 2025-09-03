/**
 * @fileoverview Unit tests for useChopperIntegration hook
 * Tests chopper integration functionality including URL transfer and navigation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChopperIntegration } from '../useChopperIntegration.js';

// Mock the ChopperIntegrationService
vi.mock('../../services/discovery/ChopperIntegrationService.js', () => ({
  chopperIntegrationService: {
    transferSampleToChopper: vi.fn(),
    validateSampleForTransfer: vi.fn(),
    getUserGuidanceMessage: vi.fn(),
    createShareableLink: vi.fn(),
    buildYouTubeUrl: vi.fn(),
    buildChopperUrl: vi.fn(),
    copyUrlToClipboard: vi.fn()
  }
}));

import { chopperIntegrationService } from '../../services/discovery/ChopperIntegrationService.js';

describe('useChopperIntegration', () => {
  let mockSample;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSample = {
      id: 'test-sample',
      title: 'Test Song',
      artist: 'Test Artist',
      year: 2023,
      genre: 'Funk',
      youtubeId: 'test123',
      thumbnailUrl: 'https://img.youtube.com/vi/test123/mqdefault.jpg',
      duration: 180,
      isMock: false
    };

    // Setup default mock responses
    chopperIntegrationService.validateSampleForTransfer.mockReturnValue({
      valid: true,
      message: 'Sample ready for chopper integration'
    });

    chopperIntegrationService.transferSampleToChopper.mockResolvedValue({
      success: true,
      message: 'URL copied to clipboard and navigating to Chopper',
      url: 'https://www.youtube.com/watch?v=test123'
    });

    chopperIntegrationService.getUserGuidanceMessage.mockReturnValue(
      'Click "Use in Chopper" to copy the YouTube URL and navigate to the Chopper page.'
    );

    chopperIntegrationService.createShareableLink.mockReturnValue(
      'http://localhost:3000/sample-discovery?sample=test-sample'
    );

    chopperIntegrationService.buildYouTubeUrl.mockReturnValue(
      'https://www.youtube.com/watch?v=test123'
    );

    chopperIntegrationService.buildChopperUrl.mockReturnValue(
      '/chopper?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dtest123&title=Test+Song'
    );

    chopperIntegrationService.copyUrlToClipboard.mockResolvedValue({
      success: true,
      message: 'URL copied to clipboard'
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useChopperIntegration());

      expect(result.current.transferStatus).toEqual({
        inProgress: false,
        success: false,
        message: null,
        error: null,
        lastTransferredSample: null
      });

      expect(result.current.showGuide).toBe(false);
      expect(result.current.currentSample).toBe(null);
    });
  });

  describe('showIntegrationGuide', () => {
    it('should show guide with sample and reset transfer status', () => {
      const { result } = renderHook(() => useChopperIntegration());

      act(() => {
        result.current.showIntegrationGuide(mockSample);
      });

      expect(result.current.showGuide).toBe(true);
      expect(result.current.currentSample).toEqual(mockSample);
      expect(result.current.transferStatus).toEqual({
        inProgress: false,
        success: false,
        message: null,
        error: null,
        lastTransferredSample: null
      });
    });
  });

  describe('hideIntegrationGuide', () => {
    it('should hide guide and clear current sample', () => {
      const { result } = renderHook(() => useChopperIntegration());

      // First show the guide
      act(() => {
        result.current.showIntegrationGuide(mockSample);
      });

      // Then hide it
      act(() => {
        result.current.hideIntegrationGuide();
      });

      expect(result.current.showGuide).toBe(false);
      expect(result.current.currentSample).toBe(null);
    });
  });

  describe('transferSampleToChopper', () => {
    it('should successfully transfer sample', async () => {
      const { result } = renderHook(() => useChopperIntegration());

      let transferResult;
      await act(async () => {
        transferResult = await result.current.transferSampleToChopper(mockSample);
      });

      expect(chopperIntegrationService.validateSampleForTransfer).toHaveBeenCalledWith(mockSample);
      expect(chopperIntegrationService.transferSampleToChopper).toHaveBeenCalledWith(mockSample);
      
      expect(transferResult).toEqual({
        success: true,
        message: 'URL copied to clipboard and navigating to Chopper',
        url: 'https://www.youtube.com/watch?v=test123'
      });

      expect(result.current.transferStatus).toEqual({
        inProgress: false,
        success: true,
        message: 'URL copied to clipboard and navigating to Chopper',
        error: null,
        lastTransferredSample: mockSample
      });
    });

    it('should handle validation failure', async () => {
      chopperIntegrationService.validateSampleForTransfer.mockReturnValue({
        valid: false,
        message: 'Sample missing YouTube ID'
      });

      const { result } = renderHook(() => useChopperIntegration());

      let transferResult;
      await act(async () => {
        transferResult = await result.current.transferSampleToChopper(mockSample);
      });

      expect(transferResult).toEqual({
        success: false,
        message: 'Sample missing YouTube ID'
      });

      expect(result.current.transferStatus).toEqual({
        inProgress: false,
        success: false,
        message: null,
        error: 'Sample missing YouTube ID',
        lastTransferredSample: null
      });

      expect(chopperIntegrationService.transferSampleToChopper).not.toHaveBeenCalled();
    });

    it('should handle transfer service failure', async () => {
      chopperIntegrationService.transferSampleToChopper.mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(() => useChopperIntegration());

      let transferResult;
      await act(async () => {
        transferResult = await result.current.transferSampleToChopper(mockSample);
      });

      expect(transferResult).toEqual({
        success: false,
        message: 'Transfer failed: Network error'
      });

      expect(result.current.transferStatus).toEqual({
        inProgress: false,
        success: false,
        message: null,
        error: 'Transfer failed: Network error',
        lastTransferredSample: mockSample
      });
    });

    it('should show loading state during transfer', async () => {
      // Make the service return a promise that we can control
      let resolveTransfer;
      const transferPromise = new Promise((resolve) => {
        resolveTransfer = resolve;
      });
      chopperIntegrationService.transferSampleToChopper.mockReturnValue(transferPromise);

      const { result } = renderHook(() => useChopperIntegration());

      // Start the transfer
      act(() => {
        result.current.transferSampleToChopper(mockSample);
      });

      // Check loading state
      expect(result.current.transferStatus.inProgress).toBe(true);
      expect(result.current.transferStatus.message).toBe('Preparing to transfer sample...');

      // Resolve the transfer
      await act(async () => {
        resolveTransfer({
          success: true,
          message: 'Transfer completed',
          url: 'https://www.youtube.com/watch?v=test123'
        });
        await transferPromise;
      });

      // Check final state
      expect(result.current.transferStatus.inProgress).toBe(false);
      expect(result.current.transferStatus.success).toBe(true);
    });
  });

  describe('quickTransferToChopper', () => {
    it('should perform quick transfer without showing guide', async () => {
      const { result } = renderHook(() => useChopperIntegration());

      let transferResult;
      await act(async () => {
        transferResult = await result.current.quickTransferToChopper(mockSample);
      });

      expect(chopperIntegrationService.transferSampleToChopper).toHaveBeenCalledWith(mockSample);
      expect(transferResult).toEqual({
        success: true,
        message: 'URL copied to clipboard and navigating to Chopper',
        url: 'https://www.youtube.com/watch?v=test123'
      });

      // Guide should not be shown
      expect(result.current.showGuide).toBe(false);
    });
  });

  describe('copySampleUrl', () => {
    it('should copy sample URL to clipboard', async () => {
      const { result } = renderHook(() => useChopperIntegration());

      let copyResult;
      await act(async () => {
        copyResult = await result.current.copySampleUrl(mockSample);
      });

      expect(chopperIntegrationService.buildYouTubeUrl).toHaveBeenCalledWith('test123');
      expect(chopperIntegrationService.copyUrlToClipboard).toHaveBeenCalledWith(
        'https://www.youtube.com/watch?v=test123'
      );
      expect(copyResult).toEqual({
        success: true,
        message: 'URL copied to clipboard'
      });
    });

    it('should handle sample without YouTube ID', async () => {
      const invalidSample = { ...mockSample, youtubeId: null };
      const { result } = renderHook(() => useChopperIntegration());

      let copyResult;
      await act(async () => {
        copyResult = await result.current.copySampleUrl(invalidSample);
      });

      expect(copyResult).toEqual({
        success: false,
        message: 'Sample missing YouTube ID'
      });

      expect(chopperIntegrationService.buildYouTubeUrl).not.toHaveBeenCalled();
      expect(chopperIntegrationService.copyUrlToClipboard).not.toHaveBeenCalled();
    });
  });

  describe('utility functions', () => {
    it('should get user guidance message', () => {
      const { result } = renderHook(() => useChopperIntegration());

      const guidance = result.current.getUserGuidance(mockSample);

      expect(chopperIntegrationService.getUserGuidanceMessage).toHaveBeenCalledWith(mockSample);
      expect(guidance).toBe('Click "Use in Chopper" to copy the YouTube URL and navigate to the Chopper page.');
    });

    it('should validate sample', () => {
      const { result } = renderHook(() => useChopperIntegration());

      const validation = result.current.validateSample(mockSample);

      expect(chopperIntegrationService.validateSampleForTransfer).toHaveBeenCalledWith(mockSample);
      expect(validation).toEqual({
        valid: true,
        message: 'Sample ready for chopper integration'
      });
    });

    it('should create shareable link', () => {
      const { result } = renderHook(() => useChopperIntegration());

      const link = result.current.createShareableLink(mockSample);

      expect(chopperIntegrationService.createShareableLink).toHaveBeenCalledWith(mockSample);
      expect(link).toBe('http://localhost:3000/sample-discovery?sample=test-sample');
    });

    it('should build chopper URL', () => {
      const { result } = renderHook(() => useChopperIntegration());

      const url = result.current.buildChopperUrl(mockSample);

      expect(chopperIntegrationService.buildYouTubeUrl).toHaveBeenCalledWith('test123');
      expect(chopperIntegrationService.buildChopperUrl).toHaveBeenCalledWith(
        'https://www.youtube.com/watch?v=test123',
        mockSample
      );
      expect(url).toBe('/chopper?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dtest123&title=Test+Song');
    });

    it('should return null for sample without YouTube ID', () => {
      const invalidSample = { ...mockSample, youtubeId: null };
      const { result } = renderHook(() => useChopperIntegration());

      const url = result.current.buildChopperUrl(invalidSample);

      expect(url).toBe(null);
      expect(chopperIntegrationService.buildYouTubeUrl).not.toHaveBeenCalled();
      expect(chopperIntegrationService.buildChopperUrl).not.toHaveBeenCalled();
    });
  });

  describe('resetTransferStatus', () => {
    it('should reset transfer status to initial state', async () => {
      const { result } = renderHook(() => useChopperIntegration());

      // First perform a transfer to change the status
      await act(async () => {
        await result.current.transferSampleToChopper(mockSample);
      });

      expect(result.current.transferStatus.success).toBe(true);

      // Then reset the status
      act(() => {
        result.current.resetTransferStatus();
      });

      expect(result.current.transferStatus).toEqual({
        inProgress: false,
        success: false,
        message: null,
        error: null,
        lastTransferredSample: null
      });
    });
  });

  describe('integration workflow', () => {
    it('should handle complete workflow from guide to transfer', async () => {
      const { result } = renderHook(() => useChopperIntegration());

      // Show integration guide
      act(() => {
        result.current.showIntegrationGuide(mockSample);
      });

      expect(result.current.showGuide).toBe(true);
      expect(result.current.currentSample).toEqual(mockSample);

      // Perform transfer
      let transferResult;
      await act(async () => {
        transferResult = await result.current.transferSampleToChopper(mockSample);
      });

      expect(transferResult.success).toBe(true);
      expect(result.current.transferStatus.success).toBe(true);

      // Hide guide
      act(() => {
        result.current.hideIntegrationGuide();
      });

      expect(result.current.showGuide).toBe(false);
      expect(result.current.currentSample).toBe(null);
      // Transfer status should remain to show final state
      expect(result.current.transferStatus.success).toBe(true);
    });
  });
});