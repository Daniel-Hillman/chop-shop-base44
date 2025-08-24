/**
 * Demo for useAudioAnalysis Hook
 * 
 * This demo shows how the refactored useAudioAnalysis hook integrates with
 * the AudioProcessingService to provide enhanced audio download and processing
 * capabilities with detailed status reporting and error recovery.
 */

import { useAudioAnalysis } from './useAudioAnalysis.js';

// Example usage in a React component
function AudioAnalysisDemo() {
  const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  
  const {
    // Core data
    waveformData,
    audioBuffer,
    
    // Status and progress
    analysisStatus,
    progress,
    error,
    downloadStats,
    
    // Actions
    retry,
    cancelDownload,
    
    // Service information
    serviceStats,
    isCached
  } = useAudioAnalysis(youtubeUrl);

  return (
    <div className="audio-analysis-demo">
      <h2>Audio Analysis Status</h2>
      
      {/* Status Display */}
      <div className="status-section">
        <p><strong>Status:</strong> {analysisStatus}</p>
        <p><strong>Progress:</strong> {progress}%</p>
        <p><strong>Is Cached:</strong> {isCached ? 'Yes' : 'No'}</p>
        
        {error && (
          <div className="error-section">
            <p><strong>Error:</strong> {error}</p>
            <button onClick={retry}>Retry</button>
          </div>
        )}
      </div>

      {/* Download Statistics */}
      {downloadStats && (
        <div className="download-stats">
          <h3>Download Progress</h3>
          {downloadStats.attempt && (
            <p>Attempt: {downloadStats.attempt}/{downloadStats.maxAttempts}</p>
          )}
          {downloadStats.bytesReceived && downloadStats.totalBytes && (
            <p>
              Downloaded: {downloadStats.bytesReceived} / {downloadStats.totalBytes} bytes
              ({Math.round((downloadStats.bytesReceived / downloadStats.totalBytes) * 100)}%)
            </p>
          )}
          {downloadStats.retryDelay && (
            <p>Retrying in: {downloadStats.retryDelay}ms</p>
          )}
          {downloadStats.lastError && (
            <p>Last Error: {downloadStats.lastError}</p>
          )}
        </div>
      )}

      {/* Audio Data Display */}
      {audioBuffer && (
        <div className="audio-data">
          <h3>Audio Information</h3>
          <p><strong>Duration:</strong> {audioBuffer.duration.toFixed(2)} seconds</p>
          <p><strong>Sample Rate:</strong> {audioBuffer.sampleRate} Hz</p>
          <p><strong>Channels:</strong> {audioBuffer.numberOfChannels}</p>
        </div>
      )}

      {/* Waveform Display */}
      {waveformData && (
        <div className="waveform-section">
          <h3>Waveform Data</h3>
          <p>Waveform points: {waveformData.length}</p>
          <div className="waveform-preview">
            {waveformData.slice(0, 20).map((point, index) => (
              <span key={index} style={{ height: `${point * 100}px` }} />
            ))}
            {waveformData.length > 20 && <span>...</span>}
          </div>
        </div>
      )}

      {/* Service Statistics */}
      <div className="service-stats">
        <h3>Service Statistics</h3>
        <p><strong>Cached Items:</strong> {serviceStats.cachedItems}</p>
        <p><strong>Active Downloads:</strong> {serviceStats.activeDownloads}</p>
        <p><strong>AudioContext State:</strong> {serviceStats.audioContextState}</p>
        <p><strong>Memory Usage:</strong> {serviceStats.memoryUsage.mb} MB</p>
      </div>

      {/* Action Buttons */}
      <div className="actions">
        <button onClick={retry} disabled={analysisStatus === 'downloading'}>
          Retry Download
        </button>
        <button onClick={cancelDownload} disabled={analysisStatus !== 'downloading'}>
          Cancel Download
        </button>
      </div>
    </div>
  );
}

// Example of different status states and their meanings
const STATUS_DESCRIPTIONS = {
  'idle': 'No URL provided or analysis not started',
  'initializing': 'Setting up audio processing',
  'downloading': 'Downloading audio from YouTube',
  'processing': 'Decoding audio data',
  'generating_waveform': 'Creating waveform visualization',
  'retrying': 'Retrying failed download with exponential backoff',
  'ready': 'Audio processed and ready for use',
  'error': 'An error occurred during processing'
};

// Example of progress callback handling
function handleProgressUpdate(progressData) {
  console.log('Progress Update:', progressData);
  
  switch (progressData.status) {
    case 'downloading':
      console.log(`Download progress: ${progressData.progress}%`);
      if (progressData.bytesReceived && progressData.totalBytes) {
        const percentage = (progressData.bytesReceived / progressData.totalBytes) * 100;
        console.log(`Downloaded: ${percentage.toFixed(1)}%`);
      }
      break;
      
    case 'retrying':
      console.log(`Retry attempt ${progressData.attempt}/${progressData.maxAttempts}`);
      console.log(`Retrying in ${progressData.retryDelay}ms due to: ${progressData.error}`);
      break;
      
    case 'error':
      console.error(`Download failed: ${progressData.error}`);
      break;
      
    case 'ready':
      console.log('Audio processing complete!');
      break;
  }
}

// Example of error recovery patterns
function ErrorRecoveryExample() {
  const { analysisStatus, error, retry, downloadStats } = useAudioAnalysis(
    'https://www.youtube.com/watch?v=invalid'
  );

  // Automatic retry logic (optional)
  React.useEffect(() => {
    if (analysisStatus === 'error' && downloadStats?.attempt < 3) {
      // Auto-retry up to 3 times with delay
      const retryDelay = Math.min(1000 * Math.pow(2, downloadStats.attempt), 10000);
      setTimeout(retry, retryDelay);
    }
  }, [analysisStatus, error, retry, downloadStats]);

  return (
    <div>
      {analysisStatus === 'error' && (
        <div className="error-recovery">
          <p>Error: {error}</p>
          {downloadStats?.attempt < 3 ? (
            <p>Auto-retrying in {downloadStats?.retryDelay}ms...</p>
          ) : (
            <button onClick={retry}>Manual Retry</button>
          )}
        </div>
      )}
    </div>
  );
}

// Key improvements in the refactored hook:
const IMPROVEMENTS = {
  'Service Integration': 'Uses AudioProcessingService instead of direct fetch calls',
  'Detailed Progress': 'Provides granular progress updates for all processing phases',
  'Error Recovery': 'Built-in retry mechanism with exponential backoff',
  'Resource Management': 'Proper cleanup and cancellation of ongoing downloads',
  'Caching Support': 'Leverages service-level caching for instant repeated access',
  'Status Reporting': 'Comprehensive status tracking with download statistics',
  'Memory Efficiency': 'Service-level memory management and cleanup',
  'Concurrent Safety': 'Handles multiple simultaneous requests safely'
};

export {
  AudioAnalysisDemo,
  STATUS_DESCRIPTIONS,
  handleProgressUpdate,
  ErrorRecoveryExample,
  IMPROVEMENTS
};