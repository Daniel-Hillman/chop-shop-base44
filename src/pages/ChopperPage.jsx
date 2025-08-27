import React, { useState, useEffect, useCallback } from 'react';
import VideoPlayer from '../components/chopper/VideoPlayer';
import PadGridFixed from '../components/chopper/PadGrid';
import Controls from '../components/chopper/Controls';
import SessionManager from '../components/chopper/SessionManager';
import YouTubeCaptureControls from '../components/chopper/YouTubeCaptureControls';
import { useAudioAnalysis } from '../hooks/useAudioAnalysis'; 
import { useAudioErrorRecovery } from '../hooks/useErrorRecovery';
import AudioErrorBoundary from '../components/error/AudioErrorBoundary';
import VideoPlayerErrorBoundary from '../components/error/VideoPlayerErrorBoundary';
import SamplePlaybackErrorBoundary from '../components/error/SamplePlaybackErrorBoundary';
import AudioFallbackUI from '../components/fallback/AudioFallbackUI';
import { Youtube, AlertCircle, RefreshCw, CheckCircle, Loader2, Wifi, WifiOff, Save, FolderOpen } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Progress } from '../components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';

const padColors = [
    '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef',
    '#059669', '#10b981', '#65a30d', '#ca8a04',
    '#f97316', '#ef4444', '#ec4899', '#a855f7',
    '#22c55e', '#eab308', '#f43f5e', '#6366f1'
];

