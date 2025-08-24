# AudioProcessingService

Centralized audio management service for the YouTube Audio Sampler application.

## Features

- ✅ **Audio Download & Processing**: Downloads audio from YouTube URLs via Firebase function
- ✅ **Retry Logic**: Exponential backoff retry mechanism for failed downloads
- ✅ **Progress Tracking**: Real-time progress callbacks for download and processing states
- ✅ **AudioContext Management**: Proper lifecycle management of Web Audio API
- ✅ **Caching**: In-memory caching of processed audio data
- ✅ **Error Handling**: Comprehensive error handling with user-friendly messages
- ✅ **Resource Cleanup**: Automatic cleanup of resources and memory management

## Usage

### Basic Usage

```javascript
import audioProcessingService from './services/AudioProcessingService.js';

// Download and process audio with progress tracking
const result = await audioProcessingService.downloadAndProcessAudio(
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  (progress) => {
    console.log('Progress:', progress);
  }
);

console.log('Audio Buffer:', result.audioBuffer);
console.log('Waveform Data:', result.waveformData);
```

### Progress Tracking

The progress callback receives objects with the following structure:

```javascript
{
  status: 'downloading' | 'processing' | 'generating_waveform' | 'ready' | 'error' | 'retrying',
  progress: 0-100, // Percentage complete
  attempt?: number, // Current retry attempt
  maxAttempts?: number, // Maximum retry attempts
  retryDelay?: number, // Delay before next retry (ms)
  error?: string, // Error message if status is 'error'
  bytesReceived?: number, // Bytes downloaded so far
  totalBytes?: number // Total bytes to download
}
```

### Cache Management

```javascript
// Check if URL is cached
const isCached = audioProcessingService.isCached(youtubeUrl);

// Get cached audio data
const cachedData = audioProcessingService.getAudioBuffer(youtubeUrl);

// Clear all cached data
audioProcessingService.clearCache();
```

### Service Statistics

```javascript
const stats = audioProcessingService.getStats();
console.log(stats);
// {
//   cachedItems: 2,
//   activeDownloads: 1,
//   audioContextState: 'running',
//   memoryUsage: { bytes: 1048576, mb: 1.0 }
// }
```

### Cleanup

```javascript
// Clean up all resources (call on app unmount)
audioProcessingService.cleanup();
```

## Configuration

The service can be configured by modifying the `config` object:

```javascript
audioProcessingService.config = {
  maxRetries: 3,           // Maximum retry attempts
  baseRetryDelay: 1000,    // Base delay between retries (ms)
  maxRetryDelay: 10000,    // Maximum retry delay (ms)
  downloadTimeout: 60000,  // Download timeout (ms)
  functionUrl: 'http://127.0.0.1:5001/chop-stop/us-central1/getAudioStream'
};
```

## Error Handling

The service handles various error scenarios:

- **Network Errors**: Automatic retry with exponential backoff
- **Invalid URLs**: Immediate validation and error reporting
- **Audio Decoding Errors**: Clear error messages for unsupported formats
- **Timeout Errors**: Configurable timeout with proper cleanup
- **Server Errors**: Detailed error messages from Firebase function

## Testing

Use the demo file for manual testing:

```javascript
import { demoAudioProcessingService, runAllDemoTests } from './AudioProcessingService.demo.js';

// Test with default URL
await demoAudioProcessingService();

// Run comprehensive tests
await runAllDemoTests('https://www.youtube.com/watch?v=your_video_id');
```

## Integration with React Hooks

The service is designed to work seamlessly with React hooks:

```javascript
import { useState, useEffect } from 'react';
import audioProcessingService from './services/AudioProcessingService.js';

function useAudioProcessing(youtubeUrl) {
  const [status, setStatus] = useState('idle');
  const [audioData, setAudioData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!youtubeUrl) return;

    const processAudio = async () => {
      try {
        setStatus('loading');
        setError(null);
        
        const result = await audioProcessingService.downloadAndProcessAudio(
          youtubeUrl,
          (progress) => setStatus(progress.status)
        );
        
        setAudioData(result);
        setStatus('ready');
      } catch (err) {
        setError(err.message);
        setStatus('error');
      }
    };

    processAudio();
  }, [youtubeUrl]);

  return { status, audioData, error };
}
```

