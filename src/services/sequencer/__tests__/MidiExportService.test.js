/**
 * @fileoverview Tests for MidiExportService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MidiExportService } from '../MidiExportService.js';

// Mock DOM methods
global.document = {
  createElement: vi.fn(() => ({
    href: '',
    download: '',
    click: vi.fn(),
    remove: vi.fn()
  })),
  body: {
    appendChild: vi.fn(),
    removeChild: vi.fn()
  }
};

global.URL = {
  createObjectURL: vi.fn(() => 'blob:mock-url'),
  revokeObjectURL: vi.fn()
};

global.Blob = vi.fn();

describe('MidiExportService', () => {
  let midiExportService;
  let mockPattern;
  let mockSong;

  beforeEach(() => {
    midiExportService = new MidiExportService();
    
    mockPattern = {
      id: 'pattern1',
      name: 'Test Pattern',
      bpm: 120,
      swing: 0,
      stepResolution: 16,
      tracks: [
        {
          id: 'kick',
          name: 'Kick',
          sampleId: 'kick_sample',
          volume: 0.8,
          mute: false,
          solo: false,
          steps: [
            { active: true, velocity: 1.0 },
            { active: false, velocity: 0.8 },
            { active: false, velocity: 0.8 },
            { active: false, velocity: 0.8 },
            { active: true, velocity: 0.9 },
            { active: false, velocity: 0.8 },
            { active: false, velocity: 0.8 },
            { active: false, velocity: 0.8 },
            { active: true, velocity: 1.0 },
            { active: false, velocity: 0.8 },
            { active: false, velocity: 0.8 },
            { active: false, velocity: 0.8 },
            { active: true, velocity: 0.9 },
            { active: false, velocity: 0.8 },
            { active: false, velocity: 0.8 },
            { active: false, velocity: 0.8 }
          ]
        },
        {
          id: 'snare',
          name: 'Snare',
          sampleId: 'snare_sample',
          volume: 0.7,
          mute: false,
          solo: false,
          steps: [
            { active: false, velocity: 0.8 },
            { active: false, velocity: 0.8 },
            { active: false, velocity: 0.8 },
            { active: false, velocity: 0.8 },
            { active: true, velocity: 1.0 },
            { active: false, velocity: 0.8 },
            { active: false, velocity: 0.8 },
            { active: false, velocity: 0.8 },
            { active: false, velocity: 0.8 },
            { active: false, velocity: 0.8 },
            { active: false, velocity: 0.8 },
            { active: false, velocity: 0.8 },
            { active: true, velocity: 0.9 },
            { active: false, velocity: 0.8 },
            { active: false, velocity: 0.8 },
            { active: false, velocity: 0.8 }
          ]
        }
      ],
      metadata: {
        created: '2025-01-01T00:00:00Z',
        modified: '2025-01-01T00:00:00Z',
        userId: 'test-user'
      }
    };

    mockSong = {
      id: 'song1',
      name: 'Test Song',
      patterns: [
        { id: 'section1', patternId: 'pattern1', loops: 2, transitionType: 'immediate', transitionBars: 0 }
      ],
      metadata: {
        created: '2025-01-01T00:00:00Z',
        modified: '2025-01-01T00:00:00Z',
        userId: 'test-user',
        bpm: 120,
        totalDuration: 8.0
      }
    };

    // Reset mocks
    vi.clearAllMocks();
  });

  describe('Pattern Export', () => {
    it('should export a valid pattern to MIDI', () => {
      const midiData = midiExportService.exportPattern(mockPattern);
      
      expect(midiData).toBeInstanceOf(Uint8Array);
      expect(midiData.length).toBeGreaterThan(0);
      
      // Check MIDI header
      const headerType = String.fromCharCode(...midiData.slice(0, 4));
      expect(headerType).toBe('MThd');
    });

    it('should throw error for null pattern', () => {
      expect(() => midiExportService.exportPattern(null)).toThrow('Pattern is required');
    });

    it('should use custom export options', () => {
      const options = {
        ticksPerQuarter: 960,
        tempo: 140,
        channel: 0
      };
      
      const midiData = midiExportService.exportPattern(mockPattern, options);
      
      expect(midiData).toBeInstanceOf(Uint8Array);
      expect(midiData.length).toBeGreaterThan(0);
    });
  });

  describe('Song Export', () => {
    it('should export a valid song to MIDI', () => {
      const patterns = [mockPattern];
      const midiData = midiExportService.exportSong(mockSong, patterns);
      
      expect(midiData).toBeInstanceOf(Uint8Array);
      expect(midiData.length).toBeGreaterThan(0);
      
      // Check MIDI header
      const headerType = String.fromCharCode(...midiData.slice(0, 4));
      expect(headerType).toBe('MThd');
    });

    it('should throw error for null song', () => {
      expect(() => midiExportService.exportSong(null, [])).toThrow('Song and patterns are required');
    });

    it('should throw error for null patterns', () => {
      expect(() => midiExportService.exportSong(mockSong, null)).toThrow('Song and patterns are required');
    });
  });

  describe('MIDI Note Mapping', () => {
    it('should map kick drum correctly', () => {
      const kickTrack = { name: 'Kick' };
      const noteNumber = midiExportService.getMidiNoteForTrack(kickTrack);
      expect(noteNumber).toBe(36); // Bass Drum 1
    });

    it('should map snare drum correctly', () => {
      const snareTrack = { name: 'Snare' };
      const noteNumber = midiExportService.getMidiNoteForTrack(snareTrack);
      expect(noteNumber).toBe(38); // Acoustic Snare
    });

    it('should handle fuzzy matching', () => {
      const hihatTrack = { name: 'Closed Hi-Hat' };
      const noteNumber = midiExportService.getMidiNoteForTrack(hihatTrack);
      expect(noteNumber).toBe(42); // Closed Hi Hat
    });

    it('should default to kick for unknown tracks', () => {
      const unknownTrack = { name: 'Unknown Instrument' };
      const noteNumber = midiExportService.getMidiNoteForTrack(unknownTrack);
      expect(noteNumber).toBe(36); // Default to kick
    });
  });

  describe('Pattern Validation', () => {
    it('should validate a correct pattern', () => {
      const isValid = midiExportService.validatePattern(mockPattern);
      expect(isValid).toBe(true);
    });

    it('should reject null pattern', () => {
      const isValid = midiExportService.validatePattern(null);
      expect(isValid).toBe(false);
    });

    it('should reject pattern without tracks', () => {
      const invalidPattern = { ...mockPattern, tracks: [] };
      const isValid = midiExportService.validatePattern(invalidPattern);
      expect(isValid).toBe(false);
    });

    it('should reject pattern with no active steps', () => {
      const invalidPattern = {
        ...mockPattern,
        tracks: [{
          ...mockPattern.tracks[0],
          steps: mockPattern.tracks[0].steps.map(step => ({ ...step, active: false }))
        }]
      };
      const isValid = midiExportService.validatePattern(invalidPattern);
      expect(isValid).toBe(false);
    });
  });

  describe('Export Statistics', () => {
    it('should calculate correct export stats', () => {
      const stats = midiExportService.getExportStats(mockPattern);
      
      expect(stats.valid).toBe(true);
      expect(stats.tracks).toBe(2);
      expect(stats.activeSteps).toBe(6); // 4 kick + 2 snare
      expect(stats.stepResolution).toBe(16);
      expect(stats.bpm).toBe(120);
      expect(stats.duration).toBeGreaterThan(0);
    });

    it('should return invalid stats for invalid pattern', () => {
      const stats = midiExportService.getExportStats(null);
      
      expect(stats.valid).toBe(false);
      expect(stats.tracks).toBe(0);
      expect(stats.activeSteps).toBe(0);
      expect(stats.duration).toBe(0);
    });
  });

  describe('Variable Length Encoding', () => {
    it('should encode zero correctly', () => {
      const encoded = midiExportService.encodeVariableLength(0);
      expect(encoded).toEqual([0]);
    });

    it('should encode small numbers correctly', () => {
      const encoded = midiExportService.encodeVariableLength(127);
      expect(encoded).toEqual([127]);
    });

    it('should encode large numbers correctly', () => {
      const encoded = midiExportService.encodeVariableLength(128);
      expect(encoded).toEqual([0x81, 0x00]);
    });

    it('should encode very large numbers correctly', () => {
      const encoded = midiExportService.encodeVariableLength(16383);
      expect(encoded).toEqual([0xFF, 0x7F]);
    });
  });

  describe('MIDI File Structure', () => {
    it('should create correct header chunk', () => {
      const midiFile = midiExportService.createMidiFile(mockPattern, midiExportService.defaultSettings);
      
      expect(midiFile.header.format).toBe(1);
      expect(midiFile.header.tracks).toBe(1);
      expect(midiFile.header.ticksPerQuarter).toBe(480);
    });

    it('should create track with tempo event', () => {
      const midiFile = midiExportService.createMidiFile(mockPattern, midiExportService.defaultSettings);
      const track = midiFile.tracks[0];
      
      const tempoEvent = track.find(event => event.subtype === 'setTempo');
      expect(tempoEvent).toBeDefined();
      expect(tempoEvent.microsecondsPerBeat).toBe(500000); // 120 BPM
    });

    it('should create track with time signature event', () => {
      const midiFile = midiExportService.createMidiFile(mockPattern, midiExportService.defaultSettings);
      const track = midiFile.tracks[0];
      
      const timeSigEvent = track.find(event => event.subtype === 'timeSignature');
      expect(timeSigEvent).toBeDefined();
      expect(timeSigEvent.numerator).toBe(4);
      expect(timeSigEvent.denominator).toBe(4);
    });

    it('should create track with end of track event', () => {
      const midiFile = midiExportService.createMidiFile(mockPattern, midiExportService.defaultSettings);
      const track = midiFile.tracks[0];
      
      const endEvent = track[track.length - 1];
      expect(endEvent.subtype).toBe('endOfTrack');
    });
  });

  describe('File Download', () => {
    it('should trigger file download', () => {
      const midiData = new Uint8Array([1, 2, 3, 4]);
      const filename = 'test.mid';
      
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      };
      
      document.createElement.mockReturnValue(mockLink);
      
      midiExportService.downloadMidiFile(midiData, filename);
      
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.download).toBe(filename);
      expect(mockLink.click).toHaveBeenCalled();
      expect(document.body.appendChild).toHaveBeenCalledWith(mockLink);
      expect(document.body.removeChild).toHaveBeenCalledWith(mockLink);
    });
  });

  describe('Export Options', () => {
    it('should return default options when none provided', () => {
      const options = midiExportService.getExportOptions();
      
      expect(options.ticksPerQuarter).toBe(480);
      expect(options.tempo).toBe(120);
      expect(options.channel).toBe(9);
      expect(options.includeSwing).toBe(true);
      expect(options.quantize).toBe(true);
    });

    it('should merge custom options with defaults', () => {
      const customOptions = {
        tempo: 140,
        channel: 0,
        includeSwing: false
      };
      
      const options = midiExportService.getExportOptions(customOptions);
      
      expect(options.tempo).toBe(140);
      expect(options.channel).toBe(0);
      expect(options.includeSwing).toBe(false);
      expect(options.ticksPerQuarter).toBe(480); // Default
      expect(options.quantize).toBe(true); // Default
    });
  });
});