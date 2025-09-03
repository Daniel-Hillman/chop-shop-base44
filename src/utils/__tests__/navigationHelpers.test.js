/**
 * @fileoverview Unit tests for navigationHelpers utilities
 * Tests URL handling, navigation, and user guidance functionality for chopper integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NavigationHelpers, UrlCopyHelpers, UserGuidanceHelpers } from '../navigationHelpers.js';

// Mock DOM APIs
const mockWindow = {
  location: {
    href: 'http://localhost:3000/sample-discovery',
    origin: 'http://localhost:3000',
    search: '?sample=test-sample'
  },
  open: vi.fn()
};

const mockNavigator = {
  clipboard: {
    writeText: vi.fn()
  }
};

const mockDocument = {
  createElement: vi.fn(),
  body: {
    appendChild: vi.fn(),
    removeChild: vi.fn(),
    contains: vi.fn()
  },
  execCommand: vi.fn()
};

// Mock globals
Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true
});

Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true
});

Object.defineProperty(global, 'document', {
  value: mockDocument,
  writable: true
});

describe('NavigationHelpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset window.location properly
    Object.defineProperty(mockWindow.location, 'href', {
      value: 'http://localhost:3000/sample-discovery',
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('navigateTo', () => {
    it('should navigate to URL using window.location.href by default', () => {
      const url = '/chopper?url=test';
      const result = NavigationHelpers.navigateTo(url);

      expect(result).toBe(true);
      expect(mockWindow.location.href).toBe(url);
    });

    it('should open URL in new tab when newTab option is true', () => {
      const url = '/chopper?url=test';
      const result = NavigationHelpers.navigateTo(url, { newTab: true });

      expect(result).toBe(true);
      expect(mockWindow.open).toHaveBeenCalledWith(url, '_blank', 'noopener,noreferrer');
    });

    it('should replace current history entry when replace option is true', () => {
      const url = '/chopper?url=test';
      mockWindow.location.replace = vi.fn();
      
      const result = NavigationHelpers.navigateTo(url, { replace: true });

      expect(result).toBe(true);
      expect(mockWindow.location.replace).toHaveBeenCalledWith(url);
    });

    it('should handle navigation errors gracefully', () => {
      const url = '/chopper?url=test';
      
      // Mock location.href setter to throw
      Object.defineProperty(mockWindow.location, 'href', {
        set: () => {
          throw new Error('Navigation blocked');
        },
        configurable: true
      });

      const result = NavigationHelpers.navigateTo(url);

      expect(result).toBe(false);
    });
  });

  describe('buildUrlWithParams', () => {
    it('should build URL with query parameters', () => {
      const baseUrl = '/chopper';
      const params = {
        url: 'https://www.youtube.com/watch?v=test',
        title: 'Test Song',
        artist: 'Test Artist'
      };

      const result = NavigationHelpers.buildUrlWithParams(baseUrl, params);

      expect(result).toContain('/chopper?');
      expect(result).toContain('url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dtest');
      expect(result).toContain('title=Test+Song');
      expect(result).toContain('artist=Test+Artist');
    });

    it('should handle empty parameters', () => {
      const baseUrl = '/chopper';
      const result = NavigationHelpers.buildUrlWithParams(baseUrl, {});

      expect(result).toBe('http://localhost:3000/chopper');
    });

    it('should skip null and undefined parameters', () => {
      const baseUrl = '/chopper';
      const params = {
        url: 'test',
        title: null,
        artist: undefined,
        year: 2023
      };

      const result = NavigationHelpers.buildUrlWithParams(baseUrl, params);

      expect(result).toContain('url=test');
      expect(result).toContain('year=2023');
      expect(result).not.toContain('title=');
      expect(result).not.toContain('artist=');
    });
  });

  describe('getQueryParams', () => {
    it('should extract query parameters from current URL', () => {
      mockWindow.location.search = '?sample=test-sample&genre=funk';
      
      const result = NavigationHelpers.getQueryParams();

      expect(result).toEqual({
        sample: 'test-sample',
        genre: 'funk'
      });
    });

    it('should return empty object when no query parameters', () => {
      mockWindow.location.search = '';
      
      const result = NavigationHelpers.getQueryParams();

      expect(result).toEqual({});
    });
  });

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(NavigationHelpers.isValidUrl('https://www.youtube.com/watch?v=test')).toBe(true);
      expect(NavigationHelpers.isValidUrl('http://localhost:3000/chopper')).toBe(true);
      expect(NavigationHelpers.isValidUrl('/chopper?url=test')).toBe(false); // relative URLs are invalid for URL constructor
    });

    it('should reject invalid URLs', () => {
      expect(NavigationHelpers.isValidUrl('not-a-url')).toBe(false);
      expect(NavigationHelpers.isValidUrl('')).toBe(false);
      expect(NavigationHelpers.isValidUrl(null)).toBe(false);
    });
  });
});

describe('UrlCopyHelpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset clipboard mock
    mockNavigator.clipboard = {
      writeText: vi.fn().mockResolvedValue(undefined)
    };
    
    // Reset document mock
    mockDocument.createElement.mockReturnValue({
      value: '',
      style: {},
      focus: vi.fn(),
      select: vi.fn(),
      setSelectionRange: vi.fn(),
      setAttribute: vi.fn()
    });
    mockDocument.execCommand.mockReturnValue(true);
  });

  describe('copyToClipboard', () => {
    it('should use modern clipboard API when available', async () => {
      const text = 'https://www.youtube.com/watch?v=test';

      const result = await UrlCopyHelpers.copyToClipboard(text);

      expect(mockNavigator.clipboard.writeText).toHaveBeenCalledWith(text);
      expect(result).toEqual({
        success: true,
        method: 'clipboard-api'
      });
    });

    it('should fallback to execCommand when clipboard API fails', async () => {
      const text = 'https://www.youtube.com/watch?v=test';
      mockNavigator.clipboard.writeText.mockRejectedValue(new Error('Permission denied'));

      const mockTextArea = {
        value: '',
        style: {},
        focus: vi.fn(),
        select: vi.fn(),
        setSelectionRange: vi.fn()
      };

      mockDocument.createElement.mockReturnValue(mockTextArea);
      mockDocument.execCommand.mockReturnValue(true);

      const result = await UrlCopyHelpers.copyToClipboard(text);

      expect(mockDocument.createElement).toHaveBeenCalledWith('textarea');
      expect(mockDocument.execCommand).toHaveBeenCalledWith('copy');
      expect(result).toEqual({
        success: true,
        method: 'exec-command'
      });
    });

    it('should fallback to manual selection when all methods fail', async () => {
      const text = 'https://www.youtube.com/watch?v=test';
      mockNavigator.clipboard.writeText.mockRejectedValue(new Error('Permission denied'));
      mockDocument.execCommand.mockReturnValue(false);

      const mockTextArea = {
        value: '',
        style: {},
        focus: vi.fn(),
        select: vi.fn(),
        setSelectionRange: vi.fn(),
        setAttribute: vi.fn()
      };

      mockDocument.createElement.mockReturnValue(mockTextArea);

      const result = await UrlCopyHelpers.copyToClipboard(text);

      expect(result).toEqual({
        success: true,
        method: 'manual-selection'
      });
    });

    it('should handle complete failure gracefully', async () => {
      const text = 'https://www.youtube.com/watch?v=test';
      mockNavigator.clipboard.writeText.mockRejectedValue(new Error('Permission denied'));
      mockDocument.createElement.mockImplementation(() => {
        throw new Error('DOM error');
      });

      const result = await UrlCopyHelpers.copyToClipboard(text);

      expect(result).toEqual({
        success: false,
        method: 'none',
        error: 'All copy methods failed'
      });
    });
  });

  describe('isClipboardSupported', () => {
    it('should return true when clipboard API is available', () => {
      expect(UrlCopyHelpers.isClipboardSupported()).toBe(true);
    });

    it('should return true when execCommand is available', () => {
      mockNavigator.clipboard = null;
      mockDocument.execCommand = vi.fn();

      expect(UrlCopyHelpers.isClipboardSupported()).toBe(true);
    });

    it('should return false when no clipboard methods are available', () => {
      mockNavigator.clipboard = null;
      mockDocument.execCommand = null;

      expect(UrlCopyHelpers.isClipboardSupported()).toBe(false);
    });
  });
});

describe('UserGuidanceHelpers', () => {
  describe('getGuidanceMessage', () => {
    it('should return appropriate guidance messages', () => {
      expect(UserGuidanceHelpers.getGuidanceMessage('use-in-chopper'))
        .toContain('Click "Use in Chopper"');
      
      expect(UserGuidanceHelpers.getGuidanceMessage('copy-url'))
        .toContain('URL copied to clipboard');
      
      expect(UserGuidanceHelpers.getGuidanceMessage('copy-failed'))
        .toContain('Could not copy URL automatically');
      
      expect(UserGuidanceHelpers.getGuidanceMessage('navigation-failed'))
        .toContain('Could not navigate automatically');
      
      expect(UserGuidanceHelpers.getGuidanceMessage('sample-invalid'))
        .toContain('cannot be used in Chopper');
      
      expect(UserGuidanceHelpers.getGuidanceMessage('offline-mode'))
        .toContain('You are offline');
    });

    it('should return default message for unknown actions', () => {
      const result = UserGuidanceHelpers.getGuidanceMessage('unknown-action');
      expect(result).toBe('No guidance available for this action.');
    });
  });

  describe('createChopperIntegrationGuidance', () => {
    it('should create comprehensive guidance for chopper integration', () => {
      const sample = {
        id: 'test-sample',
        title: 'Test Song',
        artist: 'Test Artist',
        year: 2023,
        genre: 'Funk',
        youtubeId: 'test123'
      };

      const guidance = UserGuidanceHelpers.createChopperIntegrationGuidance(sample);

      expect(guidance.title).toBe('Using Sample in Chopper');
      expect(guidance.steps).toHaveLength(4);
      expect(guidance.steps[0].title).toBe('Copy YouTube URL');
      expect(guidance.steps[0].description).toContain('Test Song');
      expect(guidance.steps[1].title).toBe('Navigate to Chopper');
      expect(guidance.steps[2].title).toBe('Load Sample');
      expect(guidance.steps[3].title).toBe('Create Audio Samples');
      expect(guidance.tips).toHaveLength(3);
      expect(guidance.tips[0]).toContain('stable internet connection');
    });
  });

  describe('formatSampleInfo', () => {
    it('should format sample information correctly', () => {
      const sample = {
        title: 'Test Song',
        artist: 'Test Artist',
        year: 2023,
        genre: 'Funk'
      };

      const result = UserGuidanceHelpers.formatSampleInfo(sample);

      expect(result).toBe('Test Song by Test Artist (2023) Funk');
    });

    it('should handle missing fields gracefully', () => {
      const sample = {
        title: 'Test Song',
        artist: 'Test Artist'
      };

      const result = UserGuidanceHelpers.formatSampleInfo(sample);

      expect(result).toBe('Test Song by Test Artist');
    });
  });
});

describe('Integration Tests', () => {
  it('should handle complete chopper integration workflow', async () => {
    const sample = {
      id: 'test-sample',
      title: 'Test Song',
      artist: 'Test Artist',
      year: 2023,
      genre: 'Funk',
      youtubeId: 'test123'
    };

    // Test URL building
    const chopperUrl = NavigationHelpers.buildUrlWithParams('/chopper', {
      url: `https://www.youtube.com/watch?v=${sample.youtubeId}`,
      title: sample.title,
      artist: sample.artist,
      year: sample.year,
      genre: sample.genre
    });

    expect(chopperUrl).toContain('/chopper?');
    expect(chopperUrl).toContain('url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dtest123');

    // Test URL copying
    const youtubeUrl = `https://www.youtube.com/watch?v=${sample.youtubeId}`;
    const copyResult = await UrlCopyHelpers.copyToClipboard(youtubeUrl);

    expect(copyResult.success).toBe(true);
    expect(mockNavigator.clipboard.writeText).toHaveBeenCalledWith(youtubeUrl);

    // Test navigation
    const navigationResult = NavigationHelpers.navigateTo(chopperUrl);

    expect(navigationResult).toBe(true);
    expect(mockWindow.location.href).toBe(chopperUrl);

    // Test guidance creation
    const guidance = UserGuidanceHelpers.createChopperIntegrationGuidance(sample);

    expect(guidance.title).toBe('Using Sample in Chopper');
    expect(guidance.steps).toHaveLength(4);
    expect(guidance.tips).toHaveLength(3);
  });

  it('should handle degraded functionality gracefully', async () => {
    // Simulate clipboard failure
    mockNavigator.clipboard.writeText.mockRejectedValue(new Error('Permission denied'));
    mockDocument.execCommand.mockReturnValue(false);

    // Simulate navigation failure
    Object.defineProperty(mockWindow.location, 'href', {
      set: () => {
        throw new Error('Navigation blocked');
      },
      configurable: true
    });

    const youtubeUrl = 'https://www.youtube.com/watch?v=test123';
    const chopperUrl = '/chopper?url=test';

    // Test clipboard fallback
    const copyResult = await UrlCopyHelpers.copyToClipboard(youtubeUrl);
    expect(copyResult.success).toBe(true); // Should succeed with manual selection
    expect(copyResult.method).toBe('manual-selection');

    // Test navigation fallback
    const navigationResult = NavigationHelpers.navigateTo(chopperUrl, { newTab: true });
    expect(navigationResult).toBe(true);
    expect(mockWindow.open).toHaveBeenCalledWith(chopperUrl, '_blank', 'noopener,noreferrer');
  });
});