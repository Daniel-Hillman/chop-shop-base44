import React from 'react';
import { Play, Square, AlertTriangle, RefreshCw, Volume2, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';

/**
 * Fallback UI for sample playback failures
 * Provides manual controls and alternative workflows
 */
const SampleFallbackUI = ({ 
  error, 
  onRetry, 
  onReset,
  samples = [],
  currentTime = 0,
  isRetrying = false 
}) => {
  const handleManualSeek = (timestamp) => {
    // This would integrate with the video player to manually seek
    if (window.youtubePlayer && window.youtubePlayer.seekTo) {
      window.youtubePlayer.seekTo(timestamp);
    }
  };

  const getErrorType = (error) => {
    const message = error?.message?.toLowerCase() || '';
    
    if (message.includes('audiocontext') || message.includes('suspended')) {
      return 'audiocontext';
    }
    if (message.includes('buffer') || message.includes('decode')) {
      return 'buffer';
    }
    if (message.includes('playback') || message.includes('play')) {
      return 'playback';
    }
    
    return 'unknown';
  };

  const getErrorGuidance = (errorType) => {
    switch (errorType) {
      case 'audiocontext':
        return {
          title: 'Audio System Inactive',
          description: 'Your browser has suspended audio playback. Click anywhere to reactivate.',
          action: 'Activate Audio',
          icon: Volume2
        };
      case 'buffer':
        return {
          title: 'Audio Data Issue',
          description: 'There\'s a problem with the audio data. Try reloading the audio.',
          action: 'Reload Audio',
          icon: RefreshCw
        };
      case 'playback':
        return {
          title: 'Playback Error',
          description: 'Sample playback failed. You can still navigate manually using the controls below.',
          action: 'Try Again',
          icon: Play
        };
      default:
        return {
          title: 'Sample System Error',
          description: 'The sample system encountered an error. Manual controls are available below.',
          action: 'Retry',
          icon: AlertTriangle
        };
    }
  };

  const errorType = getErrorType(error);
  const guidance = getErrorGuidance(errorType);
  const IconComponent = guidance.icon;

  return (
    <div className="space-y-4">
      {/* Error Alert */}
      <Alert className="border-yellow-400 bg-yellow-400/10">
        <IconComponent className="h-4 w-4 text-yellow-400" />
        <AlertDescription className="text-yellow-200">
          <div className="space-y-2">
            <div>
              <h4 className="font-semibold text-sm">{guidance.title}</h4>
              <p className="text-xs mt-1">{guidance.description}</p>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={onRetry}
                disabled={isRetrying}
                size="sm"
                className="bg-cyan-500 hover:bg-cyan-600 text-black text-xs h-7"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <IconComponent className="w-3 h-3 mr-1" />
                    {guidance.action}
                  </>
                )}
              </Button>
              
              <Button
                onClick={onReset}
                variant="outline"
                size="sm"
                className="border-white/20 text-white/80 hover:bg-white/10 text-xs h-7"
              >
                Reset
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Manual Sample Controls */}
      {samples.length > 0 && (
        <div className="bg-black/20 backdrop-blur-lg border border-white/20 rounded-xl p-4">
          <h5 className="font-medium text-white mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            Manual Sample Navigation
          </h5>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {samples.slice(0, 8).map((sample, index) => (
              <Button
                key={sample.padId || index}
                onClick={() => handleManualSeek(sample.startTime)}
                variant="outline"
                size="sm"
                className="border-white/20 text-white/80 hover:bg-white/10 text-xs h-8 flex items-center gap-1"
                style={{ borderColor: sample.color }}
              >
                <Play className="w-3 h-3" />
                {sample.padId || `S${index + 1}`}
                <span className="text-white/60">
                  {Math.floor(sample.startTime / 60)}:{(sample.startTime % 60).toFixed(0).padStart(2, '0')}
                </span>
              </Button>
            ))}
          </div>
          
          {samples.length > 8 && (
            <p className="text-xs text-white/60 mt-2">
              Showing first 8 samples. Total: {samples.length}
            </p>
          )}
        </div>
      )}

      {/* Current Status */}
      <div className="bg-black/10 backdrop-blur-lg border border-white/10 rounded-xl p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Current Time:</span>
          <span className="text-white/80">
            {Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(0).padStart(2, '0')}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-white/60">Samples Created:</span>
          <span className="text-white/80">{samples.length}</span>
        </div>
      </div>

      {/* Fallback Instructions */}
      <div className="bg-black/10 backdrop-blur-lg border border-white/10 rounded-xl p-4">
        <h5 className="font-medium text-white mb-2">Alternative Workflow</h5>
        <ul className="text-sm text-white/70 space-y-1 list-disc list-inside">
          <li>Use the manual sample buttons above to navigate to specific timestamps</li>
          <li>The video player will still respond to manual seeking</li>
          <li>You can create new samples by noting the current time and using manual controls</li>
          <li>Try refreshing the page if the audio system doesn't recover</li>
        </ul>
      </div>
    </div>
  );
};

export default SampleFallbackUI;