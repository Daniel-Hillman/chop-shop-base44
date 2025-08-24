/**
 * VideoPlayer Integration Demo
 * 
 * This demo shows how to use the enhanced VideoPlayer component with SamplePlaybackEngine integration
 * for video-audio synchronization and seamless sample triggering.
 */

import React, { useState, useCallback } from 'react';
import VideoPlayer from './VideoPlayer';

export default function VideoPlayerDemo() {
  const [playerState, setPlayerState] = useState({
    currentTime: 0,
    duration: 0,
    isPlaying: false
  });
  const [youtubePlayer, setYoutubePlayer] = useState(null);
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [syncErrors, setSyncErrors] = useState([]);

  // Mock audio buffer for demo (in real app, this comes from AudioProcessingService)
  const mockAudioBuffer = new ArrayBuffer(1024);

  const handlePlayerReady = useCallback((playerWithSync) => {
    console.log('YouTube player ready with sync capabilities:', playerWithSync);
    setYoutubePlayer(playerWithSync);

    // The player now has these additional methods:
    // - syncToTimestamp(timestamp, maintainPlayback)
    // - handleSampleTriggered(sampleTimestamp)  
    // - getSyncStatus()
    // - sampleEngine (direct access to SamplePlaybackEngine)
  }, []);

  const handleSyncError = useCallback((error) => {
    console.error('Video-audio sync error:', error);
    setSyncErrors(prev => [...prev, {
      timestamp: Date.now(),
      message: error.message
    }]);
  }, []);

  // Demo: Sync video to specific timestamp
  const syncToTimestamp = async (timestamp) => {
    if (youtubePlayer?.syncToTimestamp) {
      try {
        await youtubePlayer.syncToTimestamp(timestamp, true);
        console.log(`Synced to timestamp: ${timestamp}`);
      } catch (error) {
        console.error('Sync failed:', error);
      }
    }
  };

  // Demo: Trigger sample with video sync
  const triggerSample = async (sampleTimestamp) => {
    if (youtubePlayer?.handleSampleTriggered) {
      try {
        await youtubePlayer.handleSampleTriggered(sampleTimestamp);
        console.log(`Sample triggered at: ${sampleTimestamp}`);
      } catch (error) {
        console.error('Sample trigger failed:', error);
      }
    }
  };

  // Demo: Get sync status
  const getSyncStatus = () => {
    if (youtubePlayer?.getSyncStatus) {
      const status = youtubePlayer.getSyncStatus();
      console.log('Current sync status:', status);
      return status;
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">VideoPlayer with Audio Sync Demo</h2>
      
      {/* Enhanced VideoPlayer with sync capabilities */}
      <VideoPlayer
        youtubeUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        setPlayerState={setPlayerState}
        volume={0.8}
        onPlayerReady={handlePlayerReady}
        audioBuffer={mockAudioBuffer}
        onSyncError={handleSyncError}
      />

      {/* Demo Controls */}
      <div className="flex space-x-2">
        <button 
          onClick={() => syncToTimestamp(30)}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Sync to 30s
        </button>
        <button 
          onClick={() => syncToTimestamp(60)}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Sync to 60s
        </button>
        <button 
          onClick={() => triggerSample(45)}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          Trigger Sample at 45s
        </button>
        <button 
          onClick={getSyncStatus}
          className="px-4 py-2 bg-purple-500 text-white rounded"
        >
          Get Sync Status
        </button>
      </div>

      {/* Player State Display */}
      <div className="bg-gray-100 p-4 rounded">
        <h3 className="font-semibold">Player State:</h3>
        <pre>{JSON.stringify(playerState, null, 2)}</pre>
      </div>

      {/* Sync Errors Display */}
      {syncErrors.length > 0 && (
        <div className="bg-red-100 p-4 rounded">
          <h3 className="font-semibold text-red-800">Sync Errors:</h3>
          {syncErrors.map((error, index) => (
            <div key={index} className="text-red-600">
              {new Date(error.timestamp).toLocaleTimeString()}: {error.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Integration Notes:
 * 
 * 1. The VideoPlayer now accepts audioBuffer and onSyncError props
 * 2. When onPlayerReady is called, the player object includes sync methods:
 *    - syncToTimestamp: Synchronizes video and audio to a specific timestamp
 *    - handleSampleTriggered: Handles sample playback with optional video sync
 *    - getSyncStatus: Returns current synchronization status
 *    - sampleEngine: Direct access to the SamplePlaybackEngine instance
 * 
 * 3. Error handling is built-in with onSyncError callback
 * 4. Visual sync status indicator appears when audioBuffer is provided
 * 5. Automatic cleanup of SamplePlaybackEngine when component unmounts
 * 
 * Usage in ChopperPage:
 * - Pass the audioBuffer from useAudioAnalysis hook
 * - Use the sync methods when pad triggers occur
 * - Handle sync errors appropriately in the UI
 * - Monitor sync status for debugging
 */