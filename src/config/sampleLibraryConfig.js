/**
 * Sample Library Configuration
 * Defines the structure and organization of the sample library in Cloud Storage
 */

export const SAMPLE_LIBRARY_CONFIG = {
  // Storage paths
  paths: {
    publicPacks: 'sample-packs',
    userUploads: 'user-uploads',
    tempUploads: 'temp-uploads',
    packAssets: 'sample-pack-assets'
  },

  // File constraints
  constraints: {
    maxFileSize: 10 * 1024 * 1024, // 10MB per sample
    maxPackSize: 100 * 1024 * 1024, // 100MB per pack
    maxUserStorage: 500 * 1024 * 1024, // 500MB per user
    allowedFormats: ['wav', 'mp3', 'aiff', 'flac', 'ogg'],
    allowedMimeTypes: [
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/mpeg',
      'audio/mp3',
      'audio/aiff',
      'audio/x-aiff',
      'audio/flac',
      'audio/ogg'
    ]
  },

  // Sample pack categories and organization
  categories: {
    drums: {
      name: 'Drums',
      description: 'Drum samples and percussion',
      subcategories: ['kick', 'snare', 'hihat', 'cymbal', 'percussion', 'loops']
    },
    bass: {
      name: 'Bass',
      description: 'Bass samples and loops',
      subcategories: ['synth-bass', 'acoustic-bass', 'bass-loops', 'sub-bass']
    },
    synth: {
      name: 'Synths',
      description: 'Synthesizer samples and leads',
      subcategories: ['leads', 'pads', 'arps', 'fx', 'stabs']
    },
    vocal: {
      name: 'Vocals',
      description: 'Vocal samples and chops',
      subcategories: ['vocal-chops', 'vocal-loops', 'adlibs', 'spoken']
    },
    fx: {
      name: 'Effects',
      description: 'Sound effects and transitions',
      subcategories: ['risers', 'impacts', 'sweeps', 'ambient', 'noise']
    },
    melodic: {
      name: 'Melodic',
      description: 'Melodic instruments and loops',
      subcategories: ['piano', 'guitar', 'strings', 'brass', 'woodwind']
    }
  },

  // Default sample packs to be included
  defaultPacks: [
    {
      id: 'trap-essentials',
      name: 'Trap Essentials',
      description: 'Essential trap drum samples',
      category: 'drums',
      subcategory: 'loops',
      tags: ['trap', 'hip-hop', 'drums', 'essential'],
      public: true,
      samples: [
        'kick_trap_01.wav',
        'kick_trap_02.wav',
        'snare_trap_01.wav',
        'snare_trap_02.wav',
        'hihat_trap_01.wav',
        'hihat_trap_02.wav',
        'openhat_trap_01.wav',
        'perc_trap_01.wav'
      ]
    },
    {
      id: 'house-drums',
      name: 'House Drums',
      description: 'Classic house drum samples',
      category: 'drums',
      subcategory: 'loops',
      tags: ['house', 'electronic', 'drums', 'classic'],
      public: true,
      samples: [
        'kick_house_01.wav',
        'kick_house_02.wav',
        'snare_house_01.wav',
        'hihat_house_01.wav',
        'hihat_house_02.wav',
        'perc_house_01.wav',
        'shaker_house_01.wav',
        'clap_house_01.wav'
      ]
    },
    {
      id: 'techno-basics',
      name: 'Techno Basics',
      description: 'Fundamental techno drum samples',
      category: 'drums',
      subcategory: 'loops',
      tags: ['techno', 'electronic', 'drums', 'basic'],
      public: true,
      samples: [
        'kick_techno_01.wav',
        'kick_techno_02.wav',
        'hihat_techno_01.wav',
        'hihat_techno_02.wav',
        'perc_techno_01.wav',
        'fx_techno_01.wav',
        'cymbal_techno_01.wav',
        'clap_techno_01.wav'
      ]
    }
  ],

  // Sample metadata structure
  sampleMetadata: {
    required: ['name', 'category', 'bpm', 'key'],
    optional: ['description', 'tags', 'genre', 'mood', 'energy', 'instrument'],
    validation: {
      name: { type: 'string', maxLength: 100 },
      category: { type: 'string', enum: ['drums', 'bass', 'synth', 'vocal', 'fx', 'melodic'] },
      bpm: { type: 'number', min: 60, max: 200 },
      key: { type: 'string', enum: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'N/A'] },
      tags: { type: 'array', maxItems: 10 },
      energy: { type: 'number', min: 1, max: 10 }
    }
  },

  // Pack metadata structure
  packMetadata: {
    required: ['name', 'description', 'category', 'tags'],
    optional: ['author', 'version', 'license', 'website', 'artwork'],
    validation: {
      name: { type: 'string', maxLength: 100 },
      description: { type: 'string', maxLength: 500 },
      category: { type: 'string', enum: ['drums', 'bass', 'synth', 'vocal', 'fx', 'melodic'] },
      tags: { type: 'array', maxItems: 10 },
      version: { type: 'string', pattern: /^\d+\.\d+\.\d+$/ },
      license: { type: 'string', enum: ['royalty-free', 'creative-commons', 'commercial', 'custom'] }
    }
  },

  // Quality settings for sample processing
  quality: {
    sampleRate: 44100,
    bitDepth: 16,
    channels: 2, // Stereo preferred, mono acceptable
    normalization: true,
    fadeIn: 0.01, // 10ms fade in
    fadeOut: 0.01 // 10ms fade out
  },

  // Caching and performance settings
  cache: {
    maxCacheSize: 50 * 1024 * 1024, // 50MB cache
    preloadCount: 8, // Preload 8 samples per pack
    compressionLevel: 0.8, // For preview generation
    thumbnailSize: 200 // Waveform thumbnail width
  },

  // User permissions and quotas
  permissions: {
    guest: {
      canDownload: false,
      canUpload: false,
      canCreatePacks: false
    },
    user: {
      canDownload: true,
      canUpload: true,
      canCreatePacks: true,
      maxUploads: 100,
      maxPackSize: 50 * 1024 * 1024 // 50MB
    },
    premium: {
      canDownload: true,
      canUpload: true,
      canCreatePacks: true,
      maxUploads: 500,
      maxPackSize: 200 * 1024 * 1024 // 200MB
    },
    admin: {
      canDownload: true,
      canUpload: true,
      canCreatePacks: true,
      canManagePublicPacks: true,
      maxUploads: -1, // Unlimited
      maxPackSize: -1 // Unlimited
    }
  }
};

