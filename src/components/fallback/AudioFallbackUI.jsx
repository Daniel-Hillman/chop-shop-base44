import React from 'react';
import { AlertTriangle, RefreshCw, Upload, ExternalLink, Volume2, VolumeX } from 'lucide-react';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';

/**
 * Fallback UI component for when audio processing fails
 * Provides alternative workflows and clear guidance
 */
const AudioFallbackUI = ({ 
  error, 
  onRetry, 
  onReset, 
  youtubeUrl,
  isRetrying = false,
  retryCount = 0 
}) => {
  const handleOpenYouTube = () => {
    if (youtubeUrl) {
      window.open(youtubeUrl, '_blank');
    }
  };

  const handleTryDifferentVideo = () => {
    if (onReset) {
      onReset();
    }
  };

  const getErrorSeverity = (error) => {
    const message = error?.message?.toLowerCase() || '';
    
    if (message.includes('network') || message.includes('timeout')) {
      return 'warning';
    }
    if (message.includes('unavailable') || message.includes('private')) {
      return 'error';
    }
    
    return 'warning';
  };

  const getAlternativeActions = (error) => {
    const message = error?.message?.toLowerCase() || '';
    
    if (message.includes('network') || message.includes('timeout')) {
      return [
        {
          icon: RefreshCw,
          title: 'Check Connection',
          description: 'Verify your internet connection and try again',
          action: onRetry,
          primary: true
        },
        {
          icon: ExternalLink,
          title: 'Open in YouTube',
          description: 'Listen to the audio directly on YouTube',
          action: handleOpenYouTube,
          primary: false
        }
      ];
    }
    
    if (message.includes('unavailable') || message.includes('private')) {
      return [
        {
          icon: Upload,
          title: 'Try Different Video',
          description: 'Use a public YouTube video that allows audio extraction',
          action: handleTryDifferentVideo,
          primary: true
        },
        {
          icon: ExternalLink,
          title: 'Open Original',
          description: 'Check if the video exists and is accessible',
          action: handleOpenYouTube,
          primary: false
        }
      ];
    }
    
    return [
      {
        icon: RefreshCw,
        title: 'Try Again',
        description: 'Retry the audio processing',
        action: onRetry,
        primary: true
      },
      {
        icon: Upload,
        title: 'Different Video',
        description: 'Try with a different YouTube video',
        action: handleTryDifferentVideo,
        primary: false
      }
    ];
  };

  const severity = getErrorSeverity(error);
  const alternativeActions = getAlternativeActions(error);

  return (
    <div className="space-y-6">
      {/* Main Error Alert */}
      <Alert className={`border-${severity === 'error' ? 'red' : 'yellow'}-400 bg-${severity === 'error' ? 'red' : 'yellow'}-400/10`}>
        <VolumeX className={`h-4 w-4 text-${severity === 'error' ? 'red' : 'yellow'}-400`} />
        <AlertDescription className={`text-${severity === 'error' ? 'red' : 'yellow'}-200`}>
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold">Audio Processing Failed</h4>
              <p className="text-sm mt-1">
                {error?.message || 'Unable to process audio from this YouTube video.'}
              </p>
            </div>
            
            {retryCount > 0 && (
              <div className="text-sm">
                <span className="text-white/60">Retry attempts: </span>
                <span className="text-white/80">{retryCount}</span>
              </div>
            )}
          </div>
        </AlertDescription>
      </Alert>

      {/* Retry Progress */}
      {isRetrying && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            <span className="text-sm text-cyan-200">Retrying audio processing...</span>
          </div>
          <Progress value={undefined} className="h-2 bg-white/10" />
        </div>
      )}

      {/* Alternative Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alternativeActions.map((action, index) => {
          const IconComponent = action.icon;
          return (
            <div
              key={index}
              className={`bg-black/20 backdrop-blur-lg border border-white/20 rounded-xl p-4 ${
                action.primary ? 'ring-2 ring-cyan-500/30' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  action.primary 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'bg-white/10 text-white/60'
                }`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h5 className="font-medium text-white mb-1">{action.title}</h5>
                  <p className="text-sm text-white/60 mb-3">{action.description}</p>
                  <Button
                    onClick={action.action}
                    disabled={isRetrying}
                    size="sm"
                    className={
                      action.primary
                        ? 'bg-cyan-500 hover:bg-cyan-600 text-black'
                        : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                    }
                  >
                    {action.title}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Troubleshooting Tips */}
      <div className="bg-black/10 backdrop-blur-lg border border-white/10 rounded-xl p-4">
        <h5 className="font-medium text-white mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
          Troubleshooting Tips
        </h5>
        <ul className="text-sm text-white/70 space-y-2 list-disc list-inside">
          <li>Ensure the YouTube video is public and has audio content</li>
          <li>Check your internet connection stability</li>
          <li>Try videos that are shorter than 10 minutes for better performance</li>
          <li>Clear your browser cache if you continue experiencing issues</li>
          <li>Some videos may have restrictions that prevent audio extraction</li>
        </ul>
      </div>

      {/* Current Video Info */}
      {youtubeUrl && (
        <div className="bg-black/10 backdrop-blur-lg border border-white/10 rounded-xl p-4">
          <h5 className="font-medium text-white mb-2">Current Video</h5>
          <div className="text-sm text-white/60 break-all">{youtubeUrl}</div>
          <div className="flex gap-2 mt-3">
            <Button
              onClick={handleOpenYouTube}
              variant="outline"
              size="sm"
              className="border-white/20 text-white/80 hover:bg-white/10"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Open in YouTube
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioFallbackUI;