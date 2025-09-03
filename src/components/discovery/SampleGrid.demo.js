/**
 * @fileoverview Demo file for SampleGrid component
 * Demonstrates various states and responsive behavior of the sample grid
 */

import React, { useState } from 'react';
import SampleGrid from './SampleGrid.jsx';

// Mock sample data for demo
const mockSamples = [
  {
    id: 'sample-1',
    title: 'Funky Drummer',
    artist: 'James Brown',
    year: 1970,
    genre: 'Funk',
    duration: 180,
    youtubeId: 'dNP8tbDMZNE',
    thumbnailUrl: 'https://img.youtube.com/vi/dNP8tbDMZNE/mqdefault.jpg',
    tempo: 120,
    instruments: ['drums', 'bass', 'guitar'],
    tags: ['classic', 'break', 'sampled'],
    isMock: false
  },
  {
    id: 'sample-2',
    title: 'Amen Break',
    artist: 'The Winstons',
    year: 1969,
    genre: 'Soul',
    duration: 240,
    youtubeId: '5SaFTm2bcac',
    thumbnailUrl: 'https://img.youtube.com/vi/5SaFTm2bcac/mqdefault.jpg',
    tempo: 136,
    instruments: ['drums'],
    tags: ['break', 'jungle', 'dnb'],
    isMock: true
  },
  {
    id: 'sample-3',
    title: 'Apache',
    artist: 'The Incredible Bongo Band',
    year: 1973,
    genre: 'Funk',
    duration: 195,
    youtubeId: 'WY-Z6wm6TMQ',
    thumbnailUrl: 'https://img.youtube.com/vi/WY-Z6wm6TMQ/mqdefault.jpg',
    tempo: 110,
    instruments: ['drums', 'bongos', 'bass'],
    tags: ['classic', 'hip-hop'],
    isMock: false
  },
  {
    id: 'sample-4',
    title: 'Think (About It)',
    artist: 'Lyn Collins',
    year: 1972,
    genre: 'Funk',
    duration: 210,
    youtubeId: 'ZyaK3jo4Sl4',
    thumbnailUrl: 'https://img.youtube.com/vi/ZyaK3jo4Sl4/mqdefault.jpg',
    tempo: 125,
    instruments: ['vocals', 'drums', 'bass'],
    tags: ['vocal', 'break'],
    isMock: true
  },
  {
    id: 'sample-5',
    title: 'Impeach the President',
    artist: 'The Honey Drippers',
    year: 1973,
    genre: 'Funk',
    duration: 165,
    youtubeId: 'uagQ4Uco52k',
    thumbnailUrl: 'https://img.youtube.com/vi/uagQ4Uco52k/mqdefault.jpg',
    tempo: 100,
    instruments: ['drums', 'bass'],
    tags: ['break', 'political'],
    isMock: false
  },
  {
    id: 'sample-6',
    title: 'Ashley\'s Roachclip',
    artist: 'The Soul Searchers',
    year: 1974,
    genre: 'Funk',
    duration: 320,
    youtubeId: 'yQHQZbGzOqA',
    thumbnailUrl: 'https://img.youtube.com/vi/yQHQZbGzOqA/mqdefault.jpg',
    tempo: 115,
    instruments: ['drums', 'bass', 'guitar'],
    tags: ['groove', 'extended'],
    isMock: true
  }
];

/**
 * Demo component showcasing SampleGrid functionality
 */
