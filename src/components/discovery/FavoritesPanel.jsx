/**
 * @fileoverview FavoritesPanel component for managing favorite samples
 * Provides add/remove functionality with local storage persistence and error handling
 */

import React, { useState, useEffect } from 'react';
import { validateSampleData } from '../../types/discovery.js';

/**
 * FavoritesPanel component for displaying and managing favorite samples
 * @param {Object} props - Component props
 * @param {import('../../types/discovery.js').SampleData[]} props.favorites - Array of favorite samples
 * @param {function} props.onRemoveFavorite - Callback to remove a favorite sample
 * @param {function} props.onPlayFavorite - Callback to play a favorite sample
 * @param {boolean} [props.isVisible] - Whether the panel is visible
 * @param {string} [props.className] - Additional CSS classes
 */
export default function FavoritesPanel({
  favorites = [],
  onRemoveFavorite,
  onPlayFavorite,
  isVisible = true,
  className = ''
}) {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Validate favorites data on mount and when favorites change
  useEffect(() => {
    if (favorites.length > 0) {
      const invalidFavorites = favorites.filter(favorite => !validateSampleData(favorite).isValid);
      if (invalidFavorites.length > 0) {
        console.warn('Invalid favorite samples detected:', invalidFavorites);
        setError('Some favorite samples have invalid data');
      } else {
        setError(null);
      }
    }
  }, [favorites]);

  const handleRemoveFavorite = async (sampleId) => {
    if (!sampleId) {
      setError('Invalid sample ID');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await onRemoveFavorite(sampleId);
    } catch (err) {
      console.error('Error removing favorite:', err);
      setError('Failed to remove favorite. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayFavorite = async (sample) => {
    if (!sample || !validateSampleData(sample).isValid) {
      setError('Invalid sample data');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await onPlayFavorite(sample);
    } catch (err) {
      console.error('Error playing favorite:', err);
      setError('Failed to play sample. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`favorites-panel ${className}`}>
      <div className="favorites-header">
        <h3>Favorite Samples</h3>
        <span className="favorites-count">
          {favorites.length} {favorites.length === 1 ? 'favorite' : 'favorites'}
        </span>
      </div>

      {error && (
        <div className="favorites-error" role="alert">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{error}</span>
          <button 
            type="button"
            className="error-dismiss"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {favorites.length === 0 ? (
        <div className="favorites-empty">
          <div className="empty-icon">♡</div>
          <p>No favorite samples yet</p>
          <p className="empty-subtitle">
            Click the heart icon on any sample to add it to your favorites
          </p>
        </div>
      ) : (
        <div className="favorites-list">
          {favorites.map((sample) => (
            <div key={sample.id} className="favorite-item">
              <div className="favorite-thumbnail">
                <img 
                  src={sample.thumbnailUrl} 
                  alt={`${sample.title} thumbnail`}
                  onError={(e) => {
                    e.target.src = '/placeholder-thumbnail.jpg';
                  }}
                />
                <button
                  type="button"
                  className="play-button"
                  onClick={() => handlePlayFavorite(sample)}
                  disabled={isLoading}
                  aria-label={`Play ${sample.title} by ${sample.artist}`}
                >
                  ▶️
                </button>
              </div>

              <div className="favorite-info">
                <h4 className="favorite-title">{sample.title}</h4>
                <p className="favorite-artist">{sample.artist}</p>
                <div className="favorite-metadata">
                  <span className="favorite-year">{sample.year}</span>
                  <span className="favorite-genre">{sample.genre}</span>
                  <span className="favorite-duration">
                    {formatDuration(sample.duration)}
                  </span>
                  {sample.isMock && (
                    <span className="mock-indicator" title="Demo sample">
                      Demo
                    </span>
                  )}
                </div>
              </div>

              <div className="favorite-actions">
                <button
                  type="button"
                  className="remove-favorite-button"
                  onClick={() => handleRemoveFavorite(sample.id)}
                  disabled={isLoading}
                  aria-label={`Remove ${sample.title} from favorites`}
                  title="Remove from favorites"
                >
                  💔
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="favorites-loading" aria-live="polite">
          <div className="loading-spinner" role="progressbar" aria-label="Loading"></div>
          <span>Processing...</span>
        </div>
      )}
    </div>
  );
}