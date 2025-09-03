/**
 * @fileoverview Demo file for SampleCard component
 * Showcases different states and configurations of the SampleCard
 */

import React, { useState } from 'react';
import SampleCard from './SampleCard';

// Demo sample data
const demoSamples = [
  {
    id: 'demo-1',
    title: 'Funky Drummer',
    artist: 'James Brown',
    year: 1970,
    genre: 'Funk',
    duration: 180,
    youtubeId: 'dNP8tbDMZNE',
    thumbnailUrl: 'https://img.youtube.com/vi/dNP8tbDMZNE/mqdefault.jpg',
    tempo: 120,
    instruments: ['Drums', 'Bass', 'Guitar'],
    tags: ['classic', 'groove'],
    isMock: false
  },
  {
    id: 'demo-2',
    title: 'Amen Break',
    artist: 'The Winstons',
    year: 1969,
    genre: 'Soul',
    duration: 240,
    youtubeId: 'GxZuq57_bYM',
    thumbnailUrl: 'https://img.youtube.com/vi/GxZuq57_bYM/mqdefault.jpg',
    tempo: 136,
    instruments: ['Drums', 'Bass', 'Guitar', 'Vocals', 'Horns'],
    isMock: false
  },
  {
    id: 'demo-3',
    title: 'Apache',
    artist: 'The Incredible Bongo Band',
    year: 1973,
    genre: 'Funk',
    duration: 195,
    youtubeId: 'F3jBxwHIk9k',
    thumbnailUrl: 'https://img.youtube.com/vi/F3jBxwHIk9k/mqdefault.jpg',
    tempo: 110,
    instruments: ['Bongos', 'Guitar', 'Bass'],
    isMock: false
  },
  {
    id: 'demo-mock',
    title: 'Demo Sample',
    artist: 'Mock Artist',
    year: 1965,
    genre: 'Jazz',
    duration: 150,
    youtubeId: 'mock-id',
    thumbnailUrl: 'https://invalid-url-for-demo.jpg',
    tempo: 95,
    instruments: ['Piano', 'Bass'],
    isMock: true
  }
];

/**
 * SampleCard Demo Component
 */
const SampleCardDemo = () => {
  const [favorites, setFavorites] = useState(new Set());
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [loadingStates, setLoadingStates] = useState(new Set());

  const handlePlay = (sample) => {
    console.log('Playing sample:', sample.title);
    setCurrentlyPlaying(currentlyPlaying === sample.id ? null : sample.id);
  };

  const handleFavorite = (sample) => {
    console.log('Toggling favorite for:', sample.title);
    const newFavorites = new Set(favorites);
    if (newFavorites.has(sample.id)) {
      newFavorites.delete(sample.id);
    } else {
      newFavorites.add(sample.id);
    }
    setFavorites(newFavorites);
  };

  const toggleLoading = (sampleId) => {
    const newLoadingStates = new Set(loadingStates);
    if (newLoadingStates.has(sampleId)) {
      newLoadingStates.delete(sampleId);
    } else {
      newLoadingStates.add(sampleId);
    }
    setLoadingStates(newLoadingStates);
  };

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: '2rem', color: '#111827' }}>SampleCard Component Demo</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem', color: '#374151' }}>Interactive Controls</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {demoSamples.map(sample => (
            <button
              key={`toggle-${sample.id}`}
              onClick={() => toggleLoading(sample.id)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: loadingStates.has(sample.id) ? '#ef4444' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              {loadingStates.has(sample.id) ? 'Stop Loading' : 'Start Loading'} - {sample.title}
            </button>
          ))}
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {demoSamples.map(sample => (
          <SampleCard
            key={sample.id}
            sample={sample}
            onPlay={handlePlay}
            onFavorite={handleFavorite}
            isFavorite={favorites.has(sample.id)}
            isPlaying={currentlyPlaying === sample.id}
            isLoading={loadingStates.has(sample.id)}
          />
        ))}
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem', color: '#374151' }}>State Information</h2>
        <div style={{ 
          backgroundColor: 'white', 
          padding: '1rem', 
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <p><strong>Currently Playing:</strong> {currentlyPlaying || 'None'}</p>
          <p><strong>Favorites:</strong> {Array.from(favorites).join(', ') || 'None'}</p>
          <p><strong>Loading:</strong> {Array.from(loadingStates).join(', ') || 'None'}</p>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem', color: '#374151' }}>Component Features</h2>
        <ul style={{ 
          backgroundColor: 'white', 
          padding: '1rem', 
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          lineHeight: '1.6'
        }}>
          <li>✅ Displays sample metadata (title, artist, year, genre, duration)</li>
          <li>✅ Shows optional tempo and instruments when available</li>
          <li>✅ Play/pause button with proper type="button" attribute</li>
          <li>✅ Favorite button with visual state indication</li>
          <li>✅ Loading states for both component and thumbnail</li>
          <li>✅ Error handling for failed thumbnail loads</li>
          <li>✅ Mock data indicator for demo samples</li>
          <li>✅ Responsive design with hover effects</li>
          <li>✅ Accessibility support with ARIA labels</li>
          <li>✅ Proper button types to prevent form submission</li>
        </ul>
      </div>

      <div>
        <h2 style={{ marginBottom: '1rem', color: '#374151' }}>Usage Example</h2>
        <pre style={{ 
          backgroundColor: '#1f2937', 
          color: '#f9fafb', 
          padding: '1rem', 
          borderRadius: '8px',
          overflow: 'auto',
          fontSize: '0.875rem'
        }}>
{`<SampleCard
  sample={sampleData}
  onPlay={(sample) => console.log('Play:', sample.title)}
  onFavorite={(sample) => console.log('Favorite:', sample.title)}
  isFavorite={false}
  isPlaying={false}
  isLoading={false}
/>`}
        </pre>
      </div>
    </div>
  );
};

export default SampleCardDemo;

// For testing in isolation
if (typeof window !== 'undefined' && window.location.pathname.includes('demo')) {
  import('react-dom/client').then(({ createRoot }) => {
    const container = document.getElementById('root') || document.body;
    const root = createRoot(container);
    root.render(<SampleCardDemo />);
  });
}