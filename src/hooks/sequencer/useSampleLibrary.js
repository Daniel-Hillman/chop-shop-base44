import { useState, useEffect, useCallback } from 'react';
import { cloudStorageService } from '../../services/sequencer/CloudStorageService.js';
import { SAMPLE_LIBRARY_CONFIG, getUserPermissions, validateSampleFile } from '../../config/sampleLibraryConfig.js';
import { useAuth } from '../useAuth.js';

/**
 * Hook for managing sample library operations
 * Provides methods for browsing, uploading, and managing samples
 */
export function useSampleLibrary() {
  const { user } = useAuth();
  const [publicPacks, setPublicPacks] = useState([]);
  const [userPacks, setUserPacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [storageStats, setStorageStats] = useState(null);

  // Get user permissions
  const userPermissions = getUserPermissions(user);

  // Load public sample packs
  const loadPublicPacks = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    
    try {
      const packs = await cloudStorageService.listPublicSamplePacks();
      setPublicPacks(packs);
    } catch (err) {
      setError(`Failed to load public packs: ${err.message}`);
      console.error('Failed to load public packs:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load user's sample packs
  const loadUserPacks = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    
    try {
      const packs = await cloudStorageService.listUserSamplePacks();
      setUserPacks(packs);
    } catch (err) {
      setError(`Failed to load user packs: ${err.message}`);
      console.error('Failed to load user packs:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load storage statistics
  const loadStorageStats = useCallback(async () => {
    if (!user) return;

    try {
      const stats = await cloudStorageService.getUserStorageStats();
      setStorageStats(stats);
    } catch (err) {
      console.error('Failed to load storage stats:', err);
    }
  }, [user]);

  // Get sample pack contents
  const getSamplePack = useCallback(async (packId, isPublic = true) => {
    setLoading(true);
    setError(null);
    
    try {
      const packData = await cloudStorageService.getSamplePack(packId, isPublic);
      return packData;
    } catch (err) {
      setError(`Failed to load sample pack: ${err.message}`);
      console.error('Failed to load sample pack:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Upload a single sample
  const uploadSample = useCallback(async (file, packId = null, metadata = {}) => {
    if (!user) {
      throw new Error('User must be authenticated to upload samples');
    }

    // Validate file
    const validation = validateSampleFile(file, userPermissions);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await cloudStorageService.uploadSample(file, packId, metadata);
      
      // Refresh user packs and storage stats
      await Promise.all([
        loadUserPacks(),
        loadStorageStats()
      ]);
      
      return result;
    } catch (err) {
      setError(`Failed to upload sample: ${err.message}`);
      console.error('Failed to upload sample:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, userPermissions, loadUserPacks, loadStorageStats]);

  // Upload a sample pack
  const uploadSamplePack = useCallback(async (packId, files, metadata = {}) => {
    if (!user) {
      throw new Error('User must be authenticated to upload sample packs');
    }

    // Validate all files
    for (const file of files) {
      const validation = validateSampleFile(file, userPermissions);
      if (!validation.valid) {
        throw new Error(`${file.name}: ${validation.errors.join(', ')}`);
      }
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await cloudStorageService.uploadSamplePack(packId, files, metadata);
      
      // Refresh user packs and storage stats
      await Promise.all([
        loadUserPacks(),
        loadStorageStats()
      ]);
      
      return result;
    } catch (err) {
      setError(`Failed to upload sample pack: ${err.message}`);
      console.error('Failed to upload sample pack:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, userPermissions, loadUserPacks, loadStorageStats]);

  // Delete a sample pack
  const deleteSamplePack = useCallback(async (packId, isPublic = false) => {
    if (!user) {
      throw new Error('User must be authenticated to delete sample packs');
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await cloudStorageService.deleteSamplePack(packId, isPublic);
      
      // Refresh appropriate pack list
      if (isPublic) {
        await loadPublicPacks();
      } else {
        await loadUserPacks();
      }
      
      await loadStorageStats();
      
      return result;
    } catch (err) {
      setError(`Failed to delete sample pack: ${err.message}`);
      console.error('Failed to delete sample pack:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, loadPublicPacks, loadUserPacks, loadStorageStats]);

  // Delete a single sample
  const deleteSample = useCallback(async (samplePath) => {
    if (!user) {
      throw new Error('User must be authenticated to delete samples');
    }

    setLoading(true);
    setError(null);
    
    try {
      await cloudStorageService.deleteSample(samplePath);
      
      // Refresh user packs and storage stats
      await Promise.all([
        loadUserPacks(),
        loadStorageStats()
      ]);
    } catch (err) {
      setError(`Failed to delete sample: ${err.message}`);
      console.error('Failed to delete sample:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, loadUserPacks, loadStorageStats]);

  // Get download URL for a sample
  const getSampleDownloadURL = useCallback(async (samplePath) => {
    try {
      return await cloudStorageService.getSampleDownloadURL(samplePath);
    } catch (err) {
      setError(`Failed to get download URL: ${err.message}`);
      console.error('Failed to get download URL:', err);
      throw err;
    }
  }, []);

  // Search samples across packs
  const searchSamples = useCallback(async (query, category = null) => {
    const results = [];
    
    // Search in public packs
    for (const pack of publicPacks) {
      if (category && !pack.tags.includes(category)) continue;
      
      try {
        const packData = await getSamplePack(pack.packId, true);
        const matchingSamples = packData.samples.filter(sample =>
          sample.name.toLowerCase().includes(query.toLowerCase()) ||
          (sample.metadata?.tags && sample.metadata.tags.some(tag => 
            tag.toLowerCase().includes(query.toLowerCase())
          ))
        );
        
        results.push(...matchingSamples.map(sample => ({
          ...sample,
          packId: pack.packId,
          packName: pack.name,
          isPublic: true
        })));
      } catch (err) {
        console.error(`Failed to search in pack ${pack.packId}:`, err);
      }
    }
    
    return results;
  }, [publicPacks, getSamplePack]);

  // Initialize data on mount
  useEffect(() => {
    if (user) {
      Promise.all([
        loadPublicPacks(),
        loadUserPacks(),
        loadStorageStats()
      ]);
    }
  }, [user, loadPublicPacks, loadUserPacks, loadStorageStats]);

  // Clear error after some time
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return {
    // Data
    publicPacks,
    userPacks,
    storageStats,
    userPermissions,
    
    // State
    loading,
    error,
    
    // Actions
    loadPublicPacks,
    loadUserPacks,
    loadStorageStats,
    getSamplePack,
    uploadSample,
    uploadSamplePack,
    deleteSamplePack,
    deleteSample,
    getSampleDownloadURL,
    searchSamples,
    
    // Utilities
    validateFile: (file) => validateSampleFile(file, userPermissions),
    canUpload: userPermissions.canUpload,
    canCreatePacks: userPermissions.canCreatePacks,
    maxUploads: userPermissions.maxUploads,
    maxPackSize: userPermissions.maxPackSize
  };
}