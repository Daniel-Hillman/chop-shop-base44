/**
 * @fileoverview Demo for HistoryPanel component
 * Demonstrates history display, interactions, and various states
 */

import React, { useState } from 'react';
import HistoryPanel from './HistoryPanel.jsx';

// Mock history data with various timestamps
const createMockHistory = () => {
  const now = Date.now();
  return [
    {
      id: 'sample1',
      title: 'Funky Drummer',
      artist: 'James Brown',
      year: 1970,
      genre: 'Funk',
      duration: 180,
      youtubeId: 'dNP8tbDMZNE',
      thumbnailUrl: 'https://img.youtube.com/vi/dNP8tbDMZNE/mqdefault.jpg',
      isMock: false,
      viewedAt: now - 1000 * 60 * 5 // 5 minutes ago
    },
    {
      id: 'sample2',
      title: 'Amen Break',
      artist: 'The Winstons',
      year: 1969,
      genre: 'Soul',
      duration: 120,
      youtubeId: 'GxZuq57_bYM',
      thumbnailUrl: 'https://img.youtube.com/vi/GxZuq57_bYM/mqdefault.jpg',
      isMock: true,
      viewedAt: now - 1000 * 60 * 30 // 30 minutes ago
    },
    {
      id: 'sample3',
      title: 'Apache',
      artist: 'The Incredible Bongo Band',
      year: 1973,
      genre: 'Funk',
      duration: 195,
      youtubeId: 'WY-Z6wm6TMQ',
      thumbnailUrl: 'https://img.youtube.com/vi/WY-Z6wm6TMQ/mqdefault.jpg',
      isMock: false,
      viewedAt: now - 1000 * 60 * 60 * 2 // 2 hours ago
    },
    {
      id: 'sample4',
      title: 'Think (About It)',
      artist: 'Lyn Collins',
      year: 1972,
      genre: 'Funk',
      duration: 165,
      youtubeId: 'ZEKWiNGNbJY',
      thumbnailUrl: 'https://img.youtube.com/vi/ZEKWiNGNbJY/mqdefault.jpg',
      isMock: false,
      viewedAt: now - 1000 * 60 * 60 * 6 // 6 hours ago
    },
    {
      id: 'sample5',
      title: 'Impeach the President',
      artist: 'The Honey Drippers',
      year: 1973,
      genre: 'Funk',
      duration: 210,
      youtubeId: 'uBUnqQHap8s',
      thumbnailUrl: 'https://img.youtube.com/vi/uBUnqQHap8s/mqdefault.jpg',
      isMock: false,
      viewedAt: now - 1000 * 60 * 60 * 24 // 1 day ago
    },
    {
      id: 'sample6',
      title: 'Synthetic Substitution',
      artist: 'Melvin Bliss',
      year: 1973,
      genre: 'Funk',
      duration: 155,
      youtubeId: 'V5DTznu-9v0',
      thumbnailUrl: 'https://img.youtube.com/vi/V5DTznu-9v0/mqdefault.jpg',
      isMock: true,
      viewedAt: now - 1000 * 60 * 60 * 24 * 3 // 3 days ago
    },
    {
      id: 'sample7',
      title: 'Scorpio',
      artist: 'Dennis Coffey',
      year: 1971,
      genre: 'Funk',
      duration: 188,
      youtubeId: 'IuH3Oplu_1c',
      thumbnailUrl: 'https://img.youtube.com/vi/IuH3Oplu_1c/mqdefault.jpg',
      isMock: false,
      viewedAt: now - 1000 * 60 * 60 * 24 * 7 // 1 week ago
    },
    {
      id: 'sample8',
      title: 'Ashley\'s Roachclip',
      artist: 'The Soul Searchers',
      year: 1974,
      genre: 'Funk',
      duration: 225,
      youtubeId: 'yQHQy-0ZFEk',
      thumbnailUrl: 'https://img.youtube.com/vi/yQHQy-0ZFEk/mqdefault.jpg',
      isMock: false,
      viewedAt: now - 1000 * 60 * 60 * 24 * 30 // 1 month ago
    }
  ];
};

