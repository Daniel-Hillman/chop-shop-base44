import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Square, 
  Download, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Mic,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import youTubeStreamCapture from '../../services/YouTubeStreamCapture.js';

export default function YouTubeCaptureControls({ 
  youtubeUrl, 
  videoElement, 
  onCaptureComplete, 
  onCaptureError,
  isVideoReady = false 
}) {
  const [captureState, setCaptureState] = useState('idle'); // idle, capturing, processing, complete, error
  const [progress, setProgress] = useState(0);
  const [captureStats, setCaptureStats] = useState(null);
  const [error, setError] = useState(null);
  const [capturedData, setCapturedData] = useState(null);

  // Reset state when URL changes
  useEffect(() => {
    setCaptureState('idle');
    setProgress(0);
    setCaptureStats(null);
    setError(null);
    setCapturedData(null);
  }, [youtubeUrl]);

  // Handle capture progress updates
  const handleProgress = useCallback((progressData) => {
    setProgress(progressData.progress);
    setCaptureStats({
      capturedTime: progressData.capturedTime,
      targetDuration: progressData.targetDuration,
      status: progressData.status
    });
  }, []);

  // Start audio capture
  const startCapture = useCallback(async () => {
    if (!videoElement) {
      setError('Video element not available. Please wait for video to load.');
      return;
    }

    if (!isVideoReady) {
      setError('Video not ready. Please wait for video to fully load.');
      return;
    }

    try {
      setCaptureState('capturing');
      setError(null);
      setProgress(0);

      console.log('🎵 Starting YouTube audio capture...');

      // Get video duration for capture target
      const videoDuration = videoElement.duration || 300; // Default 5 minutes
      const maxCaptureDuration = Math.min(videoDuration, 600); // Max 10 minutes

      // Start the capture process
      const result = await youTubeStreamCapture.startCapture(
        videoElement,
        handleProgress,
        maxCaptureDuration
      );

      setCaptureState('processing');
      console.log('🎵 Capture complete, processing audio...');

      // Process the captured audio
      setCapturedData(result);
      setCaptureState('complete');
      setProgress(100);

      console.log('✅ Audio capture and processing complete');
      console.log(`📊 Captured ${result.metadata.duration.toFixed(2)}s of audio`);

      // Notify parent component
      if (onCaptureComplete) {
        onCaptureComplete(result);
      }

    } catch (error) {
      console.error('❌ Audio capture failed:', error);
      setCaptureState('error');
      setError(error.message || 'Audio capture failed');
      
      if (onCaptureError) {
        onCaptureError(error);
      }
    }
  }, [videoElement, isVideoReady, handleProgress, onCaptureComplete, onCaptureError]);

  // Stop capture
  const stopCapture = useCallback(async () => {
    try {
      setCaptureState('processing');
      console.log('🛑 Stopping audio capture...');
      
      const result = await youTubeStreamCapture.stopCapture();
      
      if (result) {
        setCapturedData(result);
        setCaptureState('complete');
        setProgress(100);
        
        if (onCaptureComplete) {
          onCaptureComplete(result);
        }
      } else {
        setCaptureState('idle');
        setProgress(0);
      }
    } catch (error) {
      console.error('❌ Failed to stop capture:', error);
      setCaptureState('error');
      setError(error.message || 'Failed to stop capture');
    }
  }, [onCaptureComplete]);

  // Reset capture state
  const resetCapture = useCallback(() => {
    youTubeStreamCapture.cleanup();
    setCaptureState('idle');
    setProgress(0);
    setCaptureStats(null);
    setError(null);
    setCapturedData(null);
  }, []);

  // Get status display info
  const getStatusInfo = () => {
    switch (captureState) {
      case 'idle':
        return {
          icon: Mic,
          message: 'Ready to capture audio from YouTube video',
          color: 'text-white/70'
        };
      case 'capturing':
        return {
          icon: Loader2,
          message: `Capturing audio... ${progress}%`,
          color: 'text-cyan-400',
          animate: true
        };
      case 'processing':
        return {
          icon: Loader2,
          message: 'Processing captured audio...',
          color: 'text-yellow-400',
          animate: true
        };
      case 'complete':
        return {
          icon: CheckCircle,
          message: 'Audio capture complete!',
          color: 'text-green-400'
        };
      case 'error':
        return {
          icon: AlertCircle,
          message: 'Capture failed',
          color: 'text-red-400'
        };
      default:
        return {
          icon: Mic,
          message: 'Unknown state',
          color: 'text-white/50'
        };
    }
  };

  // Check if capture is supported
  const isSupported = youTubeStreamCapture.constructor.isSupported();

  if (!isSupported) {
    return (
      <Alert className="border-red-400 bg-red-400/10">
        <AlertCircle className="h-4 w-4 text-red-400" />
        <AlertDescription className="text-red-200">
          Audio capture is not supported in this browser. Please use a modern browser with Web Audio API support.
        </AlertDescription>
      </Alert>
    );
  }

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl p-4 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-600/20 rounded-lg">
            <Mic className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-white font-medium">Audio Capture</h3>
            <p className="text-white/60 text-sm">Capture audio directly from YouTube</p>
          </div>
        </div>
        
        {/* Volume indicator */}
        <div className="flex items-center gap-1 text-white/40">
          {videoElement?.muted ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </div>
      </div>

      {/* Status Display */}
      <div className="flex items-center gap-2">
        <StatusIcon 
          className={`w-4 h-4 ${statusInfo.color} ${statusInfo.animate ? 'animate-spin' : ''}`} 
        />
        <span className={`text-sm font-medium ${statusInfo.color}`}>
          {statusInfo.message}
        </span>
      </div>

      {/* Progress Bar */}
      <AnimatePresence>
        {(captureState === 'capturing' || captureState === 'processing') && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <Progress 
              value={progress} 
              className="h-2 bg-white/10"
            />
            {captureStats && (
              <div className="flex justify-between text-xs text-white/50">
                <span>
                  {captureStats.capturedTime?.toFixed(1)}s / {captureStats.targetDuration?.toFixed(1)}s
                </span>
                <span>{progress}%</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Alert className="border-red-400 bg-red-400/10">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-200 text-sm">
                {error}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Capture Stats */}
      <AnimatePresence>
        {capturedData && captureState === 'complete' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-green-500/10 border border-green-500/20 rounded-lg p-3"
          >
            <div className="text-green-200 text-sm space-y-1">
              <div className="flex justify-between">
                <span>Duration:</span>
                <span>{capturedData.metadata.duration.toFixed(2)}s</span>
              </div>
              <div className="flex justify-between">
                <span>Sample Rate:</span>
                <span>{capturedData.metadata.sampleRate} Hz</span>
              </div>
              <div className="flex justify-between">
                <span>Channels:</span>
                <span>{capturedData.metadata.channels}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control Buttons */}
      <div className="flex gap-2">
        {captureState === 'idle' && (
          <Button
            onClick={startCapture}
            disabled={!isVideoReady || !videoElement}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Play className="w-4 h-4 mr-2" />
            Start Capture
          </Button>
        )}

        {captureState === 'capturing' && (
          <Button
            onClick={stopCapture}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            <Square className="w-4 h-4 mr-2" />
            Stop Capture
          </Button>
        )}

        {(captureState === 'complete' || captureState === 'error') && (
          <>
            <Button
              onClick={resetCapture}
              variant="outline"
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              Reset
            </Button>
            
            {captureState === 'complete' && (
              <Button
                onClick={startCapture}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Play className="w-4 h-4 mr-2" />
                Capture Again
              </Button>
            )}
          </>
        )}
      </div>

      {/* Help Text */}
      {captureState === 'idle' && (
        <div className="text-xs text-white/40 space-y-1">
          <p>💡 This captures audio directly from the YouTube player</p>
          <p>🎵 Make sure the video is playing and not muted</p>
          <p>⏱️ Capture will automatically stop at video end</p>
        </div>
      )}
    </motion.div>
  );
}