import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock FirestorePatternService functions first
const mockLoadPattern = vi.fn();
const mockUpdatePattern = vi.fn();
const mockValidatePattern = vi.fn();

vi.mock('../FirestorePatternService.js', () => ({
  firestorePatternService: {
    loadPattern: mockLoadPattern,
    updatePattern: mockUpdatePattern,
    validatePattern: mockValidatePattern
  }
}));

// Import after mocks are set up
const { PatternVersioningService } = await import('../PatternVersioningService.js');

describe('PatternVersioningService', () => {
  let service;
  let mockPattern;

  beforeEach(() => {
    service = new PatternVersioningService();
    
    mockPattern = {
      id: 'pattern-123',
      name: 'Test Pattern',
      bpm: 120,
      swing: 10,
      stepResolution: 16,
      tracks: [
        {
          id: 'kick',
          name: 'Kick',
          sampleId: 'kick_001',
          volume: 0.8,
          mute: false,
          solo: false,
          steps: Array(16).fill(null).map((_, i) => ({
            active: i % 4 === 0,
            velocity: 1.0
          })),
          randomization: { velocity: 0, timing: 0 }
        }
      ],
      metadata: {
        version: 1,
        public: false,
        tags: ['electronic'],
        created: new Date('2025-01-01'),
        modified: new Date('2025-01-02')
      }
    };

    vi.clearAllMocks();
  });

  describe('createVersion', () => {
    it('should create a new version of a pattern', async () => {
      mockLoadPattern.mockResolvedValue(mockPattern);
      mockValidatePattern.mockImplementation(() => {});
      mockUpdatePattern.mockResolvedValue();

      const updatedPattern = {
        ...mockPattern,
        bpm: 140,
        metadata: {
          ...mockPattern.metadata,
          changeDescription: 'Increased BPM'
        }
      };

      const versionId = await service.createVersion('pattern-123', updatedPattern, 'Increased BPM');

      expect(versionId).toBe('pattern-123');
      expect(mockUpdatePattern).toHaveBeenCalledWith('pattern-123', expect.objectContaining({
        bpm: 140,
        metadata: expect.objectContaining({
          version: 2,
          previousVersion: 1,
          changeDescription: 'Increased BPM',
          versionHistory: expect.arrayContaining([
            expect.objectContaining({
              version: 1,
              timestamp: mockPattern.metadata.modified
            })
          ])
        })
      }));
    });

    it('should handle patterns without existing version', async () => {
      const patternWithoutVersion = {
        ...mockPattern,
        metadata: {
          ...mockPattern.metadata,
          version: undefined
        }
      };

      mockLoadPattern.mockResolvedValue(patternWithoutVersion);
      mockValidatePattern.mockImplementation(() => {});
      mockUpdatePattern.mockResolvedValue();

      await service.createVersion('pattern-123', patternWithoutVersion, 'First version');

      expect(mockUpdatePattern).toHaveBeenCalledWith('pattern-123', expect.objectContaining({
        metadata: expect.objectContaining({
          version: 2,
          previousVersion: 1
        })
      }));
    });
  });

  describe('comparePatterns', () => {
    it('should detect BPM changes', () => {
      const pattern1 = { ...mockPattern, bpm: 120 };
      const pattern2 = { ...mockPattern, bpm: 140 };

      const differences = service.comparePatterns(pattern1, pattern2);

      expect(differences.settings.bpm).toEqual({
        from: 120,
        to: 140
      });
    });

    it('should detect swing changes', () => {
      const pattern1 = { ...mockPattern, swing: 0 };
      const pattern2 = { ...mockPattern, swing: 20 };

      const differences = service.comparePatterns(pattern1, pattern2);

      expect(differences.settings.swing).toEqual({
        from: 0,
        to: 20
      });
    });

    it('should detect step resolution changes', () => {
      const pattern1 = { ...mockPattern, stepResolution: 16 };
      const pattern2 = { ...mockPattern, stepResolution: 32 };

      const differences = service.comparePatterns(pattern1, pattern2);

      expect(differences.settings.stepResolution).toEqual({
        from: 16,
        to: 32
      });
    });

    it('should detect track changes', () => {
      const pattern1 = { ...mockPattern };
      const pattern2 = {
        ...mockPattern,
        tracks: [{
          ...mockPattern.tracks[0],
          volume: 0.5,
          name: 'Modified Kick'
        }]
      };

      const differences = service.comparePatterns(pattern1, pattern2);

      expect(differences.tracks.kick).toEqual(expect.objectContaining({
        volume: { from: 0.8, to: 0.5 },
        name: { from: 'Kick', to: 'Modified Kick' }
      }));
    });

    it('should detect step changes', () => {
      const pattern1 = { ...mockPattern };
      const pattern2 = {
        ...mockPattern,
        tracks: [{
          ...mockPattern.tracks[0],
          steps: mockPattern.tracks[0].steps.map((step, index) => 
            index === 1 ? { active: true, velocity: 0.8 } : step
          )
        }]
      };

      const differences = service.comparePatterns(pattern1, pattern2);

      expect(differences.tracks.kick.steps).toContainEqual({
        index: 1,
        from: { active: false, velocity: 1.0 },
        to: { active: true, velocity: 0.8 }
      });
    });

    it('should detect removed tracks', () => {
      const pattern1 = {
        ...mockPattern,
        tracks: [
          mockPattern.tracks[0],
          { id: 'snare', name: 'Snare', steps: [] }
        ]
      };
      const pattern2 = {
        ...mockPattern,
        tracks: [mockPattern.tracks[0]]
      };

      const differences = service.comparePatterns(pattern1, pattern2);

      expect(differences.tracks.snare).toEqual({ status: 'removed' });
    });

    it('should detect added tracks', () => {
      const pattern1 = {
        ...mockPattern,
        tracks: [mockPattern.tracks[0]]
      };
      const pattern2 = {
        ...mockPattern,
        tracks: [
          mockPattern.tracks[0],
          { id: 'snare', name: 'Snare', steps: [] }
        ]
      };

      const differences = service.comparePatterns(pattern1, pattern2);

      expect(differences.tracks.snare).toEqual({ status: 'added' });
    });
  });

  describe('compareTrack', () => {
    it('should detect track property changes', () => {
      const track1 = mockPattern.tracks[0];
      const track2 = {
        ...track1,
        volume: 0.5,
        mute: true,
        sampleId: 'kick_002'
      };

      const differences = service.compareTrack(track1, track2);

      expect(differences).toEqual({
        volume: { from: 0.8, to: 0.5 },
        mute: { from: false, to: true },
        sampleId: { from: 'kick_001', to: 'kick_002' }
      });
    });

    it('should detect randomization changes', () => {
      const track1 = mockPattern.tracks[0];
      const track2 = {
        ...track1,
        randomization: { velocity: 50, timing: 25 }
      };

      const differences = service.compareTrack(track1, track2);

      expect(differences.randomization).toEqual({
        from: { velocity: 0, timing: 0 },
        to: { velocity: 50, timing: 25 }
      });
    });
  });

  describe('mergePatterns', () => {
    it('should merge patterns with remote changes taking precedence', () => {
      const basePattern = { ...mockPattern, bpm: 120 };
      const localChanges = {
        settings: {
          bpm: { from: 120, to: 130 }
        }
      };
      const remoteChanges = {
        settings: {
          bpm: { from: 120, to: 140 }
        },
        metadata: { version: 2 }
      };

      const merged = service.mergePatterns(basePattern, localChanges, remoteChanges);

      expect(merged.bpm).toBe(140); // Remote change wins
      expect(merged.metadata.version).toBe(3); // Incremented from max
      expect(merged.metadata.changeDescription).toBe('Merged changes');
    });
  });

  describe('generateMetadata', () => {
    it('should generate metadata with default values', () => {
      const metadata = service.generateMetadata(mockPattern);

      expect(metadata).toEqual({
        public: false,
        tags: [],
        description: '',
        version: 1,
        changeDescription: 'Initial version',
        versionHistory: [],
        stats: expect.objectContaining({
          totalSteps: 16,
          trackCount: 1,
          activeSteps: 4, // Every 4th step is active
          averageVelocity: 1.0,
          complexity: expect.any(Number)
        })
      });
    });

    it('should use provided options', () => {
      const options = {
        public: true,
        tags: ['house', 'electronic'],
        description: 'Custom description',
        changeDescription: 'Custom change'
      };

      const metadata = service.generateMetadata(mockPattern, options);

      expect(metadata).toEqual(expect.objectContaining({
        public: true,
        tags: ['house', 'electronic'],
        description: 'Custom description',
        changeDescription: 'Custom change'
      }));
    });
  });

  describe('generatePatternStats', () => {
    it('should calculate pattern statistics correctly', () => {
      const stats = service.generatePatternStats(mockPattern);

      expect(stats).toEqual({
        totalSteps: 16,
        activeSteps: 4, // Every 4th step is active (0, 4, 8, 12)
        trackCount: 1,
        averageVelocity: 1.0,
        complexity: 25 // 4 active steps out of 16 total = 25%
      });
    });

    it('should handle patterns with no active steps', () => {
      const emptyPattern = {
        ...mockPattern,
        tracks: [{
          ...mockPattern.tracks[0],
          steps: Array(16).fill({ active: false, velocity: 1.0 })
        }]
      };

      const stats = service.generatePatternStats(emptyPattern);

      expect(stats).toEqual({
        totalSteps: 16,
        activeSteps: 0,
        trackCount: 1,
        averageVelocity: 0,
        complexity: 0
      });
    });

    it('should handle multiple tracks', () => {
      const multiTrackPattern = {
        ...mockPattern,
        tracks: [
          mockPattern.tracks[0],
          {
            ...mockPattern.tracks[0],
            id: 'snare',
            steps: Array(16).fill(null).map((_, i) => ({
              active: i % 8 === 4, // Every 8th step starting at 4
              velocity: 0.8
            }))
          }
        ]
      };

      const stats = service.generatePatternStats(multiTrackPattern);

      expect(stats.trackCount).toBe(2);
      expect(stats.activeSteps).toBe(6); // 4 from kick + 2 from snare
      expect(stats.averageVelocity).toBeCloseTo(0.933, 2); // (4*1.0 + 2*0.8) / 6
    });
  });

  describe('updateVersionHistory', () => {
    it('should add new entry to version history', () => {
      const currentHistory = [
        { version: 1, timestamp: new Date('2025-01-01'), changeDescription: 'Initial' }
      ];
      const newEntry = { version: 2, timestamp: new Date('2025-01-02'), changeDescription: 'Update' };

      const updatedHistory = service.updateVersionHistory(currentHistory, newEntry);

      expect(updatedHistory).toHaveLength(2);
      expect(updatedHistory[1]).toEqual(newEntry);
    });

    it('should limit version history to maxVersionHistory', () => {
      service.maxVersionHistory = 3;
      
      const currentHistory = [
        { version: 1, timestamp: new Date('2025-01-01') },
        { version: 2, timestamp: new Date('2025-01-02') },
        { version: 3, timestamp: new Date('2025-01-03') }
      ];
      const newEntry = { version: 4, timestamp: new Date('2025-01-04') };

      const updatedHistory = service.updateVersionHistory(currentHistory, newEntry);

      expect(updatedHistory).toHaveLength(3);
      expect(updatedHistory[0].version).toBe(2); // First entry removed
      expect(updatedHistory[2].version).toBe(4); // New entry added
    });
  });
});