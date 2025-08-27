/**
 * Integration tests for Sample Library Management
 * Tests the complete workflow of sample library operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CloudStorageService } from '../CloudStorageService.js';
import { SAMPLE_LIBRARY_CONFIG, validateSampleFile, getUserPermissions } from '../../../config/sampleLibraryConfig.js';

// Mock Firebase
const mockStorage = {
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
  listAll: vi.fn(),
  getMetadata: vi.fn(),
  deleteObject: vi.fn()
};

const mockAuth = {
  currentUser: {
    uid: 'test-user-123',
    customClaims: {}
  }
};

vi.mock('firebase/storage', () => ({
  ref: mockStorage.ref,
  uploadBytes: mockStorage.uploadBytes,
  getDownloadURL: mockStorage.getDownloadURL,
  listAll: mockStorage.listAll,
  getMetadata: mockStorage.getMetadata,
  deleteObject: mockStorage.deleteObject
}));

vi.mock('../../../firebase.js', () => ({
  storage: {},
  auth: mockAuth
}));

describe('Sample Library Integration', () => {
  let cloudStorageService;

  beforeEach(() => {
    cloudStorageService = new CloudStorageService();
    vi.clearAllMocks();
  });

  describe('File Validation', () => {
    it('should validate audio files correctly', () => {
      const validFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      Object.defineProperty(validFile, 'size', { value: 1024 * 1024 }); // 1MB

      const userPermissions = { maxPackSize: 10 * 1024 * 1024 }; // 10MB
      const result = validateSampleFile(validFile, userPermissions);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject files that are too large', () => {
      const largeFile = new File(['audio data'], 'large.wav', { type: 'audio/wav' });
      Object.defineProperty(largeFile, 'size', { value: 20 * 1024 * 1024 }); // 20MB

      const userPermissions = { maxPackSize: 10 * 1024 * 1024 }; // 10MB
      const result = validateSampleFile(largeFile, userPermissions);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File size exceeds maximum of 10MB');
    });

    it('should reject non-audio files', () => {
      const textFile = new File(['text data'], 'test.txt', { type: 'text/plain' });
      Object.defineProperty(textFile, 'size', { value: 1024 });

      const userPermissions = { maxPackSize: 10 * 1024 * 1024 };
      const result = validateSampleFile(textFile, userPermissions);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('File format not supported'))).toBe(true);
    });
  });

  describe('User Permissions', () => {
    it('should return guest permissions for no user', () => {
      const permissions = getUserPermissions(null);
      expect(permissions).toEqual(SAMPLE_LIBRARY_CONFIG.permissions.guest);
    });

    it('should return admin permissions for admin user', () => {
      const adminUser = {
        customClaims: { admin: true }
      };
      const permissions = getUserPermissions(adminUser);
      expect(permissions).toEqual(SAMPLE_LIBRARY_CONFIG.permissions.admin);
    });

    it('should return user permissions for regular user', () => {
      const regularUser = {
        customClaims: {}
      };
      const permissions = getUserPermissions(regularUser);
      expect(permissions).toEqual(SAMPLE_LIBRARY_CONFIG.permissions.user);
    });
  });

  describe('Sample Pack Operations', () => {
    it('should upload sample pack successfully', async () => {
      const mockFiles = [
        new File(['audio1'], 'kick.wav', { type: 'audio/wav' }),
        new File(['audio2'], 'snare.wav', { type: 'audio/wav' })
      ];

      const mockRef = { fullPath: 'sample-packs/test-pack/kick.wav' };
      const mockSnapshot = { 
        ref: mockRef, 
        metadata: { size: 1024, contentType: 'audio/wav' } 
      };

      mockStorage.ref.mockReturnValue(mockRef);
      mockStorage.uploadBytes.mockResolvedValue(mockSnapshot);
      mockStorage.getDownloadURL.mockResolvedValue('https://example.com/kick.wav');

      const result = await cloudStorageService.uploadSamplePack(
        'test-pack',
        mockFiles,
        { public: true, packName: 'Test Pack' }
      );

      expect(result.packId).toBe('test-pack');
      expect(result.samples).toHaveLength(2);
      expect(mockStorage.uploadBytes).toHaveBeenCalledTimes(2);
    });

    it('should list public sample packs', async () => {
      const mockPrefixes = [
        { name: 'trap-essentials' },
        { name: 'house-drums' }
      ];

      const mockListResult = {
        prefixes: mockPrefixes,
        items: []
      };

      const mockPackItems = {
        items: [
          { name: 'kick.wav' },
          { name: 'snare.wav' }
        ]
      };

      mockStorage.listAll
        .mockResolvedValueOnce(mockListResult)
        .mockResolvedValue(mockPackItems);

      mockStorage.getMetadata.mockResolvedValue({
        customMetadata: {
          packName: 'Test Pack',
          packDescription: 'Test Description',
          tags: 'trap,drums'
        }
      });

      const packs = await cloudStorageService.listPublicSamplePacks();

      expect(packs).toHaveLength(2);
      expect(packs[0].packId).toBe('trap-essentials');
      expect(packs[0].sampleCount).toBe(2);
    });

    it('should get sample pack contents', async () => {
      const mockItems = [
        { name: 'kick.wav', fullPath: 'sample-packs/test-pack/kick.wav' },
        { name: 'snare.wav', fullPath: 'sample-packs/test-pack/snare.wav' }
      ];

      mockStorage.listAll.mockResolvedValue({ items: mockItems });
      mockStorage.getMetadata.mockResolvedValue({
        size: 1024,
        contentType: 'audio/wav',
        updated: new Date().toISOString(),
        customMetadata: { bpm: '140' }
      });
      mockStorage.getDownloadURL.mockResolvedValue('https://example.com/sample.wav');

      const packData = await cloudStorageService.getSamplePack('test-pack', true);

      expect(packData.packId).toBe('test-pack');
      expect(packData.samples).toHaveLength(2);
      expect(packData.samples[0].name).toBe('kick.wav');
      expect(packData.totalSize).toBe(2048); // 2 * 1024
    });

    it('should delete sample pack', async () => {
      const mockItems = [
        { name: 'kick.wav' },
        { name: 'snare.wav' }
      ];

      mockStorage.listAll.mockResolvedValue({ items: mockItems });
      mockStorage.deleteObject.mockResolvedValue();

      const result = await cloudStorageService.deleteSamplePack('test-pack', true);

      expect(result.packId).toBe('test-pack');
      expect(result.deletedSamples).toBe(2);
      expect(mockStorage.deleteObject).toHaveBeenCalledTimes(2);
    });
  });

  describe('Individual Sample Operations', () => {
    it('should upload single sample', async () => {
      const mockFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      const mockRef = { fullPath: 'user-uploads/test-user-123/individual/test.wav' };
      const mockSnapshot = { 
        ref: mockRef, 
        metadata: { 
          size: 1024, 
          contentType: 'audio/wav',
          customMetadata: { uploadedBy: 'test-user-123' }
        } 
      };

      mockStorage.ref.mockReturnValue(mockRef);
      mockStorage.uploadBytes.mockResolvedValue(mockSnapshot);
      mockStorage.getDownloadURL.mockResolvedValue('https://example.com/test.wav');

      const result = await cloudStorageService.uploadSample(mockFile);

      expect(result.name).toBe('test.wav');
      expect(result.downloadURL).toBe('https://example.com/test.wav');
      expect(result.size).toBe(1024);
    });

    it('should get download URL for sample', async () => {
      const samplePath = 'sample-packs/test-pack/kick.wav';
      mockStorage.getDownloadURL.mockResolvedValue('https://example.com/kick.wav');

      const url = await cloudStorageService.getSampleDownloadURL(samplePath);

      expect(url).toBe('https://example.com/kick.wav');
      expect(mockStorage.ref).toHaveBeenCalledWith({}, samplePath);
    });

    it('should delete single sample', async () => {
      const samplePath = 'user-uploads/test-user-123/my-pack/sample.wav';
      mockStorage.deleteObject.mockResolvedValue();

      await cloudStorageService.deleteSample(samplePath);

      expect(mockStorage.deleteObject).toHaveBeenCalledTimes(1);
    });
  });

  describe('Storage Statistics', () => {
    it('should calculate user storage stats', async () => {
      const mockItems = [
        { name: 'sample1.wav' },
        { name: 'sample2.wav' }
      ];

      const mockListResult = {
        items: mockItems,
        prefixes: []
      };

      mockStorage.listAll.mockResolvedValue(mockListResult);
      mockStorage.getMetadata.mockResolvedValue({ size: 1024 });

      const stats = await cloudStorageService.getUserStorageStats();

      expect(stats.fileCount).toBe(2);
      expect(stats.totalSize).toBe(2048);
      expect(stats.formattedSize).toBe('2 KB');
    });

    it('should handle empty user storage', async () => {
      const error = new Error('Object not found');
      error.code = 'storage/object-not-found';
      mockStorage.listAll.mockRejectedValue(error);

      const stats = await cloudStorageService.getUserStorageStats();

      expect(stats.fileCount).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.formattedSize).toBe('0 B');
    });
  });

  describe('Error Handling', () => {
    it('should handle upload failures gracefully', async () => {
      const mockFile = new File(['audio'], 'test.wav', { type: 'audio/wav' });
      mockStorage.uploadBytes.mockRejectedValue(new Error('Upload failed'));

      await expect(cloudStorageService.uploadSample(mockFile)).rejects.toThrow('Failed to upload sample: Upload failed');
    });

    it('should handle authentication errors', async () => {
      mockAuth.currentUser = null;
      const mockFile = new File(['audio'], 'test.wav', { type: 'audio/wav' });

      await expect(cloudStorageService.uploadSample(mockFile)).rejects.toThrow('User must be authenticated');
    });

    it('should handle permission errors for public packs', async () => {
      mockAuth.currentUser = {
        uid: 'test-user',
        customClaims: {} // No admin claim
      };

      const mockFiles = [new File(['audio'], 'test.wav', { type: 'audio/wav' })];

      await expect(
        cloudStorageService.uploadSamplePack('test-pack', mockFiles, { public: true })
      ).rejects.toThrow('Only administrators can upload public sample packs');
    });
  });

  describe('File Utilities', () => {
    it('should sanitize file names correctly', () => {
      const service = new CloudStorageService();
      
      expect(service.sanitizeFileName('My Sample!@#.wav')).toBe('my_sample___.wav');
      expect(service.sanitizeFileName('normal-file.wav')).toBe('normal-file.wav');
      expect(service.sanitizeFileName('file with spaces.wav')).toBe('file_with_spaces.wav');
    });

    it('should generate unique sample IDs', () => {
      const service = new CloudStorageService();
      
      const id1 = service.generateSampleId('test.wav');
      const id2 = service.generateSampleId('test.wav');
      
      expect(id1).toMatch(/^test_\d+$/);
      expect(id2).toMatch(/^test_\d+$/);
      expect(id1).not.toBe(id2);
    });

    it('should format bytes correctly', () => {
      const service = new CloudStorageService();
      
      expect(service.formatBytes(0)).toBe('0 B');
      expect(service.formatBytes(1024)).toBe('1 KB');
      expect(service.formatBytes(1024 * 1024)).toBe('1 MB');
      expect(service.formatBytes(1536)).toBe('1.5 KB');
    });
  });
});