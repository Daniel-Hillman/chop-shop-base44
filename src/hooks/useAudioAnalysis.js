import { useState, useEffect, useRef, useCallback } from 'react';
import audioProcessingService from '../services/AudioProcessingService.js';

export function useAudioAnalysis(youtubeUrl) {
    const [analysisStatus, setAnalysisStatus] = useState('idle');
    const [waveformData, setWaveformData] = useState(null);
    const [audioBuffer, setAudioBuffer] = useState(null);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [downloadStats, setDownloadStats] = useState(null);
    
    // Track current URL to handle cleanup
    const currentUrlRef = useRef(null);
    const isActiveRef = useRef(true);

    // Progress callback for AudioProcessingService
    const handleProgress = useCallback((progressData) => {
        // Only update if this is still the active request
        if (!isActiveRef.current || currentUrlRef.current !== youtubeUrl) {
            return;
        }

        setProgress(progressData.progress || 0);
        
        // Map service status to analysis status with detailed reporting
        // Maintain backward compatibility with existing status names
        switch (progressData.status) {
            case 'downloading':
                setAnalysisStatus('fetching'); // Backward compatibility
                setDownloadStats({
                    attempt: progressData.attempt,
                    maxAttempts: progressData.maxAttempts,
                    bytesReceived: progressData.bytesReceived,
                    totalBytes: progressData.totalBytes
                });
                break;
            case 'processing':
                setAnalysisStatus('decoding'); // Backward compatibility
                break;
            case 'generating_waveform':
                setAnalysisStatus('decoding'); // Keep as decoding for backward compatibility
                break;
            case 'retrying':
                setAnalysisStatus('fetching'); // Show as fetching during retries
                setDownloadStats({
                    attempt: progressData.attempt,
                    maxAttempts: progressData.maxAttempts,
                    retryDelay: progressData.retryDelay,
                    lastError: progressData.error
                });
                break;
            case 'ready':
                setAnalysisStatus('ready');
                setDownloadStats(null);
                break;
            case 'error':
                setAnalysisStatus(`error: ${progressData.error}`); // Backward compatibility
                setError(progressData.error);
                setDownloadStats(null);
                break;
            default:
                break;
        }
    }, [youtubeUrl]);

    // Retry function for error recovery
    const retry = useCallback(async () => {
        if (!youtubeUrl) return;
        
        setError(null);
        setAnalysisStatus('idle');
        setProgress(0);
        setDownloadStats(null);
        
        // Clear any cached data for this URL to force fresh download
        audioProcessingService.cancelDownload(youtubeUrl);
        
        // Trigger re-analysis
        analyzeAudio();
    }, [youtubeUrl]);

    // Main analysis function
    const analyzeAudio = useCallback(async () => {
        if (!youtubeUrl || !isActiveRef.current) {
            return;
        }

        currentUrlRef.current = youtubeUrl;
        
        // Reset state
        setError(null);
        setWaveformData(null);
        setAudioBuffer(null);
        setProgress(0);
        setDownloadStats(null);

        // For YouTube URLs, just set ready status - no audio download needed
        if (youtubeUrl.includes('youtube.com') || youtubeUrl.includes('youtu.be')) {
            setAnalysisStatus('ready');
            setProgress(100);
            return;
        }

        // Check if already cached (for non-YouTube URLs)
        const cached = audioProcessingService.getAudioBuffer(youtubeUrl);
        if (cached) {
            setAudioBuffer(cached.audioBuffer);
            setWaveformData(cached.waveformData);
            setAnalysisStatus('ready');
            setProgress(100);
            return;
        }

        try {
            setAnalysisStatus('fetching'); // Backward compatibility
            
            const result = await audioProcessingService.downloadAndProcessAudio(
                youtubeUrl,
                handleProgress
            );

            // Only update state if this is still the active request
            if (isActiveRef.current && currentUrlRef.current === youtubeUrl) {
                setAudioBuffer(result.audioBuffer);
                setWaveformData(result.waveformData);
                setAnalysisStatus('ready');
                setProgress(100);
                setError(null);
                setDownloadStats(null);
            }

        } catch (error) {
            // Only update error state if this is still the active request
            if (isActiveRef.current && currentUrlRef.current === youtubeUrl) {
                console.error('Audio Analysis Error:', error);
                setAnalysisStatus(`error: ${error.message}`); // Backward compatibility
                setError(error.message);
                setWaveformData(null);
                setAudioBuffer(null);
                setProgress(0);
                setDownloadStats(null);
            }
        }
    }, [youtubeUrl, handleProgress]);

    useEffect(() => {
        isActiveRef.current = true;
        
        if (!youtubeUrl) {
            setAnalysisStatus('idle');
            setWaveformData(null);
            setAudioBuffer(null);
            setProgress(0);
            setError(null);
            setDownloadStats(null);
            currentUrlRef.current = null;
            return;
        }

        analyzeAudio();

        // Cleanup function
        return () => {
            isActiveRef.current = false;
            
            // Cancel any ongoing download for this URL
            if (currentUrlRef.current) {
                audioProcessingService.cancelDownload(currentUrlRef.current);
            }
        };
    }, [youtubeUrl, analyzeAudio]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isActiveRef.current = false;
            if (currentUrlRef.current) {
                audioProcessingService.cancelDownload(currentUrlRef.current);
            }
        };
    }, []);

    return {
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
        
        // Service stats (for debugging)
        serviceStats: audioProcessingService.getStats(),
        
        // Helper methods
        isCached: youtubeUrl ? audioProcessingService.isCached(youtubeUrl) : false,
        cancelDownload: () => {
            if (youtubeUrl) {
                audioProcessingService.cancelDownload(youtubeUrl);
            }
        }
    };
}