## Memory Management

The service automatically manages memory by:

- Caching audio data in memory for fast access
- Providing cache size monitoring via `getStats()`
- Automatic cleanup on page unload
- Manual cache clearing when needed

## Browser Compatibility

- Requires Web Audio API support (all modern browsers)
- Handles AudioContext autoplay policies
- Graceful degradation for unsupported features
---


# StorageManager

IndexedDB-based temporary audio caching service for persistent storage across browser sessions.

## Features

- ✅ **Persistent Storage**: Uses IndexedDB for reliable browser storage that survives page reloads
- ✅ **Quota Management**: Automatic cleanup when storage limits are approached
- ✅ **Audio Serialization**: Efficient serialization/deserialization of AudioBuffer objects
- ✅ **TTL Support**: Automatic expiration of entries after configurable time period
- ✅ **Error Recovery**: Graceful handling of storage quota exceeded scenarios
- ✅ **Storage Analytics**: Detailed storage statistics and usage monitoring
- ✅ **Background Cleanup**: Automatic periodic cleanup of expired entries

## Usage

### Basic Storage Operations

```javascript
import storageManager from './services/StorageManager.js';

// Store audio buffer with waveform data
await storageManager.store(youtubeUrl, audioBuffer, waveformData);

// Retrieve stored audio
const retrieved = await storageManager.retrieve(youtubeUrl);
if (retrieved) {
  const { audioBuffer, waveformData, metadata } = retrieved;
  console.log('Duration:', metadata.duration);
  console.log('Sample Rate:', metadata.sampleRate);
  console.log('Size:', metadata.size);
}

// Check if audio exists in storage
const exists = await storageManager.has(youtubeUrl);

// Remove specific entry
await storageManager.remove(youtubeUrl);

// Clear all stored data
await storageManager.clear();
```

### Storage Information & Analytics

```javascript
// Get comprehensive storage information
const info = await storageManager.getStorageInfo();
console.log(`Storage: ${info.entryCount} entries, ${info.totalSizeMB}MB used`);
console.log(`Quota: ${info.utilizationPercent}% of ${info.quota} bytes`);
console.log(`Expired entries: ${info.expiredCount}`);

// Example output:
// {
//   entryCount: 5,
//   expiredCount: 1,
//   totalSize: 52428800,
//   totalSizeMB: 50.0,
//   maxEntries: 50,
//   maxSize: 524288000,
//   maxSizeMB: 500,
//   quota: 1073741824,
//   usage: 104857600,
//   utilizationPercent: 10,
//   oldestEntry: 1640995200000,
//   newestEntry: 1641081600000
// }
```

### Cleanup Operations

```javascript
// Perform manual cleanup of expired entries
const cleanedCount = await storageManager.cleanup();
console.log(`Cleaned up ${cleanedCount} expired entries`);

// Cleanup is also performed automatically:
// - When storage threshold (80%) is reached
// - Every 30 minutes via background process
// - When quota exceeded errors occur
```

## Configuration

Default configuration can be modified:

```javascript
storageManager.config = {
  maxStorageSize: 500 * 1024 * 1024,  // 500MB max storage
  maxEntries: 50,                      // Maximum number of cached files
  cleanupThreshold: 0.8,               // Clean up when 80% full
  entryTTL: 24 * 60 * 60 * 1000,      // 24 hours TTL
  retryAttempts: 3,                    // Retry attempts for operations
  retryDelay: 1000                     // Base retry delay (ms)
};
```

## Data Structure

### Stored Entry Format

```javascript
{
  id: 'yt_dQw4w9WgXcQ',              // Generated from YouTube URL
  youtubeUrl: 'https://youtube.com/watch?v=...',
  audioData: {                        // Serialized AudioBuffer
    channels: [Float32Array, Float32Array],
    sampleRate: 44100,
    numberOfChannels: 2,
    duration: 180.5
  },
  waveformData: [0.1, 0.2, 0.3, ...], // Visualization data
  size: 15728640,                     // Size in bytes
  timestamp: 1641081600000,           // Creation timestamp
  lastAccessed: 1641081600000,       // Last access timestamp
  format: 'audiobuffer',              // Data format identifier
  metadata: {
    duration: 180.5,
    sampleRate: 44100,
    numberOfChannels: 2
  }
}
```

