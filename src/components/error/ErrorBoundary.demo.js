import React, { useState } from 'react';
import AudioErrorBoundary from './AudioErrorBoundary';
import SamplePlaybackErrorBoundary from './SamplePlaybackErrorBoundary';
import VideoPlayerErrorBoundary from './VideoPlayerErrorBoundary';
import AudioFallbackUI from '../fallback/AudioFallbackUI';
import SampleFallbackUI from '../fallback/SampleFallbackUI';
import { Button } from '../ui/button';

// Demo component that can throw different types of errors
const ErrorThrower = ({ errorType, shouldThrow }) => {
  if (shouldThrow) {
    switch (errorType) {
      case 'network':
        throw new Error('Network connection failed - unable to reach server');
      case 'audio':
        throw new Error('Audio decode failed - unsupported format');
      case 'timeout':
        throw new Error('Request timeout exceeded - server not responding');
      case 'quota':
        throw new Error('Rate limit exceeded - too many requests');
      case 'unavailable':
        throw new Error('Video unavailable - private or deleted');
      case 'audiocontext':
        throw new Error('AudioContext suspended - user interaction required');
      case 'buffer':
        throw new Error('Audio buffer corrupted - invalid data');
      case 'playback':
        throw new Error('Sample playback failed - audio system error');
      case 'youtube':
        throw new Error('YouTube player initialization failed');
      case 'embed':
        throw new Error('Video embed blocked - embedding disabled');
      default:
        throw new Error('Unknown system error occurred');
    }
  }
  return <div className="p-4 bg-green-500/20 rounded">✅ Component working normally</div>;
};

export default function ErrorBoundaryDemo() {
  const [audioError, setAudioError] = useState(null);
  const [sampleError, setSampleError] = useState(null);
  const [videoError, setVideoError] = useState(null);
  const [showFallbacks, setShowFallbacks] = useState(false);

  const mockSamples = [
    { padId: 'A1', startTime: 15.5, endTime: 17.2, color: '#06b6d4' },
    { padId: 'A2', startTime: 32.1, endTime: 34.8, color: '#3b82f6' },
    { padId: 'A3', startTime: 48.7, endTime: 51.3, color: '#8b5cf6' },
    { padId: 'A4', startTime: 65.2, endTime: 67.9, color: '#d946ef' }
  ];

  const handleRetry = async () => {
    console.log('Retry attempted');
    // Simulate retry delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const handleReset = () => {
    console.log('Reset triggered');
    setAudioError(null);
    setSampleError(null);
    setVideoError(null);
  };

  return (
    <div className="space-y-8 p-6 bg-gray-900 min-h-screen text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Error Boundary Demo</h1>
        
        {/* Controls */}
        <div className="bg-black/20 rounded-xl p-4 mb-8">
          <h2 className="text-xl font-semibold mb-4">Error Simulation Controls</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <Button onClick={() => setAudioError('network')} variant="outline" size="sm">
              Network Error
            </Button>
            <Button onClick={() => setAudioError('audio')} variant="outline" size="sm">
              Audio Error
            </Button>
            <Button onClick={() => setAudioError('timeout')} variant="outline" size="sm">
              Timeout Error
            </Button>
            <Button onClick={() => setAudioError('quota')} variant="outline" size="sm">
              Quota Error
            </Button>
            <Button onClick={() => setSampleError('audiocontext')} variant="outline" size="sm">
              AudioContext Error
            </Button>
            <Button onClick={() => setSampleError('buffer')} variant="outline" size="sm">
              Buffer Error
            </Button>
            <Button onClick={() => setSampleError('playback')} variant="outline" size="sm">
              Playback Error
            </Button>
            <Button onClick={() => setVideoError('youtube')} variant="outline" size="sm">
              YouTube Error
            </Button>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowFallbacks(!showFallbacks)} className="bg-cyan-500 hover:bg-cyan-600 text-black">
              {showFallbacks ? 'Hide' : 'Show'} Fallback UIs
            </Button>
            <Button onClick={handleReset} variant="outline">
              Reset All
            </Button>
          </div>
        </div>

        {/* Audio Error Boundary Demo */}
        <div className="bg-black/20 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Audio Error Boundary</h2>
          <AudioErrorBoundary
            onError={(error, errorInfo) => console.log('Audio error caught:', error, errorInfo)}
            onRetry={handleRetry}
            onReset={handleReset}
          >
            <ErrorThrower errorType={audioError} shouldThrow={!!audioError} />
          </AudioErrorBoundary>
        </div>

        {/* Sample Playback Error Boundary Demo */}
        <div className="bg-black/20 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Sample Playback Error Boundary</h2>
          <SamplePlaybackErrorBoundary
            onError={(error, errorInfo) => console.log('Sample error caught:', error, errorInfo)}
            onRetry={handleRetry}
            onReset={handleReset}
            lastAction="play sample"
          >
            <ErrorThrower errorType={sampleError} shouldThrow={!!sampleError} />
          </SamplePlaybackErrorBoundary>
        </div>

        {/* Video Player Error Boundary Demo */}
        <div className="bg-black/20 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Video Player Error Boundary</h2>
          <VideoPlayerErrorBoundary
            youtubeUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            onError={(error, errorInfo) => console.log('Video error caught:', error, errorInfo)}
            onRetry={handleRetry}
            onReset={handleReset}
          >
            <ErrorThrower errorType={videoError} shouldThrow={!!videoError} />
          </VideoPlayerErrorBoundary>
        </div>

        {/* Fallback UI Demos */}
        {showFallbacks && (
          <>
            <div className="bg-black/20 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Audio Fallback UI</h2>
              <AudioFallbackUI
                error={new Error('Network connection failed - demo error')}
                onRetry={handleRetry}
                onReset={handleReset}
                youtubeUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                isRetrying={false}
                retryCount={2}
              />
            </div>

            <div className="bg-black/20 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Sample Fallback UI</h2>
              <SampleFallbackUI
                error={new Error('AudioContext suspended - demo error')}
                onRetry={handleRetry}
                onReset={handleReset}
                samples={mockSamples}
                currentTime={42.5}
                isRetrying={false}
              />
            </div>
          </>
        )}

        {/* Error Recovery Information */}
        <div className="bg-black/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Error Recovery Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Automatic Recovery</h3>
              <ul className="text-sm text-white/70 space-y-1 list-disc list-inside">
                <li>Intelligent error classification</li>
                <li>Exponential backoff retry logic</li>
                <li>Transient vs permanent error detection</li>
                <li>Context-aware error messages</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">User Experience</h3>
              <ul className="text-sm text-white/70 space-y-1 list-disc list-inside">
                <li>Fallback UI for failed components</li>
                <li>Manual recovery options</li>
                <li>Progress indicators during retry</li>
                <li>Actionable error suggestions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}