const SampleGridDemo = () => {
  const [currentState, setCurrentState] = useState('loaded');
  const [currentPlayingSampleId, setCurrentPlayingSampleId] = useState(null);
  const [favoriteSampleIds, setFavoriteSampleIds] = useState(['sample-2', 'sample-4']);
  const [hasFilters, setHasFilters] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const handleSamplePlay = (sample) => {
    setCurrentPlayingSampleId(
      currentPlayingSampleId === sample.id ? null : sample.id
    );
  };

  const handleSampleFavorite = (sample) => {
    setFavoriteSampleIds(prev => 
      prev.includes(sample.id)
        ? prev.filter(id => id !== sample.id)
        : [...prev, sample.id]
    );
  };

  const handleClearFilters = () => {
    setHasFilters(false);
  };

  const handleShuffle = () => {
    setCurrentState('loading');
    setTimeout(() => {
      setCurrentState('loaded');
    }, 2000);
  };

  const handleRetry = () => {
    setCurrentState('loading');
    setTimeout(() => {
      setCurrentState('loaded');
    }, 1500);
  };

  const getPropsForState = () => {
    const baseProps = {
      onSamplePlay: handleSamplePlay,
      onSampleFavorite: handleSampleFavorite,
      onClearFilters: handleClearFilters,
      onShuffle: handleShuffle,
      onRetry: handleRetry,
      currentPlayingSampleId,
      favoriteSampleIds,
      hasFilters,
      isOffline
    };

    switch (currentState) {
      case 'loading':
        return {
          ...baseProps,
          samples: [],
          isLoading: true,
          error: null
        };
      case 'error':
        return {
          ...baseProps,
          samples: [],
          isLoading: false,
          error: 'Failed to load samples. Network connection error.'
        };
      case 'empty':
        return {
          ...baseProps,
          samples: [],
          isLoading: false,
          error: null
        };
      case 'empty-filtered':
        return {
          ...baseProps,
          samples: [],
          isLoading: false,
          error: null,
          hasFilters: true
        };
      case 'loaded':
      default:
        return {
          ...baseProps,
          samples: mockSamples,
          isLoading: false,
          error: null
        };
    }
  };

  return (
    <div style={{ 
      padding: '2rem', 
      backgroundColor: '#111827', 
      minHeight: '100vh',
      color: 'white'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '2rem', fontSize: '2rem', fontWeight: 'bold' }}>
          SampleGrid Component Demo
        </h1>

        {/* State Controls */}
        <div style={{ 
          marginBottom: '2rem', 
          padding: '1rem', 
          backgroundColor: '#374151', 
          borderRadius: '0.5rem' 
        }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Demo Controls</h2>
          
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <button
              onClick={() => setCurrentState('loaded')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: currentState === 'loaded' ? '#3b82f6' : '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer'
              }}
            >
              Loaded State
            </button>
            
            <button
              onClick={() => setCurrentState('loading')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: currentState === 'loading' ? '#3b82f6' : '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer'
              }}
            >
              Loading State
            </button>
            
            <button
              onClick={() => setCurrentState('error')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: currentState === 'error' ? '#3b82f6' : '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer'
              }}
            >
              Error State
            </button>
            
            <button
              onClick={() => setCurrentState('empty')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: currentState === 'empty' ? '#3b82f6' : '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer'
              }}
            >
              Empty State
            </button>
            
            <button
              onClick={() => setCurrentState('empty-filtered')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: currentState === 'empty-filtered' ? '#3b82f6' : '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer'
              }}
            >
              Empty (Filtered)
            </button>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={hasFilters}
                onChange={(e) => setHasFilters(e.target.checked)}
              />
              Has Filters Applied
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={isOffline}
                onChange={(e) => setIsOffline(e.target.checked)}
              />
              Offline Mode
            </label>
          </div>
        </div>

        {/* Current State Info */}
        <div style={{ 
          marginBottom: '2rem', 
          padding: '1rem', 
          backgroundColor: '#1f2937', 
          borderRadius: '0.5rem' 
        }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Current State:</h3>
          <p style={{ margin: 0, color: '#9ca3af' }}>
            State: {currentState} | 
            Filters: {hasFilters ? 'Applied' : 'None'} | 
            Offline: {isOffline ? 'Yes' : 'No'} | 
            Playing: {currentPlayingSampleId || 'None'} | 
            Favorites: {favoriteSampleIds.length}
          </p>
        </div>

        {/* SampleGrid Component */}
        <div style={{ 
          backgroundColor: '#1f2937', 
          borderRadius: '0.5rem', 
          padding: '1.5rem' 
        }}>
          <SampleGrid {...getPropsForState()} />
        </div>

        {/* Usage Instructions */}
        <div style={{ 
          marginTop: '2rem', 
          padding: '1rem', 
          backgroundColor: '#374151', 
          borderRadius: '0.5rem' 
        }}>
          <h3 style={{ marginBottom: '1rem' }}>Usage Instructions:</h3>
          <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#d1d5db' }}>
            <li>Use the demo controls above to switch between different states</li>
            <li>Click on sample cards to play/pause (simulated)</li>
            <li>Click the heart icon to favorite/unfavorite samples</li>
            <li>Try different combinations of filters and offline mode</li>
            <li>Resize the window to test responsive behavior</li>
            <li>The grid automatically adapts to different screen sizes</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SampleGridDemo;