/**
 * @fileoverview Demo for FavoritesPanel component
 * Demonstrates component functionality with mock data and interactions
 */

import React, { useState } from 'react';
import FavoritesPanel from './FavoritesPanel.jsx';
import './FavoritesPanel.css';

// Mock sample data for demonstration
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
    isMock: false,
    favoritedAt: '2024-01-15T10:30:00Z'
  },
  {
    id: 'sample-2',
    title: 'Amen Break',
    artist: 'The Winstons',
    year: 1969,
    genre: 'Soul',
    duration: 240,
    youtubeId: 'GxZuq57_bYM',
    thumbnailUrl: 'https://img.youtube.com/vi/GxZuq57_bYM/mqdefault.jpg',
    isMock: false,
    favoritedAt: '2024-01-14T15:45:00Z'
  },
  {
    id: 'sample-3',
    title: 'Apache (Incredible Bongo Band)',
    artist: 'Incredible Bongo Band',
    year: 1973,
    genre: 'Funk',
    duration: 195,
    youtubeId: 'tBfE9UPTfg8',
    thumbnailUrl: 'https://img.youtube.com/vi/tBfE9UPTfg8/mqdefault.jpg',
    isMock: true,
    favoritedAt: '2024-01-13T09:20:00Z'
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
    isMock: false,
    favoritedAt: '2024-01-12T14:10:00Z'
  },
  {
    id: 'sample-5',
    title: 'Impeach the President',
    artist: 'The Honey Drippers',
    year: 1973,
    genre: 'Funk',
    duration: 165,
    youtubeId: 'uBUnqQHap8s',
    thumbnailUrl: 'https://img.youtube.com/vi/uBUnqQHap8s/mqdefault.jpg',
    isMock: false,
    favoritedAt: '2024-01-11T11:55:00Z'
  }
];

/**
 * Demo component for FavoritesPanel
 */
