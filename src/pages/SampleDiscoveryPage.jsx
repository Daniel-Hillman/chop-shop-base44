import React, { useState, useEffect } from 'react';
import DiscoveryControls from '../components/discovery/DiscoveryControls.jsx';
import SampleGrid from '../components/discovery/SampleGrid.jsx';
import DiscoveryVideoPlayer from '../components/discovery/DiscoveryVideoPlayer.jsx';
import DiscoveryVideoPlayerErrorBoundary from '../components/discovery/DiscoveryVideoPlayerErrorBoundary.jsx';
import ChopperIntegrationGuide from '../components/discovery/ChopperIntegrationGuide.jsx';
import { useDiscoveryState } from '../hooks/useDiscoveryState.js';
import { useChopperIntegration } from '../hooks/useChopperIntegration.js';

/**
 * Sample Discovery Page - Completely isolated from ChopperPage functionality
 * 
 * This page provides vintage sample discovery (1950s-1990s) with its own
 * YouTube player and state management. It maintains zero dependencies on
 * ChopperPage components to ensure complete isolation.
 * 
 * Requirements: 1.1, 1.2, 1.3
 */
const SampleDiscoveryPage = () => {
  // Use discovery state hook with YouTube API integration
  const {
    state: discoveryState,
    fetchSamples,
    setCurrentSample,
    setFilters,
    setLoading,
    setError,
    setOnline
  } = useDiscoveryState();

  // Chopper integration functionality
  const {
    transferStatus,
    showGuide,
    currentSample: integrationSample,
    transferSampleToChopper,
    quickTransferToChopper,
    showIntegrationGuide,
    hideIntegrationGuide,
    resetTransferStatus
  } = useChopperIntegration();

  // Monitor online status for graceful degradation
  useEffect(() => {
    const handleOnlineStatus = () => {
      setOnline(navigator.onLine);
    };

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, [setOnline]);

  // Load initial samples on mount
  useEffect(() => {
    fetchSamples();
  }, [fetchSamples]);

  // Listen for sample action events from SampleCard components
  useEffect(() => {
    const handleSampleAction = (event) => {
      const { action, sample } = event.detail;
      
      if (action === 'useInChopper') {
        // Show integration guide for better user experience
        showIntegrationGuide(sample);
      }
    };

    window.addEventListener('sampleAction', handleSampleAction);

    return () => {
      window.removeEventListener('sampleAction', handleSampleAction);
    };
  }, [showIntegrationGuide]);

  // Handle filter changes
  const handleFilterChange = async (newFilters) => {
    setFilters(newFilters);
    // Fetch new samples with the updated filters
    await fetchSamples(newFilters);
  };

  // Handle shuffle functionality
  const handleShuffle = async () => {
    // Fetch new samples with current filters (shuffle effect)
    await fetchSamples();
  };

  // Handle sample play - enhanced workflow
  const handleSamplePlay = (sample) => {
    const isCurrentlyPlaying = discoveryState.currentSample?.id === sample.id;
    
    // If clicking the same sample, toggle playback
    if (isCurrentlyPlaying) {
      setCurrentSample(null);
      setError(null);
    } else {
      // Load new sample
      setCurrentSample(sample);
      setLoading(true);
      setError(null);
    }
  };

  // Handle video player events - enhanced workflow
  const handlePlayerReady = (player) => {
    console.log('Discovery video player ready:', player);
    
    // Clear loading state when player is ready
    setLoading(false);
    setError(null);
  };

  const handlePlayerError = (error, errorMessage) => {
    console.error('Discovery video player error:', error, errorMessage);
    setError(errorMessage || 'Video player error occurred');
    setLoading(false);
  };

  const handlePlayerStateChange = ({ state, isPlaying, isBuffering, player }) => {
    console.log('Discovery video player state change:', { state, isPlaying, isBuffering });
    
    // Update loading state based on buffering
    setLoading(isBuffering);
    
    // Clear errors when buffering starts
    if (isBuffering) {
      setError(null);
    }
  };

  const handlePlayerTimeUpdate = (currentTime) => {
    // Track playback progress for analytics and user experience
    if (discoveryState.currentSample) {
      console.log(`Playback progress: ${currentTime}s of ${discoveryState.currentSample.title}`);
      
      // Could emit analytics events here
      // Could update progress bars or other UI elements
    }
  };

  const handleSelectDifferentSample = () => {
    // Clear current sample and let user select a different one
    setCurrentSample(null);
  };

  // Handle quick "Use in Chopper" functionality (for direct button clicks)
  const handleQuickUseInChopper = async (sample) => {
    const result = await quickTransferToChopper(sample);
    
    if (!result.success) {
      console.error('Quick transfer failed:', result.message);
      // Could show error toast here
    }
  };

  // Handle sample favorite
  const handleSampleFavorite = async (sample) => {
    const isFavorite = discoveryState.favorites.some(fav => fav.id === sample.id);
    
    if (isFavorite) {
      // Remove from favorites (this will be handled by the hook)
      console.log('Remove from favorites:', sample.title);
    } else {
      // Add to favorites (this will be handled by the hook)
      console.log('Add to favorites:', sample.title);
    }
  };

  // Handle clear filters
  const handleClearFilters = async () => {
    const defaultFilters = { genres: [], yearRange: { start: 1950, end: 1995 } };
    setFilters(defaultFilters);
    await fetchSamples(defaultFilters);
  };

  // Handle retry
  const handleRetry = async () => {
    setError(null);
    await fetchSamples();
  };

  // Check if filters are applied
  const hasFilters = discoveryState.filters.genres.length > 0 || 
    discoveryState.filters.yearRange.start > 1950 || 
    discoveryState.filters.yearRange.end < 1995;

  return (
    <div className="sample-discovery-page min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Sample Discovery</h1>
          <p className="text-gray-300 text-lg">
            Discover vintage samples from the 1950s-1990s
          </p>
          {!discoveryState.isOnline && (
            <div className="mt-4 p-3 bg-yellow-600 rounded-lg">
              <p className="text-sm">
                You're offline. Showing cached samples and demo content.
              </p>
            </div>
          )}
        </header>

        {/* Main Content Area */}
        <main className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Controls Panel */}
          <aside className="lg:col-span-1">
            <DiscoveryControls
              filters={discoveryState.filters}
              onFilterChange={handleFilterChange}
              onShuffle={handleShuffle}
              isLoading={discoveryState.isLoading}
              error={discoveryState.error}
            />
          </aside>

          {/* Sample Grid */}
          <section className="lg:col-span-3">
            <div className="bg-gray-800 rounded-lg p-6">
              <SampleGrid
                samples={discoveryState.samples}
                isLoading={discoveryState.isLoading}
                error={discoveryState.error}
                isOffline={!discoveryState.isOnline}
                hasFilters={hasFilters}
                onSamplePlay={handleSamplePlay}
                onSampleFavorite={handleSampleFavorite}
                onClearFilters={handleClearFilters}
                onShuffle={handleShuffle}
                onRetry={handleRetry}
                currentPlayingSampleId={discoveryState.currentSample?.id}
                favoriteSampleIds={discoveryState.favorites.map(fav => fav.id)}
              />
            </div>
          </section>
        </main>

        {/* Video Player Section */}
        <section className="mt-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Sample Player</h2>
              {discoveryState.currentSample && (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => showIntegrationGuide(discoveryState.currentSample)}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-black font-medium rounded-lg transition-colors"
                    title="Show step-by-step guide for using this sample in Chopper"
                  >
                    Use in Chopper
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickUseInChopper(discoveryState.currentSample)}
                    className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-black rounded-lg transition-colors"
                    title="Quick transfer to Chopper without guide"
                  >
                    Quick Transfer
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectDifferentSample}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
            
            {/* Enhanced Player with Loading State */}
            <div className="relative">
              {discoveryState.isLoading && discoveryState.currentSample && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-lg">
                  <div className="flex items-center space-x-3 text-white">
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Loading sample...</span>
                  </div>
                </div>
              )}
              
              <DiscoveryVideoPlayerErrorBoundary
                videoId={discoveryState.currentSample?.youtubeId}
                sample={discoveryState.currentSample}
                onError={handlePlayerError}
                onSelectDifferentSample={handleSelectDifferentSample}
              >
                <DiscoveryVideoPlayer
                  videoId={discoveryState.currentSample?.youtubeId}
                  sample={discoveryState.currentSample}
                  onReady={handlePlayerReady}
                  onError={handlePlayerError}
                  onStateChange={handlePlayerStateChange}
                  onTimeUpdate={handlePlayerTimeUpdate}
                  volume={0.7}
                  autoplay={false}
                  className="w-full"
                />
              </DiscoveryVideoPlayerErrorBoundary>
            </div>

            {/* Enhanced Sample Metadata Display */}
            {discoveryState.currentSample && (
              <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Now Playing</h3>
                    <p className="text-cyan-400 font-medium">{discoveryState.currentSample.title}</p>
                    <p className="text-gray-300">{discoveryState.currentSample.artist}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Year:</span>
                      <span className="text-white">{discoveryState.currentSample.year}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Genre:</span>
                      <span className="text-white">{discoveryState.currentSample.genre}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Duration:</span>
                      <span className="text-white">
                        {Math.floor(discoveryState.currentSample.duration / 60)}:
                        {(discoveryState.currentSample.duration % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                    {discoveryState.currentSample.tempo && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Tempo:</span>
                        <span className="text-white">{discoveryState.currentSample.tempo} BPM</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Instruments Tags */}
                {discoveryState.currentSample.instruments && discoveryState.currentSample.instruments.length > 0 && (
                  <div className="mt-3">
                    <span className="text-gray-400 text-sm">Instruments: </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {discoveryState.currentSample.instruments.map((instrument, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-600 text-white text-xs rounded-full"
                        >
                          {instrument}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Chopper Integration Guide */}
        <ChopperIntegrationGuide
          sample={integrationSample}
          isVisible={showGuide}
          onClose={hideIntegrationGuide}
          onTransfer={transferSampleToChopper}
          transferStatus={transferStatus}
        />
      </div>
    </div>
  );
};

export default SampleDiscoveryPage;