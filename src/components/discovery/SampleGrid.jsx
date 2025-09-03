/**
 * @fileoverview SampleGrid component for displaying samples in a responsive grid layout
 * with loading skeleton components, empty state handling, and proper accessibility.
 */

import React from 'react';
import PropTypes from 'prop-types';
import SampleCard from './SampleCard.jsx';
import './SampleGrid.css';

/**
 * Loading skeleton component for sample cards
 */
const SampleCardSkeleton = () => (
  <div className="sample-card-skeleton" role="status" aria-label="Loading sample">
    <div className="sample-card-skeleton__thumbnail">
      <div className="sample-card-skeleton__shimmer" />
    </div>
    <div className="sample-card-skeleton__content">
      <div className="sample-card-skeleton__title">
        <div className="sample-card-skeleton__shimmer" />
      </div>
      <div className="sample-card-skeleton__artist">
        <div className="sample-card-skeleton__shimmer" />
      </div>
      <div className="sample-card-skeleton__metadata">
        <div className="sample-card-skeleton__shimmer" />
      </div>
    </div>
    <div className="sample-card-skeleton__actions">
      <div className="sample-card-skeleton__button">
        <div className="sample-card-skeleton__shimmer" />
      </div>
      <div className="sample-card-skeleton__button">
        <div className="sample-card-skeleton__shimmer" />
      </div>
    </div>
  </div>
);

/**
 * Empty state component when no samples are found
 */
const EmptyState = ({ 
  hasFilters, 
  onClearFilters, 
  onShuffle, 
  isOffline 
}) => (
  <div className="sample-grid__empty-state" role="status">
    <div className="sample-grid__empty-icon">
      {isOffline ? '📡' : hasFilters ? '🔍' : '🎵'}
    </div>
    
    <h3 className="sample-grid__empty-title">
      {isOffline 
        ? 'You\'re Offline' 
        : hasFilters 
          ? 'No Samples Found' 
          : 'Ready to Discover'
      }
    </h3>
    
    <p className="sample-grid__empty-description">
      {isOffline 
        ? 'Connect to the internet to discover new samples. Showing cached content when available.'
        : hasFilters 
          ? 'No samples match your current filters. Try adjusting your search criteria or clearing filters.'
          : 'Use the filters to discover vintage samples from the 1950s-1990s, or click shuffle for random discoveries.'
      }
    </p>
    
    <div className="sample-grid__empty-actions">
      {hasFilters && !isOffline && (
        <button
          type="button"
          className="sample-grid__action-button sample-grid__action-button--secondary"
          onClick={onClearFilters}
        >
          Clear Filters
        </button>
      )}
      
      {!isOffline && (
        <button
          type="button"
          className="sample-grid__action-button sample-grid__action-button--primary"
          onClick={onShuffle}
        >
          {hasFilters ? 'Shuffle with Filters' : 'Shuffle Samples'}
        </button>
      )}
    </div>
    
    {isOffline && (
      <div className="sample-grid__offline-notice">
        <p className="sample-grid__offline-text">
          Some features may be limited while offline
        </p>
      </div>
    )}
  </div>
);

EmptyState.propTypes = {
  hasFilters: PropTypes.bool.isRequired,
  onClearFilters: PropTypes.func.isRequired,
  onShuffle: PropTypes.func.isRequired,
  isOffline: PropTypes.bool.isRequired
};

/**
 * Error state component when sample loading fails
 */
const ErrorState = ({ error, onRetry, onShuffle }) => (
  <div className="sample-grid__error-state" role="alert">
    <div className="sample-grid__error-icon">⚠️</div>
    
    <h3 className="sample-grid__error-title">
      Unable to Load Samples
    </h3>
    
    <p className="sample-grid__error-description">
      We encountered an issue while loading samples. This might be due to network connectivity or service availability.
    </p>
    
    {error && (
      <details className="sample-grid__error-details">
        <summary className="sample-grid__error-summary">
          Technical Details
        </summary>
        <p className="sample-grid__error-message">
          {error}
        </p>
      </details>
    )}
    
    <div className="sample-grid__error-actions">
      <button
        type="button"
        className="sample-grid__action-button sample-grid__action-button--primary"
        onClick={onRetry}
      >
        Try Again
      </button>
      
      <button
        type="button"
        className="sample-grid__action-button sample-grid__action-button--secondary"
        onClick={onShuffle}
      >
        Load Demo Samples
      </button>
    </div>
  </div>
);

ErrorState.propTypes = {
  error: PropTypes.string,
  onRetry: PropTypes.func.isRequired,
  onShuffle: PropTypes.func.isRequired
};

/**
 * SampleGrid component displays samples in a responsive grid layout
 * @param {Object} props - Component props
 * @param {import('../../types/discovery.js').SampleData[]} props.samples - Array of samples to display
 * @param {boolean} props.isLoading - Whether samples are currently loading
 * @param {string|null} props.error - Error message if loading failed
 * @param {boolean} props.isOffline - Whether the user is offline
 * @param {boolean} props.hasFilters - Whether any filters are currently applied
 * @param {function} props.onSamplePlay - Callback when a sample play button is clicked
 * @param {function} props.onSampleFavorite - Callback when a sample favorite button is clicked
 * @param {function} props.onClearFilters - Callback to clear all filters
 * @param {function} props.onShuffle - Callback to shuffle/randomize samples
 * @param {function} props.onRetry - Callback to retry loading samples
 * @param {string|null} props.currentPlayingSampleId - ID of currently playing sample
 * @param {string[]} props.favoriteSampleIds - Array of favorited sample IDs
 * @param {string} [props.className] - Additional CSS classes
 * @returns {JSX.Element} SampleGrid component
 */
const SampleGrid = ({
  samples = [],
  isLoading = false,
  error = null,
  isOffline = false,
  hasFilters = false,
  onSamplePlay,
  onSampleFavorite,
  onClearFilters,
  onShuffle,
  onRetry,
  currentPlayingSampleId = null,
  favoriteSampleIds = [],
  className = ''
}) => {
  /**
   * Renders loading skeleton grid
   */
  const renderLoadingState = () => (
    <div className="sample-grid__loading" role="status" aria-label="Loading samples">
      <div className="sample-grid__grid">
        {Array.from({ length: 12 }, (_, index) => (
          <SampleCardSkeleton key={`skeleton-${index}`} />
        ))}
      </div>
      <div className="sample-grid__loading-text">
        <p>Discovering samples...</p>
      </div>
    </div>
  );

  /**
   * Renders error state
   */
  const renderErrorState = () => (
    <ErrorState
      error={error}
      onRetry={onRetry}
      onShuffle={onShuffle}
    />
  );

  /**
   * Renders empty state
   */
  const renderEmptyState = () => (
    <EmptyState
      hasFilters={hasFilters}
      onClearFilters={onClearFilters}
      onShuffle={onShuffle}
      isOffline={isOffline}
    />
  );

  /**
   * Renders sample grid with data
   */
  const renderSampleGrid = () => (
    <div className="sample-grid__content">
      {/* Results header */}
      <div className="sample-grid__header">
        <h2 className="sample-grid__title">
          {samples.length === 1 
            ? '1 Sample Found' 
            : `${samples.length} Samples Found`
          }
        </h2>
        
        {samples.some(sample => sample.isMock) && (
          <div className="sample-grid__demo-notice">
            <span className="sample-grid__demo-badge">Demo Mode</span>
            <span className="sample-grid__demo-text">
              Some samples are demo content
            </span>
          </div>
        )}
      </div>

      {/* Sample grid */}
      <div 
        className="sample-grid__grid"
        role="grid"
        aria-label={`Grid of ${samples.length} samples`}
      >
        {samples.map((sample, index) => (
          <div
            key={sample.id}
            className="sample-grid__item"
            role="gridcell"
            aria-rowindex={Math.floor(index / 4) + 1}
            aria-colindex={(index % 4) + 1}
          >
            <SampleCard
              sample={sample}
              onPlay={onSamplePlay}
              onFavorite={onSampleFavorite}
              isFavorite={favoriteSampleIds.includes(sample.id)}
              isPlaying={currentPlayingSampleId === sample.id}
              isLoading={false}
            />
          </div>
        ))}
      </div>

      {/* Load more placeholder for future implementation */}
      {samples.length > 0 && samples.length % 12 === 0 && (
        <div className="sample-grid__load-more">
          <button
            type="button"
            className="sample-grid__load-more-button"
            disabled
            title="Load more functionality will be implemented in future tasks"
          >
            Load More Samples
          </button>
          <p className="sample-grid__load-more-note">
            Pagination will be implemented in subsequent tasks
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className={`sample-grid ${className}`}>
      {/* Loading state */}
      {isLoading && renderLoadingState()}
      
      {/* Error state */}
      {!isLoading && error && renderErrorState()}
      
      {/* Empty state */}
      {!isLoading && !error && samples.length === 0 && renderEmptyState()}
      
      {/* Sample grid with data */}
      {!isLoading && !error && samples.length > 0 && renderSampleGrid()}
    </div>
  );
};

SampleGrid.propTypes = {
  samples: PropTypes.arrayOf(
    PropTypes.shape({
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
    })
  ),
  isLoading: PropTypes.bool,
  error: PropTypes.string,
  isOffline: PropTypes.bool,
  hasFilters: PropTypes.bool,
  onSamplePlay: PropTypes.func.isRequired,
  onSampleFavorite: PropTypes.func.isRequired,
  onClearFilters: PropTypes.func.isRequired,
  onShuffle: PropTypes.func.isRequired,
  onRetry: PropTypes.func.isRequired,
  currentPlayingSampleId: PropTypes.string,
  favoriteSampleIds: PropTypes.arrayOf(PropTypes.string),
  className: PropTypes.string
};

export default SampleGrid;