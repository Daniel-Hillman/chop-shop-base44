# Sample Setup Guide

This guide explains how to set up actual audio samples for the drum sequencer.

## Current Status

The sequencer currently uses **generated drum sounds** for testing purposes. These are synthesized audio samples created in JavaScript that simulate kick, snare, hi-hat, and other drum sounds.

## Setting Up Real Audio Samples

### Option 1: Local Sample Files (Recommended for Development)

1. **Create sample directory structure:**
   ```
   public/
   └── samples/
       ├── kick/
       │   ├── kick_001.wav
       │   ├── kick_002.wav
       │   └── kick_003.wav
       ├── snare/
       │   ├── snare_001.wav
       │   ├── snare_002.wav
       │   └── snare_003.wav
       ├── hihat/
       │   ├── hihat_001.wav
       │   ├── hihat_002.wav
       │   └── hihat_003.wav
       └── packs/
           ├── electronic-kit/
           ├── acoustic-kit/
           └── trap-kit/
   ```

2. **Update SampleManager configuration:**
   - Edit `src/services/sequencer/SampleManager.js`
   - Replace the `getDefaultDrumKit()` method to return actual file URLs instead of `generated://` URLs
   - Example:
   ```javascript
   getDefaultDrumKit() {
     return [
       {
         id: 'kick_001',
         url: '/samples/kick/kick_001.wav',
         metadata: {
           name: 'Kick 001',
           duration: 0.8,
           tags: ['kick', 'drum', 'electronic']
         }
       },
       // ... more samples
     ];
   }
   ```

### Option 2: Firebase Cloud Storage (Production)

1. **Set up Firebase Storage:**
   - The infrastructure is already in place in `src/services/sequencer/CloudStorageService.js`
   - Upload sample files to Firebase Storage buckets
   - Organize by sample packs and categories

2. **Configure sample packs:**
   - Edit `src/config/sampleLibraryConfig.js`
   - Define sample pack metadata and file locations

3. **Update SampleManager:**
   - Enable Firebase integration in `loadSamplePack()` method
   - Replace local file loading with Cloud Storage URLs

## Sample File Requirements

- **Format:** WAV or MP3 (WAV recommended for quality)
- **Sample Rate:** 44.1kHz or 48kHz
- **Bit Depth:** 16-bit or 24-bit
- **Length:** 0.1s - 3s (depending on drum type)
- **Naming:** Descriptive names like `kick_808_001.wav`

## Sample Pack Structure

Each sample pack should include:
- **Metadata file:** `pack.json` with pack information
- **Sample files:** Organized by drum type
- **Preview audio:** Optional preview of the full kit

Example `pack.json`:
```json
{
  "id": "electronic-kit-001",
  "name": "Electronic Kit 001",
  "description": "Modern electronic drum sounds",
  "bpm": 120,
  "samples": [
    {
      "id": "kick_001",
      "file": "kick_001.wav",
      "type": "kick",
      "velocity": 0.8
    }
  ]
}
```

## Performance Considerations

- **Preloading:** Samples are preloaded for immediate playback
- **Caching:** Browser caches samples for faster subsequent loads
- **Fallbacks:** Generated sounds are used if sample loading fails
- **Memory Management:** Unused samples are cleaned up automatically

## Next Steps

1. **Choose your approach:** Local files for development, Firebase for production
2. **Prepare sample files:** Ensure proper format and organization
3. **Update configuration:** Modify SampleManager to use real files
4. **Test thoroughly:** Verify loading, playback, and performance

## Troubleshooting

- **CORS Issues:** Ensure proper CORS headers for external sample files
- **Loading Failures:** Check browser console for network errors
- **Performance:** Monitor memory usage with large sample libraries
- **Audio Context:** Ensure user interaction before audio playback (browser requirement)