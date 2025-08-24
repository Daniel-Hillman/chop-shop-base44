# useAudioAnalysis Hook

## Overview

The `useAudioAnalysis` hook has been refactored to integrate with the new `AudioProcessingService`, providing enhanced audio download, processing, and caching capabilities with detailed status reporting and error recovery mechanisms.

## Key Improvements

### 🔄 Service Integration
- **Before**: Direct fetch calls to Firebase function
- **After**: Uses centralized `AudioProcessingService` with retry logic and caching

### 📊 Enhanced Status Reporting
- **Before**: Basic status states (`idle`, `fetching`, `decoding`, `ready`, `error`)
- **After**: Detailed progress tracking with download statistics and retry information

### 🛡️ Error Recovery
- **Before**: Single attempt with basic error handling
- **After**: Exponential backoff retry logic with detailed error reporting

### 🗄️ Caching Support
- **Before**: No caching, re-download on every request
- **After**: Intelligent caching with instant access to previously processed audio

### 🧹 Resource Management
- **Before**: Manual AudioContext management
- **After**: Service-level resource management with proper cleanup

## API Reference

### Basic Usage

```javascript
import { useAudioAnalysis } from '../hooks/useAudioAnalysis';

function MyComponent() {
  const {
    // Core data (backward compatible)
    waveformData,
    audioBuffer,
    analysisStatus,
    
    // Enhanced features
    progress,
    error,
    downloadStats,
    retry,
    cancelDownload,
    serviceStats,
    isCached
  } = useAudioAnalysis(youtubeUrl);
}
```

### Return Values

#### Core Data (Backward Compatible)
- `waveformData: number[] | null` - Normalized waveform data points
- `audioBuffer: AudioBuffer | null` - Decoded audio buffer
- `analysisStatus: string` - Current processing status

#### Enhanced Features
- `progress: number` - Download/processing progress (0-100)
- `error: string | null` - Last error message
- `downloadStats: object | null` - Detailed download statistics
- `retry: function` - Manual retry function
- `cancelDownload: function` - Cancel ongoing download
- `serviceStats: object` - Service statistics and memory usage
- `isCached: boolean` - Whether audio is cached

### Status Values

#### Backward Compatible Statuses
- `'idle'` - No URL provided or analysis not started
- `'fetching'` - Downloading audio (maps to service 'downloading' and 'retrying')
- `'decoding'` - Processing audio (maps to service 'processing' and 'generating_waveform')
- `'ready'` - Audio processed and ready for use
- `'error: <message>'` - Error occurred with specific message

### Download Statistics

When `downloadStats` is available, it contains:

```javascript
{
  attempt: number,        // Current retry attempt
  maxAttempts: number,    // Maximum retry attempts
  bytesReceived: number,  // Bytes downloaded so far
  totalBytes: number,     // Total bytes to download
  retryDelay: number,     // Delay before next retry (ms)
  lastError: string       // Last error that triggered retry
}
```

### Service Statistics

The `serviceStats` object provides:

```javascript
{
  cachedItems: number,           // Number of cached audio items
  activeDownloads: number,       // Number of ongoing downloads
  audioContextState: string,     // AudioContext state
  memoryUsage: {
    bytes: number,               // Memory usage in bytes
    mb: number                   // Memory usage in MB
  }
}
```

## Migration Guide

### Existing Code (No Changes Required)

The hook maintains full backward compatibility. Existing code will continue to work:

```javascript
// This continues to work exactly as before
const { waveformData, audioBuffer, analysisStatus } = useAudioAnalysis(youtubeUrl);
```

### Enhanced Usage (Optional)

You can optionally use new features:

```javascript
const {
  waveformData,
  audioBuffer,
  analysisStatus,
  progress,        // NEW: Progress percentage
  error,           // NEW: Detailed error info
  retry,           // NEW: Manual retry function
  isCached         // NEW: Cache status
} = useAudioAnalysis(youtubeUrl);

// Show progress bar
if (progress > 0 && progress < 100) {
  return <ProgressBar value={progress} />;
}

// Handle errors with retry
if (error) {
  return (
    <div>
      <p>Error: {error}</p>
      <button onClick={retry}>Retry</button>
    </div>
  );
}
```

## Error Handling Patterns

### Automatic Retry
The service automatically retries failed downloads with exponential backoff:

```javascript
const { analysisStatus, downloadStats } = useAudioAnalysis(youtubeUrl);

// Show retry information
if (analysisStatus === 'fetching' && downloadStats?.attempt > 1) {
  return (
    <div>
      Retry attempt {downloadStats.attempt}/{downloadStats.maxAttempts}
      {downloadStats.retryDelay && (
        <p>Retrying in {downloadStats.retryDelay}ms...</p>
      )}
    </div>
  );
}
```

### Manual Retry
Users can manually retry failed downloads:

```javascript
const { analysisStatus, error, retry } = useAudioAnalysis(youtubeUrl);

if (analysisStatus.startsWith('error:')) {
  return (
    <div>
      <p>Failed to load audio: {error}</p>
      <button onClick={retry}>Try Again</button>
    </div>
  );
}
```

### Download Cancellation
Cancel ongoing downloads when switching URLs:

```javascript
const { cancelDownload } = useAudioAnalysis(youtubeUrl);

// Cancel when user navigates away or changes URL
useEffect(() => {
  return () => {
    cancelDownload();
  };
}, [cancelDownload]);
```

## Performance Considerations

### Caching
- Audio is automatically cached after first successful download
- Subsequent requests for the same URL return instantly
- Cache is managed by the service with automatic cleanup

### Memory Management
- Service handles AudioContext lifecycle
- Automatic cleanup on component unmount
- Memory usage monitoring available via `serviceStats`

### Concurrent Requests
- Multiple components can safely use the same URL
- Service deduplicates concurrent requests
- Proper cleanup prevents memory leaks

## Testing

The hook includes comprehensive tests covering:
- Service integration
- Progress tracking
- Error handling
- Retry mechanisms
- Caching behavior
- Resource cleanup

Run tests with:
```bash
npm test -- src/hooks/__tests__/useAudioAnalysis.test.js
```

## Requirements Fulfilled

This refactored hook addresses the following requirements:

- **1.1**: Automatic audio download and sync with video playback
- **1.2**: Transition from "waiting for audio" to ready state
- **1.3**: Perfect synchronization between video and audio
- **5.1**: Reliable temporary audio storage with instant access
- **5.4**: Clear error messaging and fallback options

## Related Services

- `AudioProcessingService` - Core audio processing and caching
- `StorageManager` - IndexedDB-based temporary storage
- `SamplePlaybackEngine` - Audio playback and sample management