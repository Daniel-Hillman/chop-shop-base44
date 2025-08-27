import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject, 
  listAll,
  getMetadata
} from 'firebase/storage';
import { storage, auth } from '../../firebase.js';

/**
 * Cloud Storage Service for Sample Library Management
 * Handles sample pack storage, organization, and access controls
 */
export class CloudStorageService {
  constructor() {
    this.samplePacksPath = 'sample-packs';
    this.userUploadsPath = 'user-uploads';
    this.maxFileSize = 10 * 1024 * 1024; // 10MB max file size
    this.allowedFormats = ['wav', 'mp3', 'aiff', 'flac'];
  }

  /**
   * Upload a sample pack to Cloud Storage
   * @param {string} packId - Sample pack ID
   * @param {Array} sampleFiles - Array of sample files
   * @param {Object} metadata - Pack metadata
   * @returns {Promise<Object>} Upload result with URLs
   */
  async uploadSamplePack(packId, sampleFiles, metadata = {}) {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to upload sample packs');
    }

    // Check if user has admin privileges (for public packs)
    if (metadata.public && !user.customClaims?.admin) {
      throw new Error('Only administrators can upload public sample packs');
    }

    const uploadResults = [];
    const packPath = metadata.public 
      ? `${this.samplePacksPath}/${packId}`
      : `${this.userUploadsPath}/${user.uid}/${packId}`;