## Error Handling

The StorageManager handles various error scenarios:

### Storage Quota Exceeded

```javascript
try {
  await storageManager.store(url, audioBuffer, waveformData);
} catch (error) {
  if (error.message.includes('Storage failed')) {
    console.log('Storage quota exceeded, cleanup performed automatically');
    // The service automatically attempts cleanup and retry
  }
}
```

### IndexedDB Initialization Failures

```javascript
// The service gracefully handles IndexedDB unavailability
const isAvailable = storageManager.isInitialized;
if (!isAvailable) {
  console.log('Falling back to memory-only storage');
  // Use AudioProcessingService cache instead
}
```

## Integration with AudioProcessingService

The StorageManager is designed to work alongside AudioProcessingService:

```javascript
import audioProcessingService from './AudioProcessingService.js';
import storageManager from './StorageManager.js';

async function getAudio(youtubeUrl) {
  // Check persistent storage first
  let audioData = await storageManager.retrieve(youtubeUrl);
  
  if (!audioData) {
    // Check memory cache
    audioData = audioProcessingService.getAudioBuffer(youtubeUrl);
    
    if (!audioData) {
      // Download and process
      audioData = await audioProcessingService.downloadAndProcessAudio(youtubeUrl);
      
      // Store in persistent storage for future use
      await storageManager.store(youtubeUrl, audioData.audioBuffer, audioData.waveformData);
    }
  }
  
  return audioData;
}
```

## React Hook Integration

```javascript
import { useState, useEffect } from 'react';
import storageManager from './services/StorageManager.js';

function usePersistedAudio(youtubeUrl) {
  const [audioData, setAudioData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [storageInfo, setStorageInfo] = useState(null);

  useEffect(() => {
    const loadAudio = async () => {
      if (!youtubeUrl) return;
      
      setIsLoading(true);
      try {
        const data = await storageManager.retrieve(youtubeUrl);
        setAudioData(data);
        
        // Update storage info
        const info = await storageManager.getStorageInfo();
        setStorageInfo(info);
      } catch (error) {
        console.error('Failed to load persisted audio:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAudio();
  }, [youtubeUrl]);

  const clearStorage = async () => {
    await storageManager.clear();
    setAudioData(null);
    const info = await storageManager.getStorageInfo();
    setStorageInfo(info);
  };

  return { audioData, isLoading, storageInfo, clearStorage };
}
```

## Performance Considerations

### Memory Usage

- Audio buffers are serialized efficiently using Float32Array
- Automatic cleanup prevents memory leaks
- Background processes minimize UI blocking

### Storage Optimization

- Intelligent quota management prevents storage overflow
- LRU-style cleanup removes oldest entries first
- Compression through efficient serialization

### Browser Compatibility

- Requires IndexedDB support (all modern browsers)
- Graceful fallback when IndexedDB is unavailable
- Handles browser storage quota policies

## Testing

Use the demo file for manual testing:

```javascript
import { demonstrateStorageManager, testIdGeneration, testUtilityMethods } from './StorageManager.demo.js';

// Run comprehensive demo
await demonstrateStorageManager();

// Test ID generation
testIdGeneration();

// Test utility methods
testUtilityMethods();

// Access via browser console
window.storageManagerDemo.demonstrate();
```

## Monitoring & Debugging

### Storage Analytics

```javascript
// Monitor storage usage
const info = await storageManager.getStorageInfo();
console.log(`Storage utilization: ${info.utilizationPercent}%`);

// Check for expired entries
if (info.expiredCount > 0) {
  console.log(`${info.expiredCount} entries need cleanup`);
  await storageManager.cleanup();
}
```

### Debug Information

```javascript
// Enable detailed logging (development only)
storageManager.config.debug = true;

// Monitor storage operations
console.log('Storing audio...');
await storageManager.store(url, buffer, waveform);
console.log('Storage operation completed');
```