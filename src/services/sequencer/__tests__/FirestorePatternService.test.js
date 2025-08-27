import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Firestore functions first
const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockOnSnapshot = vi.fn();
const mockCollection = vi.fn();
const mockDoc = vi.fn();
const mockQuery = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockServerTimestamp = vi.fn(() => ({ serverTimestamp: true }));

vi.mock('firebase/firestore', () => ({
  collection: mockCollection,
  doc: mockDoc,
  addDoc: mockAddDoc,
  updateDoc: mockUpdateDoc,
  deleteDoc: mockDeleteDoc,
  getDoc: mockGetDoc,
  getDocs: mockGetDocs,
  query: mockQuery,
  where: mockWhere,
  orderBy: mockOrderBy,
  limit: mockLimit,
  serverTimestamp: mockServerTimestamp,
  onSnapshot: mockOnSnapshot
}));

// Mock Firebase
vi.mock('../../../firebase.js', () => ({
  db: {},
  auth: {
    currentUser: {
      uid: 'test-user-123'
    }
  }
}));

// Import after mocks are set up
const { FirestorePatternService } = await import('../FirestorePatternService.js');

describe('FirestorePatternService', () => {
  let service;
  let mockPattern;

  beforeEach(() => {
    service = new FirestorePatternService();
    
    mockPattern = {
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
          color: '#06b6d4',
          steps: Array(16).fill(null).map((_, i) => ({
            active: i % 4 === 0,
            velocity: 1.0
          })),
          randomization: {
            velocity: 0,
            timing: 0
          }
        }
      ],
      metadata: {
        public: false,
        tags: ['electronic'],
        description: 'Test pattern'
      }
    };

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('savePattern', () => {
    it('should save a new pattern to Firestore', async () => {
      const mockDocRef = { id: 'pattern-123' };
      mockAddDoc.mockResolvedValue(mockDocRef);
      mockCollection.mockReturnValue('mock-collection');

      const patternId = await service.savePattern(mockPattern);

      expect(patternId).toBe('pattern-123');
      expect(mockAddDoc).toHaveBeenCalledWith('mock-collection', expect.objectContaining({
        name: 'Test Pattern',
        bpm: 120,
        swing: 10,
        stepResolution: 16,
        tracks: expect.arrayContaining([
          expect.objectContaining({
            id: 'kick',
            name: 'Kick',
            sampleId: 'kick_001',
            volume: 0.8,
            steps: expect.arrayContaining([true, false, false, false])
          })
        ]),
        metadata: expect.objectContaining({
          public: false,
          tags: ['electronic'],
          userId: 'test-user-123'
        })
      }));
    });

    it('should throw error if user is not authenticated', async () => {
      // Mock auth.currentUser to be null for this test
      const { auth } = await import('../../../firebase.js');
      const originalCurrentUser = auth.currentUser;
      auth.currentUser = null;
      
      await expect(service.savePattern(mockPattern))
        .rejects.toThrow('User must be authenticated to save patterns');
      
      // Restore original currentUser
      auth.currentUser = originalCurrentUser;
    });
  });

  describe('updatePattern', () => {
    it('should update an existing pattern', async () => {
      mockDoc.mockReturnValue('mock-doc-ref');
      mockUpdateDoc.mockResolvedValue();

      await service.updatePattern('pattern-123', mockPattern);

      expect(mockUpdateDoc).toHaveBeenCalledWith('mock-doc-ref', expect.objectContaining({
        name: 'Test Pattern',
        'metadata.modified': { serverTimestamp: true }
      }));
    });
  });

  describe('loadPattern', () => {
    it('should load a pattern from Firestore', async () => {
      const mockDocSnap = {
        exists: () => true,
        id: 'pattern-123',
        data: () => ({
          name: 'Test Pattern',
          bpm: 120,
          swing: 10,
          stepResolution: 16,
          tracks: [{
            id: 'kick',
            name: 'Kick',
            sampleId: 'kick_001',
            volume: 0.8,
            mute: false,
            solo: false,
            color: '#06b6d4',
            steps: [true, false, false, false],
            velocities: [1.0, 1.0, 1.0, 1.0],
            randomization: { velocity: 0, timing: 0 }
          }],
          metadata: {
            public: false,
            tags: ['electronic'],
            created: { toDate: () => new Date('2025-01-01') },
            modified: { toDate: () => new Date('2025-01-02') }
          }
        })
      };

      mockDoc.mockReturnValue('mock-doc-ref');
      mockGetDoc.mockResolvedValue(mockDocSnap);

      const pattern = await service.loadPattern('pattern-123');

      expect(pattern).toEqual(expect.objectContaining({
        id: 'pattern-123',
        name: 'Test Pattern',
        bpm: 120,
        tracks: expect.arrayContaining([
          expect.objectContaining({
            id: 'kick',
            steps: expect.arrayContaining([
              { active: true, velocity: 1.0 },
              { active: false, velocity: 1.0 }
            ])
          })
        ])
      }));
    });

    it('should throw error if pattern does not exist', async () => {
      const mockDocSnap = {
        exists: () => false
      };

      mockDoc.mockReturnValue('mock-doc-ref');
      mockGetDoc.mockResolvedValue(mockDocSnap);

      await expect(service.loadPattern('nonexistent-pattern'))
        .rejects.toThrow('Pattern with ID nonexistent-pattern not found');
    });
  });

  describe('deletePattern', () => {
    it('should delete a pattern from Firestore', async () => {
      mockDoc.mockReturnValue('mock-doc-ref');
      mockDeleteDoc.mockResolvedValue();

      await service.deletePattern('pattern-123');

      expect(mockDeleteDoc).toHaveBeenCalledWith('mock-doc-ref');
    });
  });

  describe('getUserPatterns', () => {
    it('should get all patterns for the current user', async () => {
      const mockQuerySnapshot = {
        docs: [
          {
            id: 'pattern-1',
            data: () => ({
              name: 'Pattern 1',
              bpm: 120,
              tracks: [],
              metadata: { created: { toDate: () => new Date() } }
            })
          },
          {
            id: 'pattern-2',
            data: () => ({
              name: 'Pattern 2',
              bpm: 140,
              tracks: [],
              metadata: { created: { toDate: () => new Date() } }
            })
          }
        ]
      };

      mockCollection.mockReturnValue('mock-collection');
      mockQuery.mockReturnValue('mock-query');
      mockOrderBy.mockReturnValue('mock-order-by');
      mockGetDocs.mockResolvedValue(mockQuerySnapshot);

      const patterns = await service.getUserPatterns();

      expect(patterns).toHaveLength(2);
      expect(patterns[0]).toEqual(expect.objectContaining({
        id: 'pattern-1',
        name: 'Pattern 1'
      }));
    });

    it('should apply limit option', async () => {
      mockCollection.mockReturnValue('mock-collection');
      mockQuery.mockReturnValue('mock-query');
      mockOrderBy.mockReturnValue('mock-order-by');
      mockLimit.mockReturnValue('mock-limited-query');
      mockGetDocs.mockResolvedValue({ docs: [] });

      await service.getUserPatterns({ limit: 5 });

      expect(mockLimit).toHaveBeenCalledWith(5);
    });
  });

  describe('subscribeToPattern', () => {
    it('should subscribe to pattern updates', () => {
      const mockCallback = vi.fn();
      const mockUnsubscribe = vi.fn();
      
      mockDoc.mockReturnValue('mock-doc-ref');
      mockOnSnapshot.mockReturnValue(mockUnsubscribe);

      const unsubscribe = service.subscribeToPattern('pattern-123', mockCallback);

      expect(mockOnSnapshot).toHaveBeenCalledWith('mock-doc-ref', expect.any(Function));
      expect(unsubscribe).toBe(mockUnsubscribe);
    });
  });

  describe('formatPatternForFirestore', () => {
    it('should format pattern data correctly for Firestore', () => {
      const formatted = service.formatPatternForFirestore(mockPattern);

      expect(formatted).toEqual({
        name: 'Test Pattern',
        bpm: 120,
        swing: 10,
        stepResolution: 16,
        tracks: [{
          id: 'kick',
          name: 'Kick',
          sampleId: 'kick_001',
          volume: 0.8,
          mute: false,
          solo: false,
          color: '#06b6d4',
          steps: [true, false, false, false, true, false, false, false, 
                  true, false, false, false, true, false, false, false],
          velocities: Array(16).fill(1.0),
          randomization: { velocity: 0, timing: 0 }
        }],
        metadata: {
          public: false,
          tags: ['electronic'],
          description: 'Test pattern',
          version: 1
        }
      });
    });
  });

  describe('validatePattern', () => {
    it('should validate valid pattern', () => {
      expect(() => service.validatePattern(mockPattern)).not.toThrow();
    });

    it('should throw error for invalid pattern name', () => {
      const invalidPattern = { ...mockPattern, name: '' };
      expect(() => service.validatePattern(invalidPattern))
        .toThrow('Pattern must have a valid name');
    });

    it('should throw error for invalid BPM', () => {
      const invalidPattern = { ...mockPattern, bpm: 300 };
      expect(() => service.validatePattern(invalidPattern))
        .toThrow('Pattern BPM must be between 60 and 200');
    });

    it('should throw error for missing tracks', () => {
      const invalidPattern = { ...mockPattern, tracks: [] };
      expect(() => service.validatePattern(invalidPattern))
        .toThrow('Pattern must have at least one track');
    });

    it('should throw error for invalid track steps length', () => {
      const invalidPattern = {
        ...mockPattern,
        tracks: [{
          ...mockPattern.tracks[0],
          steps: [{ active: true, velocity: 1.0 }] // Wrong length
        }]
      };
      expect(() => service.validatePattern(invalidPattern))
        .toThrow('Track 0 steps length must match pattern step resolution');
    });
  });
});