    try {
      for (const sampleFile of sampleFiles) {
        // Validate file
        this.validateSampleFile(sampleFile);

        // Create storage reference
        const sampleRef = ref(storage, `${packPath}/${sampleFile.name}`);

        // Upload file with metadata
        const uploadMetadata = {
          contentType: sampleFile.type,
          customMetadata: {
            packId,
            uploadedBy: user.uid,
            uploadedAt: new Date().toISOString(),
            originalName: sampleFile.name,
            ...metadata.customMetadata
          }
        };

        const snapshot = await uploadBytes(sampleRef, sampleFile, uploadMetadata);
        const downloadURL = await getDownloadURL(snapshot.ref);

        uploadResults.push({
          name: sampleFile.name,
          path: snapshot.ref.fullPath,
          downloadURL,
          size: snapshot.metadata.size,
          contentType: snapshot.metadata.contentType
        });
      }

      return {
        packId,
        packPath,
        samples: uploadResults,
        totalSize: uploadResults.reduce((sum, sample) => sum + sample.size, 0)
      };
    } catch (error) {
      // Clean up any uploaded files on error
      await this.cleanupFailedUpload(packPath, uploadResults);
      throw new Error(`Failed to upload sample pack: ${error.message}`);
    }
  }

  /**
   * Upload a single sample file
   * @param {File} sampleFile - Sample file to upload
   * @param {string} packId - Pack ID (optional)
   * @param {Object} metadata - File metadata
   * @returns {Promise<Object>} Upload result
   */
  async uploadSample(sampleFile, packId = null, metadata = {}) {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to upload samples');
    }

    // Validate file
    this.validateSampleFile(sampleFile);

    // Determine upload path
    const fileName = this.sanitizeFileName(sampleFile.name);
    const uploadPath = packId 
      ? `${this.userUploadsPath}/${user.uid}/${packId}/${fileName}`
      : `${this.userUploadsPath}/${user.uid}/individual/${fileName}`;

    const sampleRef = ref(storage, uploadPath);

    // Upload metadata
    const uploadMetadata = {
      contentType: sampleFile.type,
      customMetadata: {
        uploadedBy: user.uid,
        uploadedAt: new Date().toISOString(),
        originalName: sampleFile.name,
        packId: packId || 'individual',
        ...metadata
      }
    };

    try {
      const snapshot = await uploadBytes(sampleRef, sampleFile, uploadMetadata);
      const downloadURL = await getDownloadURL(snapshot.ref);

      return {
        id: this.generateSampleId(fileName),
        name: fileName,
        originalName: sampleFile.name,
        path: snapshot.ref.fullPath,
        downloadURL,
        size: snapshot.metadata.size,
        contentType: snapshot.metadata.contentType,
        metadata: snapshot.metadata.customMetadata
      };
    } catch (error) {
      throw new Error(`Failed to upload sample: ${error.message}`);
    }
  }

  /**
   * Get sample pack contents from Cloud Storage
   * @param {string} packId - Sample pack ID
   * @param {boolean} isPublic - Whether pack is public
   * @returns {Promise<Object>} Sample pack data
   */
  async getSamplePack(packId, isPublic = true) {
    const packPath = isPublic 
      ? `${this.samplePacksPath}/${packId}`
      : `${this.userUploadsPath}/${auth.currentUser?.uid}/${packId}`;

    try {
      const packRef = ref(storage, packPath);
      const listResult = await listAll(packRef);

      const samples = await Promise.all(
        listResult.items.map(async (itemRef) => {
          const metadata = await getMetadata(itemRef);
          const downloadURL = await getDownloadURL(itemRef);

          return {
            id: this.generateSampleId(itemRef.name),
            name: itemRef.name,
            path: itemRef.fullPath,
            downloadURL,
            size: metadata.size,
            contentType: metadata.contentType,
            metadata: metadata.customMetadata || {},
            lastModified: metadata.updated
          };
        })
      );

      return {
        packId,
        path: packPath,
        samples,
        totalSize: samples.reduce((sum, sample) => sum + sample.size, 0),
        sampleCount: samples.length
      };
    } catch (error) {
      throw new Error(`Failed to get sample pack: ${error.message}`);
    }
  }

  /**
   * List all public sample packs
   * @returns {Promise<Array>} Array of sample pack info
   */
  async listPublicSamplePacks() {
    try {
      const packsRef = ref(storage, this.samplePacksPath);
      const listResult = await listAll(packsRef);

      const packs = await Promise.all(
        listResult.prefixes.map(async (packRef) => {
          const packId = packRef.name;
          const samples = await listAll(packRef);
          
          // Get metadata from first sample to determine pack info
          let packMetadata = {};
          if (samples.items.length > 0) {
            const firstSampleMetadata = await getMetadata(samples.items[0]);
            packMetadata = firstSampleMetadata.customMetadata || {};
          }

          return {
            packId,
            name: packMetadata.packName || packId,
            description: packMetadata.packDescription || '',
            sampleCount: samples.items.length,
            tags: packMetadata.tags ? packMetadata.tags.split(',') : [],
            createdAt: packMetadata.createdAt || null
          };
        })
      );

      return packs.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      throw new Error(`Failed to list sample packs: ${error.message}`);
    }
  }

  /**
   * List user's uploaded sample packs
   * @returns {Promise<Array>} Array of user's sample packs
   */
  async listUserSamplePacks() {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to list sample packs');
    }

    try {
      const userPacksRef = ref(storage, `${this.userUploadsPath}/${user.uid}`);
      const listResult = await listAll(userPacksRef);

      const packs = await Promise.all(
        listResult.prefixes.map(async (packRef) => {
          const packId = packRef.name;
          const samples = await listAll(packRef);
          
          let packMetadata = {};
          if (samples.items.length > 0) {
            const firstSampleMetadata = await getMetadata(samples.items[0]);
            packMetadata = firstSampleMetadata.customMetadata || {};
          }

          return {
            packId,
            name: packMetadata.packName || packId,
            description: packMetadata.packDescription || '',
            sampleCount: samples.items.length,
            isPublic: false,
            createdAt: packMetadata.createdAt || null
          };
        })
      );

      return packs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      throw new Error(`Failed to list user sample packs: ${error.message}`);
    }
  }

  /**
   * Delete a sample pack from Cloud Storage
   * @param {string} packId - Sample pack ID
   * @param {boolean} isPublic - Whether pack is public
   * @returns {Promise<void>}
   */
  async deleteSamplePack(packId, isPublic = false) {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to delete sample packs');
    }

    // Check permissions
    if (isPublic && !user.customClaims?.admin) {
      throw new Error('Only administrators can delete public sample packs');
    }

    const packPath = isPublic 
      ? `${this.samplePacksPath}/${packId}`
      : `${this.userUploadsPath}/${user.uid}/${packId}`;

    try {
      const packRef = ref(storage, packPath);
      const listResult = await listAll(packRef);

      // Delete all samples in the pack
      await Promise.all(
        listResult.items.map(itemRef => deleteObject(itemRef))
      );

      return { packId, deletedSamples: listResult.items.length };
    } catch (error) {
      throw new Error(`Failed to delete sample pack: ${error.message}`);
    }
  }

  /**
   * Delete a single sample file
   * @param {string} samplePath - Full path to sample file
   * @returns {Promise<void>}
   */
  async deleteSample(samplePath) {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to delete samples');
    }

    // Verify user owns the sample (for user uploads)
    if (samplePath.includes(this.userUploadsPath) && !samplePath.includes(user.uid)) {
      throw new Error('You can only delete your own samples');
    }

    try {
      const sampleRef = ref(storage, samplePath);
      await deleteObject(sampleRef);
    } catch (error) {
      throw new Error(`Failed to delete sample: ${error.message}`);
    }
  }

  /**
   * Get download URL for a sample
   * @param {string} samplePath - Full path to sample file
   * @returns {Promise<string>} Download URL
   */
  async getSampleDownloadURL(samplePath) {
    try {
      const sampleRef = ref(storage, samplePath);
      return await getDownloadURL(sampleRef);
    } catch (error) {
      throw new Error(`Failed to get download URL: ${error.message}`);
    }
  }

  /**
   * Validate sample file before upload
   * @param {File} file - File to validate
   * @throws {Error} If file is invalid
   */
  validateSampleFile(file) {
    if (!file) {
      throw new Error('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new Error(`File size exceeds maximum of ${this.maxFileSize / 1024 / 1024}MB`);
    }

    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!this.allowedFormats.includes(fileExtension)) {
      throw new Error(`File format not supported. Allowed formats: ${this.allowedFormats.join(', ')}`);
    }

    if (!file.type.startsWith('audio/')) {
      throw new Error('File must be an audio file');
    }
  }

  /**
   * Sanitize file name for storage
   * @param {string} fileName - Original file name
   * @returns {string} Sanitized file name
   */
  sanitizeFileName(fileName) {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
  }

  /**
   * Generate unique sample ID from file name
   * @param {string} fileName - File name
   * @returns {string} Sample ID
   */
  generateSampleId(fileName) {
    const baseName = fileName.split('.')[0];
    const timestamp = Date.now();
    return `${baseName}_${timestamp}`;
  }

  /**
   * Clean up failed upload by deleting uploaded files
   * @param {string} packPath - Pack path
   * @param {Array} uploadedFiles - Array of uploaded file info
   */
  async cleanupFailedUpload(packPath, uploadedFiles) {
    try {
      await Promise.all(
        uploadedFiles.map(file => {
          const fileRef = ref(storage, file.path);
          return deleteObject(fileRef);
        })
      );
    } catch (error) {
      console.error('Failed to cleanup uploaded files:', error);
    }
  }

  /**
   * Get storage usage statistics for user
   * @returns {Promise<Object>} Storage usage stats
   */
  async getUserStorageStats() {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to get storage stats');
    }

    try {
      const userRef = ref(storage, `${this.userUploadsPath}/${user.uid}`);
      const listResult = await listAll(userRef);

      let totalSize = 0;
      let fileCount = 0;

      // Get all files recursively
      const getAllFiles = async (folderRef) => {
        const result = await listAll(folderRef);
        
        for (const itemRef of result.items) {
          const metadata = await getMetadata(itemRef);
          totalSize += metadata.size;
          fileCount++;
        }

        // Recursively process subfolders
        for (const prefixRef of result.prefixes) {
          await getAllFiles(prefixRef);
        }
      };

      await getAllFiles(userRef);

      return {
        totalSize,
        fileCount,
        formattedSize: this.formatBytes(totalSize),
        maxSize: this.maxFileSize * 100, // Allow 100 files max
        usagePercentage: (totalSize / (this.maxFileSize * 100)) * 100
      };
    } catch (error) {
      // If user folder doesn't exist, return zero stats
      if (error.code === 'storage/object-not-found') {
        return {
          totalSize: 0,
          fileCount: 0,
          formattedSize: '0 B',
          maxSize: this.maxFileSize * 100,
          usagePercentage: 0
        };
      }
      throw new Error(`Failed to get storage stats: ${error.message}`);
    }
  }

  /**
   * Format bytes to human readable string
   * @param {number} bytes - Bytes to format
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export const cloudStorageService = new CloudStorageService();