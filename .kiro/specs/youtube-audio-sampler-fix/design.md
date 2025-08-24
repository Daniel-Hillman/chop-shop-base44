# Design Document

## Overview

The YouTube Audio Sampler system requires a new approach due to YouTube's restrictions on audio downloading. Instead of downloading audio files, this design implements real-time audio capture directly from the YouTube video player using Web Audio API. This approach captures high-quality audio while the video plays, processes it for sampling, and enables seamless sample playback without violating YouTube's terms of service.

## Architecture

### Current Architecture Issues Identified

1. **YouTube Download Restrictions**: YouTube blocks direct audio downloading, making the previous approach non-functional
2. **Audio Context Management**: Multiple AudioContext instances are created without proper cleanup
3. **Real-time Processing**: No system for capturing audio in real-time from video elements
4. **Error Handling**: Insufficient error handling throughout the audio pipeline
5. **Memory Management**: No cleanup of audio resources when switching videos

### Proposed Streaming Capture Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   YouTube URL   │───▶│   Video Player   │───▶│ Audio Capture   │
│     Input       │    │                  │    │    Service      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │                          │
                              ▼                          ▼
                    ┌──────────────────┐    ┌─────────────────┐
                    │  Capture Controls│    │  Sample Engine  │
                    │   & Progress     │    │   & Storage     │
                    └──────────────────┘    └─────────────────┘
                                                     │
                                                     ▼
                                          ┌─────────────────┐
                                          │  Waveform Gen   │
                                          │   & Playback    │
                                          └─────────────────┘
```

## Components and Interfaces

### 1. YouTube Audio Capture Service

**Location**: `src/services/YouTubeAudioCapture.js`

**Responsibilities**:
- Capture audio in real-time from YouTube video elements using Web Audio API
- Generate waveform data during capture process
- Handle audio buffer creation from captured samples
- Provide real-time capture statistics and progress
- Manage AudioContext lifecycle for capture operations

**Interface**:
```javascript
class YouTubeAudioCapture {
  async startCapture(videoElement, onProgress)
  async stopCapture()
  getRealtimeAnalysis()
  isCurrentlyCapturing()
  getCaptureStats()
  cleanup()
}
```

### 2. Enhanced Audio Processing Service

**Location**: `src/services/AudioProcessingService.js`

**Responsibilities**:
- Coordinate between YouTube capture and sample processing
- Handle both file upload and streaming capture workflows
- Manage temporary storage using IndexedDB
- Provide unified interface for different audio sources
- Clean up resources on video changes

**Interface**:
```javascript
class AudioProcessingService {
  async processYouTubeURL(youtubeUrl, onProgress)
  async startYouTubeCapture(videoElement, onProgress)
  async stopYouTubeCapture()
  isYouTubeCaptureActive()
  getYouTubeCaptureStats()
  clearCache()
}
```

### 3. YouTube Capture Controls Component

**Location**: `src/components/chopper/YouTubeCaptureControls.jsx`

**Responsibilities**:
- Provide user interface for starting/stopping audio capture
- Display real-time capture progress and statistics
- Handle capture errors and user feedback
- Integrate with video player state for optimal UX

### 4. Sample Playback Engine

**Location**: `src/services/SamplePlaybackEngine.js`

**Responsibilities**:
- Manage AudioContext lifecycle
- Handle seamless sample playback
- Synchronize with YouTube video player
- Provide instant timestamp jumping
- Manage audio scheduling for overlapping samples

**Interface**:
```javascript
class SamplePlaybackEngine {
  async playSample(audioBuffer, startTime, endTime)
  async jumpToTimestamp(timestamp)
  syncWithVideoPlayer(youtubePlayer)
  setMasterVolume(volume)
  cleanup()
}
```

### 5. Enhanced useAudioAnalysis Hook

**Location**: `src/hooks/useAudioAnalysis.js`

**Improvements**:
- Integrate with AudioProcessingService
- Provide detailed status updates
- Handle progressive loading states
- Implement proper cleanup
- Add retry mechanisms

### 6. Temporary Storage Manager

**Location**: `src/services/StorageManager.js`

**Responsibilities**:
- Store audio buffers in IndexedDB for instant access
- Manage storage quotas and cleanup
- Provide cache invalidation
- Handle storage errors gracefully

## Data Models

### AudioProcessingState
```javascript
{
  status: 'idle' | 'downloading' | 'processing' | 'ready' | 'error',
  progress: number, // 0-100
  error: string | null,
  audioBuffer: AudioBuffer | null,
  waveformData: number[] | null,
  downloadStartTime: number,
  processingTime: number
}
```

### SampleData
```javascript
{
  padId: string,
  startTime: number,
  endTime: number,
  color: string,
  volume: number,
  fadeIn: number,
  fadeOut: number,
  lastPlayed: number
}
```

### StorageEntry
```javascript
{
  youtubeUrl: string,
  audioBuffer: ArrayBuffer,
  waveformData: number[],
  timestamp: number,
  size: number,
  format: string
}
```

## Error Handling

### 1. Network Errors
- Implement exponential backoff retry logic
- Provide offline detection and user feedback
- Cache successful downloads for offline use

### 2. Audio Processing Errors
- Validate audio format before processing
- Provide fallback for unsupported formats
- Clear error states when retrying

### 3. Storage Errors
- Handle quota exceeded scenarios
- Implement storage cleanup strategies
- Provide user feedback for storage issues

### 4. Playback Errors
- Handle AudioContext suspension/resumption
- Manage concurrent playback conflicts
- Provide graceful degradation for audio failures

## Testing Strategy

### 1. Unit Tests
- AudioProcessingService methods
- SamplePlaybackEngine functionality
- StorageManager operations
- Hook state management

### 2. Integration Tests
- End-to-end audio download and playback
- YouTube video synchronization
- Sample creation and playback workflow
- Error recovery scenarios

### 3. Performance Tests
- Audio download speed benchmarks
- Memory usage monitoring
- Concurrent sample playback testing
- Storage efficiency validation

### 4. User Experience Tests
- Seamless timestamp jumping
- Audio-video synchronization accuracy
- Responsive UI during audio processing
- Error message clarity and actionability

## Implementation Phases

### Phase 1: Core Audio Infrastructure
- Implement AudioProcessingService
- Enhance Firebase function with proper error handling
- Create StorageManager for temporary caching
- Update useAudioAnalysis hook

### Phase 2: Playback Engine
- Implement SamplePlaybackEngine
- Add seamless timestamp jumping
- Integrate with YouTube video player
- Handle concurrent sample playback

### Phase 3: Enhanced User Experience
- Add progressive loading indicators
- Implement retry mechanisms
- Improve error messaging
- Add waveform visualization enhancements

### Phase 4: Performance Optimization
- Optimize audio buffer management
- Implement intelligent caching strategies
- Add performance monitoring
- Optimize memory usage

## Technical Considerations

### Browser Compatibility
- Use Web Audio API with fallbacks
- Handle different AudioContext implementations
- Manage autoplay policies across browsers

### Performance Optimization
- Implement lazy loading for large audio files
- Use Web Workers for audio processing
- Optimize waveform generation algorithms
- Implement efficient memory management

### Security
- Validate all YouTube URLs on server-side
- Implement rate limiting for audio downloads
- Sanitize audio data before processing
- Handle CORS securely across environments

### Scalability
- Design for multiple concurrent users
- Implement efficient caching strategies
- Handle large audio files gracefully
- Plan for future feature additions