export default function ChopperPage() {
    const [youtubeUrl, setYoutubeUrl] = useState('https://www.youtube.com/watch?v=yp7-wNhGBDY&t');
    const [submittedUrl, setSubmittedUrl] = useState('');
    const [chops, setChops] = useState([]);
    const [activeBank, setActiveBank] = useState('A');
    const [selectedPadId, setSelectedPadId] = useState(null);
    const [playerState, setPlayerState] = useState({ currentTime: 0, duration: 180, isPlaying: false });
    const [masterVolume, setMasterVolume] = useState(1);
    const [youtubePlayer, setYoutubePlayer] = useState(null);
    const [urlError, setUrlError] = useState(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showAudioFallback, setShowAudioFallback] = useState(false);
    const [showSessionManager, setShowSessionManager] = useState(false);
    const [videoTitle, setVideoTitle] = useState('');
    const [videoElement, setVideoElement] = useState(null);
    const [capturedAudioData, setCapturedAudioData] = useState(null);
    const [showCaptureControls, setShowCaptureControls] = useState(false);
    
    const { 
        waveformData, 
        audioBuffer, 
        analysisStatus, 
        progress, 
        error, 
        downloadStats, 
        retry, 
        isCached 
    } = useAudioAnalysis(submittedUrl);
    
    const audioErrorRecovery = useAudioErrorRecovery();
    const selectedChop = chops.find(c => c.padId === selectedPadId);

    // Debug logging for waveform data
    useEffect(() => {
        console.log('🌊 Waveform data status:', {
            hasWaveformData: !!waveformData,
            waveformLength: waveformData?.length,
            analysisStatus,
            submittedUrl,
            hasCapturedAudio: !!capturedAudioData?.waveformData,
            capturedAudioLength: capturedAudioData?.waveformData?.length
        });
    }, [waveformData, analysisStatus, submittedUrl, capturedAudioData]);

    // Monitor online status
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        return () => {
            window.removeEventListener('online', handleOffline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Auto-submit default URL on page load
    useEffect(() => {
        if (!submittedUrl && youtubeUrl && isOnline) {
            console.log('Auto-submitting default URL:', youtubeUrl);
            try {
                const url = new URL(youtubeUrl);
                const videoId = url.searchParams.get("v") || url.pathname.split('/').pop();
                
                if (videoId && videoId.length === 11) {
                    const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
                    setSubmittedUrl(cleanUrl);
                }
            } catch (error) {
                console.warn('Failed to auto-submit default URL:', error);
            }
        }
    }, [submittedUrl, youtubeUrl, isOnline]);

    const handleUrlChange = (e) => {
        setYoutubeUrl(e.target.value);
        setUrlError(null); // Clear URL error when user types
    };

    const handleUrlSubmit = (e) => {
        e.preventDefault();
        setUrlError(null);
        
        if (!isOnline) {
            setUrlError("You're offline. Please check your internet connection and try again.");
            return;
        }
        
        if (!youtubeUrl.trim()) {
            setUrlError("Please enter a YouTube URL.");
            return;
        }
        
        console.log(`Submitting URL: ${youtubeUrl}`);
        
        try {
            const url = new URL(youtubeUrl);
            const videoId = url.searchParams.get("v") || url.pathname.split('/').pop();
            
            if (!videoId || videoId.length !== 11) {
                throw new Error("Invalid YouTube URL. Please make sure you're using a valid YouTube video link.");
            }
            
            const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
            console.log(`Cleaned URL for submission: ${cleanUrl}`);
            setSubmittedUrl(cleanUrl);
            setChops([]);
            setCapturedAudioData(null);
            setShowCaptureControls(false);
            setVideoElement(null); 
        } catch (error) {
            console.error("URL processing error:", error);
            setUrlError(error.message || "Invalid YouTube URL format. Please check the URL and try again.");
        }
    };

    const handlePaste = (e) => {
        const pastedText = e.clipboardData.getData('text');
        setYoutubeUrl(pastedText);
    };

    const handlePlayerReady = useCallback((player) => {
        setYoutubePlayer(player);
        
        // Try to get video title
        try {
            if (player && player.getVideoData) {
                const videoData = player.getVideoData();
                setVideoTitle(videoData.title || 'Unknown Video');
            }
        } catch (error) {
            console.log('Could not get video title:', error.message);
        }

        // Try to get video element for capture
        setTimeout(() => {
            const video = document.querySelector('video');
            if (video) {
                setVideoElement(video);
                setShowCaptureControls(true);
                console.log('📺 Video element found for capture');
            }
        }, 1000);
    }, []);

    const setChopTime = useCallback((timeType, time) => {
        if (!selectedPadId) return;

        setChops(prevChops => {
            const existingChopIndex = prevChops.findIndex(c => c.padId === selectedPadId);
            
            if (existingChopIndex > -1) {
                const updatedChops = [...prevChops];
                updatedChops[existingChopIndex] = { 
                    ...updatedChops[existingChopIndex], 
                    [timeType]: time,
                };
                return updatedChops;
            } else {
                const padIndex = parseInt(selectedPadId.slice(1), 10);
                const startTime = timeType === 'startTime' ? time : playerState.currentTime;
                const endTime = timeType === 'endTime' ? time : Math.min(playerState.currentTime + 2, playerState.duration);
                
                return [...prevChops, {
                    padId: selectedPadId,
                    startTime,
                    endTime,
                    color: padColors[padIndex % padColors.length],
                }];
            }
        });
    }, [selectedPadId, playerState.currentTime, playerState.duration]);

    const handleCreateSample = useCallback((padId, startTime, endTime) => {
        const padIndex = parseInt(padId.slice(1), 10);
        const newChop = {
            padId,
            startTime,
            endTime,
            color: padColors[padIndex % padColors.length],
        };

        setChops(prevChops => {
            const existingIndex = prevChops.findIndex(c => c.padId === padId);
            if (existingIndex > -1) {
                const updated = [...prevChops];
                updated[existingIndex] = newChop;
                return updated;
            } else {
                return [...prevChops, newChop];
            }
        });
    }, []);

    const handleUpdateSample = useCallback((updatedChop) => {
        setChops(prevChops => {
            const existingIndex = prevChops.findIndex(c => c.padId === updatedChop.padId);
            if (existingIndex > -1) {
                const updated = [...prevChops];
                updated[existingIndex] = updatedChop;
                return updated;
            }
            return prevChops;
        });
    }, []);

    const handleDeleteChop = useCallback((padId) => {
        setChops(prevChops => prevChops.filter(c => c.padId !== padId));
        if (selectedPadId === padId) {
            setSelectedPadId(null);
        }
    }, [selectedPadId]);

    const getStatusInfo = () => {
        const baseInfo = {
            message: '',
            type: 'info', // 'info', 'loading', 'success', 'error'
            showProgress: false,
            showRetry: false,
            actionable: null
        };

        switch (analysisStatus) {
            case 'idle':
                return {
                    ...baseInfo,
                    message: 'Enter a YouTube URL to load video.',
                    type: 'info'
                };
            case 'fetching':
                return {
                    ...baseInfo,
                    message: 'Loading video...',
                    type: 'loading',
                    showProgress: false
                };
            case 'decoding':
                return {
                    ...baseInfo,
                    message: 'Loading video...',
                    type: 'loading',
                    showProgress: false
                };
            case 'ready':
                const captureMessage = capturedAudioData 
                    ? 'Audio captured! Create samples by pressing keys or use capture controls.'
                    : 'Video ready. Use capture controls or press keys to create samples!';
                return {
                    ...baseInfo,
                    message: captureMessage,
                    type: 'success'
                };
            default:
                if (analysisStatus.startsWith('error:')) {
                    const errorMsg = analysisStatus.substring(6);
                    return {
                        ...baseInfo,
                        message: getErrorMessage(errorMsg),
                        type: 'error',
                        showRetry: true,
                        actionable: getErrorActionable(errorMsg)
                    };
                }
                return {
                    ...baseInfo,
                    message: 'Loading...',
                    type: 'loading'
                };
        }
    };

    const getErrorMessage = (errorMsg) => {
        if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
            return 'Network error: Unable to load video. Check your internet connection.';
        }
        if (errorMsg.includes('timeout')) {
            return 'Loading timeout: The video is taking too long to load.';
        }
        if (errorMsg.includes('unavailable') || errorMsg.includes('private')) {
            return 'Video unavailable: This video may be private, deleted, or restricted.';
        }
        if (errorMsg.includes('quota') || errorMsg.includes('limit')) {
            return 'Service limit reached: Please try again later.';
        }
        return `Video loading failed: ${errorMsg}`;
    };

    const getErrorActionable = (errorMsg) => {
        if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
            return 'Check your internet connection and try again.';
        }
        if (errorMsg.includes('timeout')) {
            return 'Try refreshing the page or check your connection speed.';
        }
        if (errorMsg.includes('unavailable') || errorMsg.includes('private')) {
            return 'Try a different public YouTube video.';
        }
        if (errorMsg.includes('quota') || errorMsg.includes('limit')) {
            return 'Wait a few minutes and try again.';
        }
        return 'Try refreshing the page or using a different video.';
    };

    const handleRetry = () => {
        setShowAudioFallback(false);
        if (retry) {
            retry();
        }
    };

    const handleAudioError = (error, errorInfo) => {
        console.error('Audio processing error caught by boundary:', error, errorInfo);
        setShowAudioFallback(true);
    };

    const handleAudioReset = () => {
        setShowAudioFallback(false);
        setSubmittedUrl('');
        setChops([]);
    };

    const handleVideoError = (error, errorInfo) => {
        console.error('Video player error caught by boundary:', error, errorInfo);
    };

    const handleSampleError = (error, errorInfo) => {
        console.error('Sample playback error caught by boundary:', error, errorInfo);
    };

    const handleTimestampClick = useCallback((timestamp, chop) => {
        if (youtubePlayer) {
            youtubePlayer.seekTo(timestamp, true);
            if (chop) {
                setSelectedPadId(chop.padId);
            }
        }
    }, [youtubePlayer]);

    const handlePlayPause = useCallback(() => {
        if (youtubePlayer) {
            if (playerState.isPlaying) {
                youtubePlayer.pauseVideo();
            } else {
                youtubePlayer.playVideo();
            }
        }
    }, [youtubePlayer, playerState.isPlaying]);

    // Session management functions
    const getCurrentSessionData = useCallback(() => {
        return {
            youtubeUrl: submittedUrl,
            chops,
            activeBank,
            playerState
        };
    }, [submittedUrl, chops, activeBank, playerState]);

    const handleLoadSession = useCallback((session) => {
        // Load the YouTube video
        setYoutubeUrl(session.youtubeUrl);
        setSubmittedUrl(session.youtubeUrl);
        
        // Restore chops and settings
        setChops(session.chops || []);
        setActiveBank(session.activeBank || 'A');
        setSelectedPadId(null);
        
        console.log(`📂 Session loaded: ${session.name}`);
        console.log(`🎵 Video: ${session.youtubeUrl}`);
        console.log(`📊 Restored ${session.chops?.length || 0} chops`);
    }, []);

    const handleNewSession = useCallback(() => {
        // Clear current session
        setYoutubeUrl('');
        setSubmittedUrl('');
        setChops([]);
        setActiveBank('A');
        setSelectedPadId(null);
        setShowSessionManager(false);
        setCapturedAudioData(null);
        setShowCaptureControls(false);
        
        console.log('🆕 New session started');
    }, []);

    // Handle capture completion
    const handleCaptureComplete = useCallback((captureResult) => {
        console.log('🎵 Audio capture completed:', captureResult);
        setCapturedAudioData(captureResult);
        
        // The captured audio can now be used for sample creation
        // This integrates with the existing sample workflow
    }, []);

    // Handle capture errors
    const handleCaptureError = useCallback((error) => {
        console.error('❌ Audio capture error:', error);
        // Could show a toast notification or error state
    }, []);

    // Add missing handleSaveSession function
    const handleSaveSession = useCallback((sessionName) => {
        // This would integrate with the SessionManager
        console.log('💾 Saving session:', sessionName);
    }, []);



    const statusInfo = getStatusInfo();

    return (
        <div className="space-y-6">
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg p-6"
            >
                <form onSubmit={handleUrlSubmit} className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Youtube className="w-6 h-6 text-red-500 flex-shrink-0" />
                        {!isOnline && <WifiOff className="w-4 h-4 text-red-400" />}
                        {isOnline && <Wifi className="w-4 h-4 text-green-400" />}
                    </div>
                    <Input
                        type="text"
                        placeholder="Paste a YouTube URL to begin..."
                        value={youtubeUrl}
                        onPaste={handlePaste}
                        onChange={handleUrlChange}
                        className={`bg-white/10 border-white/20 placeholder-gray-400 ${
                            urlError ? 'border-red-400 focus:border-red-400' : ''
                        }`}
                        disabled={!isOnline}
                    />
                    <Button 
                        type="submit" 
                        className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold"
                        disabled={!isOnline || analysisStatus === 'fetching' || analysisStatus === 'decoding'}
                    >
                        {analysisStatus === 'fetching' || analysisStatus === 'decoding' ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Loading
                            </>
                        ) : (
                            'Load Video'
                        )}
                    </Button>
                    <Button
                        onClick={() => setShowSessionManager(true)}
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                    >
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Sessions
                    </Button>

                </form>

                {/* URL Error Alert */}
                <AnimatePresence>
                    {urlError && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4"
                        >
                            <Alert className="border-red-400 bg-red-400/10">
                                <AlertCircle className="h-4 w-4 text-red-400" />
                                <AlertDescription className="text-red-200">
                                    {urlError}
                                </AlertDescription>
                            </Alert>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Status Display */}
                <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {statusInfo.type === 'loading' && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
                            {statusInfo.type === 'success' && <CheckCircle className="w-4 h-4 text-green-400" />}
                            {statusInfo.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
                            <span className={`text-sm font-medium ${
                                statusInfo.type === 'error' ? 'text-red-200' :
                                statusInfo.type === 'success' ? 'text-green-200' :
                                statusInfo.type === 'loading' ? 'text-cyan-200' :
                                'text-white/60'
                            }`}>
                                {statusInfo.message}
                            </span>
                        </div>
                        
                        {statusInfo.showRetry && (
                            <Button
                                onClick={handleRetry}
                                variant="outline"
                                size="sm"
                                className="border-white/20 text-white/80 hover:bg-white/10"
                            >
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Retry
                            </Button>
                        )}
                    </div>

                    {/* Progress Bar */}
                    {statusInfo.showProgress && (
                        <div className="space-y-2">
                            <Progress 
                                value={progress} 
                                className="h-2 bg-white/10"
                            />
                            <div className="flex justify-between text-xs text-white/50">
                                <span>{Math.round(progress)}% complete</span>
                                {downloadStats?.bytesReceived && downloadStats?.totalBytes && (
                                    <span>
                                        {Math.round(downloadStats.bytesReceived / 1024 / 1024)}MB / 
                                        {Math.round(downloadStats.totalBytes / 1024 / 1024)}MB
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Actionable Error Message */}
                    {statusInfo.actionable && (
                        <div className="text-xs text-white/40 italic">
                            💡 {statusInfo.actionable}
                        </div>
                    )}

                    {/* Captured Audio Indicator */}
                    {capturedAudioData && (
                        <div className="flex items-center gap-2 text-xs text-purple-300 bg-purple-500/10 rounded-lg px-3 py-2">
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                            <span>
                                Using captured audio ({capturedAudioData.metadata.duration.toFixed(1)}s) 
                                - High quality samples available
                            </span>
                        </div>
                    )}

                    {/* Download Stats for Debugging */}
                    {downloadStats && (downloadStats.attempt > 1 || downloadStats.lastError) && (
                        <details className="text-xs text-white/40">
                            <summary className="cursor-pointer hover:text-white/60">
                                Technical Details
                            </summary>
                            <div className="mt-2 space-y-1 pl-4 border-l border-white/10">
                                {downloadStats.attempt > 1 && (
                                    <div>Retry attempt: {downloadStats.attempt}/{downloadStats.maxAttempts}</div>
                                )}
                                {downloadStats.retryDelay && (
                                    <div>Next retry in: {Math.round(downloadStats.retryDelay / 1000)}s</div>
                                )}
                                {downloadStats.lastError && (
                                    <div>Last error: {downloadStats.lastError}</div>
                                )}
                            </div>
                        </details>
                    )}
                </div>
            </motion.div>

            {/* Show fallback UI if audio processing has failed */}
            {showAudioFallback && error ? (
                <AudioFallbackUI
                    error={error}
                    onRetry={handleRetry}
                    onReset={handleAudioReset}
                    youtubeUrl={submittedUrl}
                    isRetrying={audioErrorRecovery.isRetrying}
                    retryCount={audioErrorRecovery.retryCount}
                />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <VideoPlayerErrorBoundary
                            youtubeUrl={submittedUrl}
                            onError={handleVideoError}
                            onRetry={handleRetry}
                            onReset={handleAudioReset}
                        >
                            <VideoPlayer 
                                youtubeUrl={submittedUrl}
                                setPlayerState={setPlayerState}
                                volume={masterVolume}
                                onPlayerReady={handlePlayerReady}
                            />
                        </VideoPlayerErrorBoundary>
                        
                        {/* Waveform visualization placeholder - removed experimental components */}
                        <div className="bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl p-6 text-center">
                            <div className="text-white/60 text-sm">
                                Waveform visualization will be implemented here
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <Controls
                            activeBank={activeBank}
                            setActiveBank={setActiveBank}
                            masterVolume={masterVolume}
                            setMasterVolume={setMasterVolume}
                            chops={chops}
                            youtubeUrl={submittedUrl}
                        />
                        
                        {/* YouTube Capture Controls */}
                        {showCaptureControls && submittedUrl && (
                            <YouTubeCaptureControls
                                youtubeUrl={submittedUrl}
                                videoElement={videoElement}
                                onCaptureComplete={handleCaptureComplete}
                                onCaptureError={handleCaptureError}
                                isVideoReady={analysisStatus === 'ready'}
                            />
                        )}
                        <div className={`relative ${analysisStatus !== 'ready' ? 'opacity-50 pointer-events-none' : ''}`}>
                            <SamplePlaybackErrorBoundary
                                onError={handleSampleError}
                                onRetry={handleRetry}
                                onReset={() => setChops([])}
                            >
                                <PadGridFixed 
                                    chops={chops}
                                    activeBank={activeBank}
                                    selectedPadId={selectedPadId}
                                    setSelectedPadId={setSelectedPadId}
                                    setPlayerState={setPlayerState}
                                    playerState={playerState}
                                    onCreateSample={handleCreateSample}
                                    onUpdateSample={handleUpdateSample}
                                    onDeleteSample={handleDeleteChop}
                                    youtubePlayer={youtubePlayer}
                                    audioBuffer={capturedAudioData?.audioBuffer || audioBuffer}
                                    capturedAudioData={capturedAudioData}
                                />
                            </SamplePlaybackErrorBoundary>
                            {analysisStatus !== 'ready' && (
                                <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                                    <p className="text-white/80 font-semibold">Waiting for video...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Session Manager */}
            <SessionManager
                currentSession={getCurrentSessionData()}
                onLoadSession={handleLoadSession}
                onSaveSession={handleSaveSession}
                isOpen={showSessionManager}
                onClose={() => setShowSessionManager(false)}
            />
        </div>
    );
}