export default function FavoritesPanelDemo() {
  const [favorites, setFavorites] = useState(mockSamples);
  const [currentSample, setCurrentSample] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  const [simulateError, setSimulateError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRemoveFavorite = async (sampleId) => {
    if (simulateError) {
      throw new Error('Simulated remove error');
    }

    setIsLoading(true);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setFavorites(prev => prev.filter(fav => fav.id !== sampleId));
    
    if (currentSample && currentSample.id === sampleId) {
      setCurrentSample(null);
    }
    
    setIsLoading(false);
  };

  const handlePlayFavorite = async (sample) => {
    if (simulateError) {
      throw new Error('Simulated play error');
    }

    setIsLoading(true);
    
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setCurrentSample(sample);
    console.log('Playing sample:', sample.title, 'by', sample.artist);
    
    setIsLoading(false);
  };

  const addRandomFavorite = () => {
    const newSample = {
      id: `sample-${Date.now()}`,
      title: `Random Sample ${Math.floor(Math.random() * 1000)}`,
      artist: 'Demo Artist',
      year: 1970 + Math.floor(Math.random() * 25),
      genre: ['Funk', 'Soul', 'Jazz', 'Blues'][Math.floor(Math.random() * 4)],
      duration: 120 + Math.floor(Math.random() * 180),
      youtubeId: 'demo123',
      thumbnailUrl: 'https://via.placeholder.com/320x180/333/fff?text=Demo',
      isMock: true,
      favoritedAt: new Date().toISOString()
    };

    setFavorites(prev => [...prev, newSample]);
  };

  const clearAllFavorites = () => {
    setFavorites([]);
    setCurrentSample(null);
  };

  const resetToMockData = () => {
    setFavorites(mockSamples);
    setCurrentSample(null);
  };

  return (
    <div style={{ 
      padding: '2rem', 
      backgroundColor: '#0d1117', 
      minHeight: '100vh',
      color: '#fff',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1>FavoritesPanel Demo</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <h2>Demo Controls</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <button 
            onClick={() => setIsVisible(!isVisible)}
            style={{ 
              padding: '0.5rem 1rem', 
              backgroundColor: '#238636', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            {isVisible ? 'Hide Panel' : 'Show Panel'}
          </button>
          
          <button 
            onClick={addRandomFavorite}
            style={{ 
              padding: '0.5rem 1rem', 
              backgroundColor: '#1f6feb', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Add Random Favorite
          </button>
          
          <button 
            onClick={clearAllFavorites}
            style={{ 
              padding: '0.5rem 1rem', 
              backgroundColor: '#da3633', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Clear All
          </button>
          
          <button 
            onClick={resetToMockData}
            style={{ 
              padding: '0.5rem 1rem', 
              backgroundColor: '#6f42c1', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Reset to Mock Data
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input 
              type="checkbox" 
              checked={simulateError}
              onChange={(e) => setSimulateError(e.target.checked)}
            />
            Simulate Errors
          </label>
        </div>
      </div>

      {currentSample && (
        <div style={{ 
          marginBottom: '2rem', 
          padding: '1rem', 
          backgroundColor: '#21262d', 
          borderRadius: '8px',
          border: '1px solid #30363d'
        }}>
          <h3>Currently Playing</h3>
          <p><strong>{currentSample.title}</strong> by {currentSample.artist}</p>
          <p>Year: {currentSample.year} | Genre: {currentSample.genre} | Duration: {Math.floor(currentSample.duration / 60)}:{(currentSample.duration % 60).toString().padStart(2, '0')}</p>
          {currentSample.isMock && <p style={{ color: '#f39c12' }}>🎭 Demo Sample</p>}
        </div>
      )}

      <div style={{ marginBottom: '2rem' }}>
        <h2>Component States</h2>
        
        <h3>Normal State ({favorites.length} favorites)</h3>
        <FavoritesPanel
          favorites={favorites}
          onRemoveFavorite={handleRemoveFavorite}
          onPlayFavorite={handlePlayFavorite}
          isVisible={isVisible}
          className="demo-favorites"
        />
        
        <h3 style={{ marginTop: '3rem' }}>Empty State</h3>
        <FavoritesPanel
          favorites={[]}
          onRemoveFavorite={handleRemoveFavorite}
          onPlayFavorite={handlePlayFavorite}
          isVisible={true}
          className="demo-favorites-empty"
        />
        
        <h3 style={{ marginTop: '3rem' }}>Hidden State</h3>
        <FavoritesPanel
          favorites={favorites}
          onRemoveFavorite={handleRemoveFavorite}
          onPlayFavorite={handlePlayFavorite}
          isVisible={false}
          className="demo-favorites-hidden"
        />
        <p style={{ color: '#888', fontStyle: 'italic' }}>
          Panel is hidden (isVisible=false) - nothing should render above
        </p>
      </div>

      <div style={{ marginTop: '3rem', padding: '1rem', backgroundColor: '#21262d', borderRadius: '8px' }}>
        <h3>Demo Features</h3>
        <ul style={{ color: '#ccc' }}>
          <li>✅ Add/remove favorites with simulated network delays</li>
          <li>✅ Play samples with loading states</li>
          <li>✅ Error simulation for testing error handling</li>
          <li>✅ Empty state display</li>
          <li>✅ Mock sample indicators</li>
          <li>✅ Responsive design</li>
          <li>✅ Accessibility features (ARIA labels, keyboard navigation)</li>
          <li>✅ Loading states and error recovery</li>
          <li>✅ Thumbnail fallback handling</li>
          <li>✅ Duration formatting</li>
        </ul>
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#1c2128', borderRadius: '8px' }}>
        <h3>Usage Example</h3>
        <pre style={{ 
          backgroundColor: '#0d1117', 
          padding: '1rem', 
          borderRadius: '6px', 
          overflow: 'auto',
          fontSize: '0.875rem'
        }}>
{`import FavoritesPanel from './FavoritesPanel.jsx';
import './FavoritesPanel.css';

function MyComponent() {
  const [favorites, setFavorites] = useState([]);

  const handleRemoveFavorite = async (sampleId) => {
    // Remove favorite logic
    setFavorites(prev => prev.filter(fav => fav.id !== sampleId));
  };

  const handlePlayFavorite = async (sample) => {
    // Play sample logic
    console.log('Playing:', sample.title);
  };

  return (
    <FavoritesPanel
      favorites={favorites}
      onRemoveFavorite={handleRemoveFavorite}
      onPlayFavorite={handlePlayFavorite}
      isVisible={true}
      className="my-favorites"
    />
  );
}`}
        </pre>
      </div>
    </div>
  );
}

// Export for use in development/testing
if (typeof window !== 'undefined') {
  window.FavoritesPanelDemo = FavoritesPanelDemo;
}