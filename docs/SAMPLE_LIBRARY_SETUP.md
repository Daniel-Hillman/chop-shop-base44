# Sample Library Cloud Storage Setup

This document describes how to configure and manage the sample library using Google Cloud Storage for the drum sequencer.

## Overview

The sample library uses Firebase Cloud Storage to store and organize sample packs with the following structure:

```
/sample-packs/          # Public sample packs (admin managed)
  /trap-essentials/
    kick_trap_01.wav
    snare_trap_01.wav
    ...
  /house-drums/
    kick_house_01.wav
    ...

/user-uploads/          # User uploaded samples
  /{userId}/
    /my-pack-1/
      sample1.wav
      ...
    /individual/
      sample.wav

/temp-uploads/          # Temporary upload staging
  /{userId}/
    temp_file.wav

/sample-pack-assets/    # Pack thumbnails and metadata
  /{packId}/
    thumbnail.jpg
    metadata.json
```

## Setup Instructions

### 1. Firebase Storage Rules

Deploy the storage rules to secure your sample library:

```bash
firebase deploy --only storage
```

The rules are defined in `storage.rules` and provide:
- Public read access to sample packs for authenticated users
- Admin-only write access to public packs
- User-specific access to personal uploads
- File type and size validation

### 2. Environment Variables

Set up the following environment variables for the setup script:

```bash
# Firebase Configuration
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id

# Admin Credentials (for setup script)
ADMIN_EMAIL=admin@yourproject.com
ADMIN_PASSWORD=your_admin_password
```

### 3. Sample Pack Upload

Run the setup script to create the initial sample library:

```bash
node scripts/setupSampleLibrary.js
```

This will:
1. Create the necessary directory structure
2. Upload default sample packs
3. Set proper metadata for organization

### 4. Manual Sample Pack Creation

To manually add sample packs:

1. Create a folder in `assets/samples/{pack-id}/`
2. Add your sample files (WAV, MP3, AIFF, FLAC)
3. Run the upload script or use the admin interface

## File Constraints

### Supported Formats
- WAV (preferred)
- MP3
- AIFF
- FLAC
- OGG

### Size Limits
- Individual samples: 10MB max
- Sample packs: 100MB max
- User storage quota: 500MB total

### Quality Requirements
- Sample rate: 44.1kHz preferred
- Bit depth: 16-bit minimum
- Channels: Mono or stereo

## Sample Pack Organization

### Categories
- **Drums**: Kick, snare, hi-hat, percussion, loops
- **Bass**: Synth bass, acoustic bass, sub bass
- **Synths**: Leads, pads, arpeggios, effects
- **Vocals**: Vocal chops, loops, ad-libs
- **FX**: Risers, impacts, sweeps, ambient
- **Melodic**: Piano, guitar, strings, brass

### Metadata Structure

Each sample pack includes:

```json
{
  "name": "Pack Name",
  "description": "Pack description",
  "category": "drums",
  "subcategory": "loops",
  "tags": ["trap", "hip-hop", "drums"],
  "bpm": 140,
  "key": "C",
  "author": "Producer Name",
  "license": "royalty-free",
  "version": "1.0.0",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

## Security and Access Control

### User Permissions

- **Guest**: No access
- **User**: Download and upload samples, create personal packs
- **Premium**: Extended quotas and features
- **Admin**: Manage public packs, unlimited storage

### Storage Rules

The storage rules enforce:
- Authentication required for all access
- Users can only access their own uploads
- File type and size validation
- Admin-only access to public packs

## API Usage

### CloudStorageService Methods

```javascript
import { cloudStorageService } from './services/sequencer/CloudStorageService.js';

// Upload a sample pack
const result = await cloudStorageService.uploadSamplePack(
  'my-pack',
  sampleFiles,
  { name: 'My Pack', public: false }
);

// Get public sample packs
const packs = await cloudStorageService.listPublicSamplePacks();

// Download a sample pack
const packData = await cloudStorageService.getSamplePack('trap-essentials');
```

## Monitoring and Maintenance

### Storage Usage

Monitor storage usage through:
- Firebase Console
- CloudStorageService.getUserStorageStats()
- Custom analytics dashboard

### Performance Optimization

- Implement sample caching for frequently used packs
- Use CDN for global distribution
- Compress samples for preview playback
- Lazy load sample packs

### Backup Strategy

- Regular exports of user-generated content
- Version control for public sample packs
- Automated backup to secondary storage

## Troubleshooting

### Common Issues

1. **Upload Failures**
   - Check file format and size
   - Verify user authentication
   - Check storage quotas

2. **Access Denied**
   - Verify storage rules deployment
   - Check user permissions
   - Confirm authentication state

3. **Performance Issues**
   - Implement caching
   - Optimize file sizes
   - Use appropriate regions

### Debug Commands

```bash
# Check storage rules
firebase storage:rules:get

# View storage usage
firebase storage:usage

# Test authentication
firebase auth:test
```

## Future Enhancements

- Automatic sample analysis (BPM, key detection)
- Collaborative sample pack creation
- Sample marketplace integration
- AI-powered sample recommendations
- Real-time collaboration features