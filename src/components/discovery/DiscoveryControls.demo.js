/**
 * DiscoveryControls Component Demo
 * 
 * Demonstrates the DiscoveryControls component with various states and interactions.
 * This demo shows proper form handling, real-time feedback, and accessibility features.
 */

import React, { useState } from 'react';
import DiscoveryControls from './DiscoveryControls.jsx';
import { createDefaultFilterState } from '../../types/discovery.js';
import './DiscoveryControls.css';

const DiscoveryControlsDemo = () => {
  const [filters, setFilters] = useState(createDefaultFilterState());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [shuffleCount, setShuffleCount] = useState(0);
  const [filterChangeLog, setFilterChangeLog] = useState([]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    
    // Log filter changes for demo purposes
    const timestamp = new Date().toLocaleTimeString();
    setFilterChangeLog(prev => [
      ...prev.slice(-4), // Keep last 5 entries
      {
        timestamp,
        genres: newFilters.genres,
        yearRange: newFilters.yearRange
      }
    ]);
  };

  const handleShuffle = () => {
    setIsLoading(true);
    setError(null);
    
    // Simulate shuffle operation
    setTimeout(() => {
      setShuffleCount(prev => prev + 1);
      setIsLoading(false);
    }, 1500);
  };

  const simulateError = () => {
    setError('Demo error: Unable to load samples. This is a simulated error for testing.');
  };

  const clearError = () => {
    setError(null);
  };

  const toggleLoading = () => {
    setIsLoading(prev => !prev);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            DiscoveryControls Demo
          </h1>
          <p className="text-gray-300">
            Interactive demo showcasing form-safe interactions, real-time feedback, and accessibility features.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Component Demo */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Component</h2>
            <DiscoveryControls
              filters={filters}
              onFilterChange={handleFilterChange}
              onShuffle={handleShuffle}
              isLoading={isLoading}
              error={error}
            />
          </div>

          {/* Demo Controls and State Display */}
          <div className="space-y-6">
            {/* Demo Controls */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Demo Controls</h3>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={toggleLoading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  {isLoading ? 'Stop Loading' : 'Simulate Loading'}
                </button>
                
                <button
                  type="button"
                  onClick={simulateError}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Simulate Error
                </button>
                
                <button
                  type="button"
                  onClick={clearError}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Clear Error
                </button>
              </div>
            </div>

            {/* Current State Display */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Current State</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-400">Selected Genres:</span>
                  <div className="text-white mt-1">
                    {filters.genres.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {filters.genres.map(genre => (
                          <span key={genre} className="bg-blue-600 px-2 py-1 rounded text-xs">
                            {genre}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500">None selected</span>
                    )}
                  </div>
                </div>
                
                <div>
                  <span className="text-gray-400">Year Range:</span>
                  <div className="text-white">
                    {filters.yearRange.start} - {filters.yearRange.end}
                  </div>
                </div>
                
                <div>
                  <span className="text-gray-400">Shuffle Count:</span>
                  <div className="text-white">{shuffleCount}</div>
                </div>
                
                <div>
                  <span className="text-gray-400">Loading:</span>
                  <div className="text-white">{isLoading ? 'Yes' : 'No'}</div>
                </div>
                
                <div>
                  <span className="text-gray-400">Error:</span>
                  <div className="text-white">{error ? 'Yes' : 'No'}</div>
                </div>
              </div>
            </div>

            {/* Filter Change Log */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Filter Change Log</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filterChangeLog.length > 0 ? (
                  filterChangeLog.map((entry, index) => (
                    <div key={index} className="text-xs bg-gray-700 p-2 rounded">
                      <div className="text-gray-400">{entry.timestamp}</div>
                      <div className="text-white">
                        Genres: {entry.genres.length > 0 ? entry.genres.join(', ') : 'None'}
                      </div>
                      <div className="text-white">
                        Years: {entry.yearRange.start} - {entry.yearRange.end}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 text-sm">No filter changes yet</div>
                )}
              </div>
            </div>

            {/* Form Safety Demo */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Form Safety Test</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                alert('Form submitted! This should not happen when clicking shuffle.');
              }}>
                <p className="text-sm text-gray-300 mb-3">
                  This form tests that the shuffle button doesn't trigger form submission.
                  If you see an alert when clicking shuffle, there's a bug.
                </p>
                <input
                  type="text"
                  placeholder="Test input"
                  className="w-full p-2 rounded bg-gray-700 text-white mb-3"
                />
                <button
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Submit Form (Should NOT trigger on shuffle)
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Accessibility Notes */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Accessibility Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div>
              <h4 className="font-medium text-white mb-2">Keyboard Navigation</h4>
              <ul className="space-y-1">
                <li>• Tab through all interactive elements</li>
                <li>• Space/Enter to toggle checkboxes</li>
                <li>• Arrow keys to adjust sliders</li>
                <li>• Enter/Space to activate buttons</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">Screen Reader Support</h4>
              <ul className="space-y-1">
                <li>• Proper ARIA labels on all controls</li>
                <li>• Descriptive text for slider values</li>
                <li>• Status announcements for changes</li>
                <li>• Clear button purposes</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">Visual Indicators</h4>
              <ul className="space-y-1">
                <li>• Focus outlines on all controls</li>
                <li>• Loading states with spinners</li>
                <li>• Error states with clear messaging</li>
                <li>• Real-time feedback on changes</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">Form Safety</h4>
              <ul className="space-y-1">
                <li>• Explicit type="button" on action buttons</li>
                <li>• preventDefault on click handlers</li>
                <li>• No accidental form submissions</li>
                <li>• Proper event handling</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscoveryControlsDemo;