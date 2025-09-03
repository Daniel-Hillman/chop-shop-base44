/**
 * @fileoverview SampleCard component for displaying individual sample metadata
 * with play, favorite, and action buttons. Includes loading states and error handling
 * for thumbnail display with proper button types to prevent form submission.
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './SampleCard.css';

/**
 * SampleCard component displays sample metadata with interactive buttons
 * @param {Object} props - Component props
 * @param {import('../../types/discovery.js').SampleData} props.sample - Sample data to display
 * @param {function} props.onPlay - Callback when play button is clicked
 * @param {function} props.onFavorite - Callback when favorite button is clicked
 * @param {boolean} props.isFavorite - Whether the sample is currently favorited
 * @param {boolean} props.isPlaying - Whether the sample is currently playing
 * @param {boolean} [props.isLoading] - Whether the card is in loading state
 * @param {string} [props.className] - Additional CSS classes
 * @returns {JSX.Element} SampleCard component
 */
const SampleCard = ({
  sample,
  onPlay,
  onFavorite,
  isFavorite = false,
  isPlaying = false,
  isLoading = false,
  className = ''
}) => {
  const [thumbnailError, setThumbnailError] = useState(false);
  const [thumbnailLoading, setThumbnailLoading] = useState(true);

  /**
   * Handles thumbnail load success
   */
  const handleThumbnailLoad = () => {
    setThumbnailLoading(false);
    setThumbnailError(false);
  };

  /**
   * Handles thumbnail load error
   */
  const handleThumbnailError = () => {
    setThumbnailLoading(false);
    setThumbnailError(true);
  };

  /**
   * Handles play button click
   */
  const handlePlayClick = () => {
    if (!isLoading && onPlay) {
      onPlay(sample);
    }
  };

  /**
   * Handles favorite button click
   */
  const handleFavoriteClick = () => {
    if (!isLoading && onFavorite) {
      onFavorite(sample);
    }
  };

  /**
   * Formats duration from seconds to MM:SS format
   * @param {number} seconds - Duration in seconds
   * @returns {string} Formatted duration
   */
  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  /**
   * Renders thumbnail with loading and error states
   */
  const renderThumbnail = () => {
    return (
      <>
        {/* Always render the image, but show loading/error overlays as needed */}
        <img
          src={sample.thumbnailUrl}
          alt={`${sample.title} by ${sample.artist}`}
          className="sample-card__thumbnail-image"
          onLoad={handleThumbnailLoad}
          onError={handleThumbnailError}
          style={{ display: thumbnailError ? 'none' : 'block' }}
        />
        
        {/* Loading overlay */}
        {thumbnailLoading && !thumbnailError && (
          <div className="sample-card__thumbnail-loading">
            <div className="sample-card__loading-spinner" />
            <span className="sr-only">Loading thumbnail...</span>
          </div>
        )}
        
        {/* Error state */}
        {thumbnailError && (
          <div className="sample-card__thumbnail-error">
            <div className="sample-card__error-icon">🎵</div>
            <span className="sample-card__error-text">Image unavailable</span>
          </div>
        )}
      </>
    );
  };

  return (
    <div className={`sample-card ${isLoading ? 'sample-card--loading' : ''} ${className}`}>
      {/* Thumbnail Section */}
      <div className="sample-card__thumbnail">
        {renderThumbnail()}
        
        {/* Play Button Overlay */}
        <div className="sample-card__play-overlay">
          <button
            type="button"
            className={`sample-card__play-button ${isPlaying ? 'sample-card__play-button--playing' : ''}`}
            onClick={handlePlayClick}
            disabled={isLoading}
            aria-label={isPlaying ? `Pause ${sample.title}` : `Play ${sample.title}`}
          >
            {isLoading ? (
              <div className="sample-card__button-spinner" />
            ) : isPlaying ? (
              <span className="sample-card__pause-icon">⏸️</span>
            ) : (
              <span className="sample-card__play-icon">▶️</span>
            )}
          </button>
        </div>

        {/* Mock Data Indicator */}
        {sample.isMock && (
          <div className="sample-card__mock-indicator">
            <span className="sample-card__mock-badge">Demo</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="sample-card__content">
        {/* Title and Artist */}
        <div className="sample-card__header">
          <h3 className="sample-card__title" title={sample.title}>
            {sample.title}
          </h3>
          <p className="sample-card__artist" title={sample.artist}>
            {sample.artist}
          </p>
        </div>

        {/* Metadata */}
        <div className="sample-card__metadata">
          <span className="sample-card__year">{sample.year}</span>
          <span className="sample-card__separator">•</span>
          <span className="sample-card__genre">{sample.genre}</span>
          <span className="sample-card__separator">•</span>
          <span className="sample-card__duration">{formatDuration(sample.duration)}</span>
        </div>

        {/* Optional Tempo */}
        {sample.tempo && (
          <div className="sample-card__tempo">
            <span className="sample-card__tempo-label">BPM:</span>
            <span className="sample-card__tempo-value">{sample.tempo}</span>
          </div>
        )}

        {/* Optional Instruments */}
        {sample.instruments && sample.instruments.length > 0 && (
          <div className="sample-card__instruments">
            {sample.instruments.slice(0, 3).map((instrument, index) => (
              <span key={index} className="sample-card__instrument-tag">
                {instrument}
              </span>
            ))}
            {sample.instruments.length > 3 && (
              <span className="sample-card__instrument-more">
                +{sample.instruments.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="sample-card__actions">
        <button
          type="button"
          className={`sample-card__favorite-button ${isFavorite ? 'sample-card__favorite-button--active' : ''}`}
          onClick={handleFavoriteClick}
          disabled={isLoading}
          aria-label={isFavorite ? `Remove ${sample.title} from favorites` : `Add ${sample.title} to favorites`}
        >
          <span className="sample-card__favorite-icon">
            {isFavorite ? '❤️' : '🤍'}
          </span>
        </button>

        <button
          type="button"
          className="sample-card__action-button"
          onClick={() => {
            // Enhanced action button for "Use in Chopper" workflow
            const event = new CustomEvent('sampleAction', {
              detail: { action: 'useInChopper', sample }
            });
            window.dispatchEvent(event);
          }}
          disabled={isLoading}
          aria-label={`Use ${sample.title} in Chopper`}
          title="Use in Chopper - Copy URL and navigate to Chopper page"
        >
          <span className="sample-card__action-icon">🎛️</span>
          <span className="sample-card__action-text">Use in Chopper</span>
        </button>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="sample-card__loading-overlay">
          <div className="sample-card__loading-spinner" />
          <span className="sr-only">Loading sample...</span>
        </div>
      )}
    </div>
  );
};

SampleCard.propTypes = {
  sample: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    artist: PropTypes.string.isRequired,
    year: PropTypes.number.isRequired,
    genre: PropTypes.string.isRequired,
    duration: PropTypes.number.isRequired,
    youtubeId: PropTypes.string.isRequired,
    thumbnailUrl: PropTypes.string.isRequired,
    tempo: PropTypes.number,
    instruments: PropTypes.arrayOf(PropTypes.string),
    tags: PropTypes.arrayOf(PropTypes.string),
    isMock: PropTypes.bool.isRequired
  }).isRequired,
  onPlay: PropTypes.func.isRequired,
  onFavorite: PropTypes.func.isRequired,
  isFavorite: PropTypes.bool,
  isPlaying: PropTypes.bool,
  isLoading: PropTypes.bool,
  className: PropTypes.string
};

export default SampleCard;