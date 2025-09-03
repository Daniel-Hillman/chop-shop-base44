/**
 * @fileoverview Unit tests for ChopperIntegrationService
 * Tests URL building, clipboard operations, navigation, and sample validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChopperIntegrationService } from '../ChopperIntegrationService.js';

// Mock DOM APIs
const mockClipboard = {
    writeText: vi.fn()
};

const mockDocument = {
    createElement: vi.fn(),
    body: {
        appendChild: vi.fn(),
        removeChild: vi.fn()
    },
    execCommand: vi.fn()
};

const mockWindow = {
    location: {
        href: '',
        origin: 'http://localhost:3000'
    },
    open: vi.fn()
};

// Mock navigator
Object.defineProperty(global, 'navigator', {
    value: {
        clipboard: mockClipboard
    },
    writable: true
});

// Mock document
Object.defineProperty(global, 'document', {
    value: mockDocument,
    writable: true
});

// Mock window
Object.defineProperty(global, 'window', {
    value: mockWindow,
    writable: true
});

describe('ChopperIntegrationService', () => {
    let service;
    let mockSample;

    beforeEach(() => {
        service = new ChopperIntegrationService();

        mockSample = {
            id: 'sample-1',
            youtubeId: 'dQw4w9WgXcQ',
            title: 'Test Song',
            artist: 'Test Artist',
            year: 2023,
            genre: 'Electronic',
            isMock: false
        };

        // Reset all mocks
        vi.clearAllMocks();
        mockClipboard.writeText.mockResolvedValue(undefined);
        mockDocument.createElement.mockReturnValue({
            value: '',
            style: {},
            focus: vi.fn(),
            select: vi.fn()
        });
        mockDocument.execCommand.mockReturnValue(true);
        
        // Reset window.location.href properly
        Object.defineProperty(mockWindow.location, 'href', {
            value: '',
            writable: true,
            configurable: true
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with correct base URL', () => {
            expect(service.baseChopperUrl).toBe('/chopper');
        });
    });

    describe('buildYouTubeUrl', () => {
        it('should build correct YouTube URL from video ID', () => {
            const result = service.buildYouTubeUrl('dQw4w9WgXcQ');
            expect(result).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        });

        it('should throw error for missing YouTube ID', () => {
            expect(() => service.buildYouTubeUrl('')).toThrow('YouTube ID is required');
            expect(() => service.buildYouTubeUrl(null)).toThrow('YouTube ID is required');
            expect(() => service.buildYouTubeUrl(undefined)).toThrow('YouTube ID is required');
        });
    });

    describe('buildChopperUrl', () => {
        it('should build chopper URL with YouTube URL parameter', () => {
            const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
            const result = service.buildChopperUrl(youtubeUrl, mockSample);

            expect(result).toContain('/chopper?');
            expect(result).toContain('url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ');
        });

        it('should include sample metadata in URL parameters', () => {
            const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
            const result = service.buildChopperUrl(youtubeUrl, mockSample);

            expect(result).toContain('title=Test+Song');
            expect(result).toContain('artist=Test+Artist');
            expect(result).toContain('year=2023');
            expect(result).toContain('genre=Electronic');
        });

        it('should handle sample with missing metadata', () => {
            const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
            const minimalSample = { id: 'sample-1', youtubeId: 'dQw4w9WgXcQ' };
            const result = service.buildChopperUrl(youtubeUrl, minimalSample);

            expect(result).toContain('/chopper?');
            expect(result).toContain('url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ');
            expect(result).not.toContain('title=');
            expect(result).not.toContain('artist=');
        });
    });

    describe('copyUrlToClipboard', () => {
        it('should use modern clipboard API when available', async () => {
            const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

            const result = await service.copyUrlToClipboard(url);

            expect(mockClipboard.writeText).toHaveBeenCalledWith(url);
            expect(result).toEqual({
                success: true,
                message: 'URL copied to clipboard'
            });
        });

        it('should handle clipboard API failure', async () => {
            mockClipboard.writeText.mockRejectedValue(new Error('Permission denied'));
            const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

            const result = await service.copyUrlToClipboard(url);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Failed to copy URL to clipboard');
        });

        it('should use fallback when clipboard API unavailable', async () => {
            // Remove clipboard API
            global.navigator.clipboard = null;

            const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
            const mockTextArea = {
                value: '',
                style: {},
                focus: vi.fn(),
                select: vi.fn()
            };

            mockDocument.createElement.mockReturnValue(mockTextArea);
            mockDocument.execCommand.mockReturnValue(true);

            const result = await service.copyUrlToClipboard(url);

            expect(mockDocument.createElement).toHaveBeenCalledWith('textarea');
            expect(mockTextArea.value).toBe(url);
            expect(mockDocument.execCommand).toHaveBeenCalledWith('copy');
            expect(result.success).toBe(true);
        });
    });

    describe('fallbackCopyToClipboard', () => {
        it('should create textarea and copy text successfully', () => {
            const text = 'test text';
            const mockTextArea = {
                value: '',
                style: {},
                focus: vi.fn(),
                select: vi.fn()
            };

            mockDocument.createElement.mockReturnValue(mockTextArea);
            mockDocument.execCommand.mockReturnValue(true);

            const result = service.fallbackCopyToClipboard(text);

            expect(mockDocument.createElement).toHaveBeenCalledWith('textarea');
            expect(mockTextArea.value).toBe(text);
            expect(mockTextArea.style.position).toBe('fixed');
            expect(mockTextArea.style.left).toBe('-999999px');
            expect(mockTextArea.style.top).toBe('-999999px');
            expect(mockDocument.body.appendChild).toHaveBeenCalledWith(mockTextArea);
            expect(mockTextArea.focus).toHaveBeenCalled();
            expect(mockTextArea.select).toHaveBeenCalled();
            expect(mockDocument.execCommand).toHaveBeenCalledWith('copy');
            expect(mockDocument.body.removeChild).toHaveBeenCalledWith(mockTextArea);
            expect(result).toEqual({
                success: true,
                message: 'URL copied to clipboard'
            });
        });

        it('should handle execCommand failure', () => {
            const text = 'test text';
            const mockTextArea = {
                value: '',
                style: {},
                focus: vi.fn(),
                select: vi.fn()
            };

            mockDocument.createElement.mockReturnValue(mockTextArea);
            mockDocument.execCommand.mockReturnValue(false);

            const result = service.fallbackCopyToClipboard(text);

            expect(result).toEqual({
                success: false,
                message: 'Failed to copy URL'
            });
        });

        it('should handle exceptions gracefully', () => {
            mockDocument.createElement.mockImplementation(() => {
                throw new Error('DOM error');
            });

            const result = service.fallbackCopyToClipboard('test');

            expect(result).toEqual({
                success: false,
                message: 'Clipboard not supported'
            });
        });
    });

    describe('navigateToChopper', () => {
        it('should navigate using window.location.href', () => {
            const chopperUrl = '/chopper?url=test';

            service.navigateToChopper(chopperUrl);

            expect(mockWindow.location.href).toBe(chopperUrl);
        });

        it('should fallback to window.open on navigation error', () => {
            const chopperUrl = '/chopper?url=test';

            // Mock location.href setter to throw
            Object.defineProperty(mockWindow.location, 'href', {
                set: () => {
                    throw new Error('Navigation blocked');
                }
            });

            service.navigateToChopper(chopperUrl);

            expect(mockWindow.open).toHaveBeenCalledWith(chopperUrl, '_blank');
        });
    });

    describe('transferSampleToChopper', () => {
        it('should successfully transfer sample with clipboard copy', async () => {
            const result = await service.transferSampleToChopper(mockSample);

            expect(result.success).toBe(true);
            expect(result.message).toBe('URL copied to clipboard and navigating to Chopper');
            expect(result.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            expect(mockClipboard.writeText).toHaveBeenCalled();
            expect(mockWindow.location.href).toContain('/chopper?');
        });

        it('should handle clipboard failure but still navigate', async () => {
            mockClipboard.writeText.mockRejectedValue(new Error('Permission denied'));

            const result = await service.transferSampleToChopper(mockSample);

            expect(result.success).toBe(true);
            expect(result.message).toBe('Navigating to Chopper (clipboard copy failed)');
            expect(mockWindow.location.href).toContain('/chopper?');
        });

        it('should handle sample without YouTube ID', async () => {
            const invalidSample = { ...mockSample, youtubeId: null };

            const result = await service.transferSampleToChopper(invalidSample);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Failed to transfer sample: Sample missing YouTube ID');
        });

        it('should handle null sample', async () => {
            const result = await service.transferSampleToChopper(null);

            expect(result.success).toBe(false);
            expect(result.message).toContain('Failed to transfer sample:');
        });
    });

    describe('getUserGuidanceMessage', () => {
        it('should return appropriate guidance message', () => {
            const message = service.getUserGuidanceMessage(mockSample);

            expect(message).toContain('Click "Use in Chopper"');
            expect(message).toContain('Test Song');
            expect(message).toContain('YouTube URL');
            expect(message).toContain('Chopper page');
        });
    });

    describe('validateSampleForTransfer', () => {
        it('should validate valid sample', () => {
            const result = service.validateSampleForTransfer(mockSample);

            expect(result.valid).toBe(true);
            expect(result.message).toBe('Sample ready for chopper integration');
        });

        it('should handle null sample', () => {
            const result = service.validateSampleForTransfer(null);

            expect(result.valid).toBe(false);
            expect(result.message).toBe('No sample provided');
        });

        it('should handle sample without YouTube ID', () => {
            const invalidSample = { ...mockSample, youtubeId: null };
            const result = service.validateSampleForTransfer(invalidSample);

            expect(result.valid).toBe(false);
            expect(result.message).toBe('Sample missing YouTube ID');
        });

        it('should handle mock sample', () => {
            const mockSampleData = { ...mockSample, isMock: true };
            const result = service.validateSampleForTransfer(mockSampleData);

            expect(result.valid).toBe(true);
            expect(result.message).toBe('Demo sample - will open YouTube directly');
        });
    });

    describe('createShareableLink', () => {
        it('should create shareable discovery URL', () => {
            const result = service.createShareableLink(mockSample);

            expect(result).toBe('http://localhost:3000/sample-discovery?sample=sample-1');
        });

        it('should handle sample with special characters in ID', () => {
            const specialSample = { ...mockSample, id: 'sample-with-spaces and symbols!' };
            const result = service.createShareableLink(specialSample);

            expect(result).toContain('sample=sample-with-spaces%20and%20symbols!');
        });
    });

    describe('integration scenarios', () => {
        it('should handle complete workflow with all features', async () => {
            const result = await service.transferSampleToChopper(mockSample);

            // Verify URL building
            expect(result.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

            // Verify clipboard operation
            expect(mockClipboard.writeText).toHaveBeenCalledWith(result.url);

            // Verify navigation
            expect(mockWindow.location.href).toContain('/chopper?');
            expect(mockWindow.location.href).toContain('url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ');
            expect(mockWindow.location.href).toContain('title=Test%20Song');

            // Verify success response
            expect(result.success).toBe(true);
        });

        it('should handle degraded functionality gracefully', async () => {
            // Simulate clipboard failure
            mockClipboard.writeText.mockRejectedValue(new Error('Permission denied'));

            // Simulate navigation requiring fallback
            Object.defineProperty(mockWindow.location, 'href', {
                set: () => {
                    throw new Error('Navigation blocked');
                }
            });

            const result = await service.transferSampleToChopper(mockSample);

            // Should still succeed with fallbacks
            expect(result.success).toBe(true);
            expect(mockWindow.open).toHaveBeenCalled();
        });
    });
});