/**
 * Get user permissions based on user claims
 * @param {Object} user - Firebase user object
 * @returns {Object} User permissions
 */
export function getUserPermissions(user) {
  if (!user) return SAMPLE_LIBRARY_CONFIG.permissions.guest;
  
  const claims = user.customClaims || {};
  
  if (claims.admin) return SAMPLE_LIBRARY_CONFIG.permissions.admin;
  if (claims.premium) return SAMPLE_LIBRARY_CONFIG.permissions.premium;
  
  return SAMPLE_LIBRARY_CONFIG.permissions.user;
}

/**
 * Validate sample file against configuration
 * @param {File} file - File to validate
 * @param {Object} userPermissions - User permissions
 * @returns {Object} Validation result
 */
export function validateSampleFile(file, userPermissions) {
  const errors = [];
  const config = SAMPLE_LIBRARY_CONFIG.constraints;
  
  // Check file size
  if (file.size > config.maxFileSize) {
    errors.push(`File size exceeds maximum of ${config.maxFileSize / 1024 / 1024}MB`);
  }
  
  if (userPermissions.maxPackSize > 0 && file.size > userPermissions.maxPackSize) {
    errors.push(`File size exceeds your limit of ${userPermissions.maxPackSize / 1024 / 1024}MB`);
  }
  
  // Check file format
  const extension = file.name.split('.').pop().toLowerCase();
  if (!config.allowedFormats.includes(extension)) {
    errors.push(`File format not supported. Allowed: ${config.allowedFormats.join(', ')}`);
  }
  
  // Check MIME type
  if (!config.allowedMimeTypes.includes(file.type)) {
    errors.push(`File type not supported: ${file.type}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generate sample pack structure for upload
 * @param {string} packId - Pack identifier
 * @param {Object} metadata - Pack metadata
 * @param {Array} samples - Sample files
 * @returns {Object} Pack structure
 */
export function generatePackStructure(packId, metadata, samples) {
  return {
    id: packId,
    metadata: {
      ...metadata,
      createdAt: new Date().toISOString(),
      version: metadata.version || '1.0.0',
      sampleCount: samples.length,
      totalSize: samples.reduce((sum, sample) => sum + sample.size, 0)
    },
    samples: samples.map((sample, index) => ({
      id: `${packId}_${index + 1}`,
      name: sample.name,
      size: sample.size,
      type: sample.type,
      order: index
    }))
  };
}

export default SAMPLE_LIBRARY_CONFIG;