const HistoryPanelDemo = () => {
  const [history, setHistory] = useState(createMockHistory());
  const [currentPlayingSampleId, setCurrentPlayingSampleId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [demoState, setDemoState] = useState('normal');

  const handleClearHistory = () => {
    setIsLoading(true);
    setTimeout(() => {
      setHistory([]);
      setCurrentPlayingSampleId(null);
      setIsLoading(false);
    }, 1000);
  };

  const handlePlayFromHistory = (sample) => {
    if (currentPlayingSampleId === sample.id) {
      setCurrentPlayingSampleId(null);
    } else {
      setCurrentPlayingSampleId(sample.id);
    }
  };

  const resetDemo = () => {
    setHistory(createMockHistory());
    setCurrentPlayingSampleId(null);
    setIsLoading(false);
    setDemoState('normal');
  };

  const showEmptyState = () => {
    setHistory([]);
    setCurrentPlayingSampleId(null);
    setDemoState('empty');
  };

  const showLoadingState = () => {
    setIsLoading(true);
    setDemoState('loading');
    setTimeout(() => {
      setIsLoading(false);
      setDemoState('normal');
    }, 3000);
  };

  const showFewItems = () => {
    setHistory(createMockHistory().slice(0, 2));
    setCurrentPlayingSampleId(null);
    setDemoState('few');
  };

  return (
    <div style={{ 
      padding: '2rem', 
      backgroundColor: '#111827', 
      minHeight: '100vh',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '2rem', fontSize: '2rem', fontWeight: 'bold' }}>
          HistoryPanel Component Demo
        </h1>

        {/* Demo Controls */}
        <div style={{ 
          marginBottom: '2rem', 
          padding: '1rem', 
          backgroundColor: '#1f2937', 
          borderRadius: '8px',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <h2 style={{ width: '100%', margin: '0 0 1rem 0', fontSize: '1.25rem' }}>
            Demo Controls
          </h2>
          <button
            onClick={resetDemo}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reset to Full History
          </button>
          <button
            onClick={showEmptyState}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Show Empty State
          </button>
          <button
            onClick={showLoadingState}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Show Loading State
          </button>
          <button
            onClick={showFewItems}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Show Few Items
          </button>
        </div>

        {/* Current State Info */}
        <div style={{ 
          marginBottom: '2rem', 
          padding: '1rem', 
          backgroundColor: '#1f2937', 
          borderRadius: '8px'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>Current State:</h3>
          <p style={{ margin: '0', color: '#9ca3af' }}>
            Demo State: <strong>{demoState}</strong> | 
            History Items: <strong>{history.length}</strong> | 
            Currently Playing: <strong>{currentPlayingSampleId || 'None'}</strong> | 
            Loading: <strong>{isLoading ? 'Yes' : 'No'}</strong>
          </p>
        </div>

        {/* Component Demo */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '2rem',
          alignItems: 'start'
        }}>
          {/* HistoryPanel */}
          <div>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>
              HistoryPanel Component
            </h2>
            <div style={{ backgroundColor: '#1f2937', borderRadius: '8px', padding: '1rem' }}>
              <HistoryPanel
                history={history}
                onClearHistory={handleClearHistory}
                onPlayFromHistory={handlePlayFromHistory}
                currentPlayingSampleId={currentPlayingSampleId}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Feature Showcase */}
          <div>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>
              Features Demonstrated
            </h2>
            <div style={{ backgroundColor: '#1f2937', borderRadius: '8px', padding: '1rem' }}>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', lineHeight: '1.6' }}>
                <li>Chronological sample display (newest first)</li>
                <li>Play/stop button with visual feedback</li>
                <li>Sample metadata display (title, artist, year, genre, duration)</li>
                <li>Timestamp formatting (relative time)</li>
                <li>Mock sample indicators</li>
                <li>Clear history with confirmation dialog</li>
                <li>Empty state handling</li>
                <li>Loading state display</li>
                <li>Responsive thumbnail images</li>
                <li>Error handling for broken images</li>
                <li>Proper button types and accessibility</li>
                <li>Hover effects and visual states</li>
              </ul>
            </div>

            <h3 style={{ margin: '2rem 0 1rem 0', fontSize: '1.25rem' }}>
              Interaction Guide
            </h3>
            <div style={{ backgroundColor: '#1f2937', borderRadius: '8px', padding: '1rem' }}>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', lineHeight: '1.6' }}>
                <li><strong>Play Button:</strong> Click to play/stop samples</li>
                <li><strong>Clear All:</strong> Click once to show confirmation, click "Yes" to confirm</li>
                <li><strong>Cancel:</strong> Click to cancel clear operation</li>
                <li><strong>Thumbnails:</strong> Hover to see play overlay</li>
                <li><strong>Demo Badges:</strong> Yellow badges indicate mock samples</li>
                <li><strong>Timestamps:</strong> Show relative time (5m ago, 2h ago, etc.)</li>
              </ul>
            </div>

            <h3 style={{ margin: '2rem 0 1rem 0', fontSize: '1.25rem' }}>
              Error Handling
            </h3>
            <div style={{ backgroundColor: '#1f2937', borderRadius: '8px', padding: '1rem' }}>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', lineHeight: '1.6' }}>
                <li>Invalid samples are filtered out automatically</li>
                <li>Broken thumbnail images fallback to placeholder</li>
                <li>Missing callback functions handled gracefully</li>
                <li>Loading states prevent user interactions</li>
                <li>Confirmation dialogs prevent accidental data loss</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div style={{ 
          marginTop: '2rem', 
          padding: '1rem', 
          backgroundColor: '#1f2937', 
          borderRadius: '8px'
        }}>
          <h3 style={{ margin: '0 0 1rem 0' }}>Technical Implementation</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '1rem',
            fontSize: '0.875rem',
            color: '#d1d5db'
          }}>
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#f9fafb' }}>Props</h4>
              <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                <li>history: Array of sample objects</li>
                <li>onClearHistory: Clear callback function</li>
                <li>onPlayFromHistory: Play callback function</li>
                <li>currentPlayingSampleId: Currently playing sample ID</li>
                <li>isLoading: Loading state boolean</li>
              </ul>
            </div>
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#f9fafb' }}>Features</h4>
              <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                <li>Automatic sample validation</li>
                <li>Responsive design</li>
                <li>Accessibility compliance</li>
                <li>Error boundary protection</li>
                <li>Memory efficient rendering</li>
              </ul>
            </div>
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#f9fafb' }}>Requirements</h4>
              <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                <li>5.2: Chronological sample display</li>
                <li>5.4: History clearing with confirmation</li>
                <li>5.5: Local storage persistence (via service)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryPanelDemo;