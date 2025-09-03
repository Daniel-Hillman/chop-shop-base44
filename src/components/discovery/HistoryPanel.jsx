import React, { useState } from 'react';
import { validateSampleData } from '../../types/discovery.js';
import './HistoryPanel.css';

/**
 * HistoryPanel Component - Displays and manages discovery history
 * 
 * Shows chronological list of recently viewed samples with playback
 * and history management functionality.
 * 
 * Requirements: 5.2, 5.4, 5.5
 */
const HistoryPanel = ({ 
  history = [], 
  onClearHistory, 
  onPlayFromHistory,
  currentPlayingSampleId = null,
  isLoading = false 
}) => {
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  // Validate props
  const validHistory = history.filter(sample => {
    const validation = validateSampleData(sample);
    if (!validation.isValid) {
      console.warn('Invalid sample in history:', validation.errors);
      return false;
    }
    return true;
  });

  // Handle clear history with confirmation
  const handleClearHistory = () => {
    if (showConfirmClear) {
      onClearHistory();
      setShowConfirmClear(false);
    } else {
      setShowConfirmClear(true);
    }
  };

  // Cancel clear confirmation
  const handleCancelClear = () => {
    setShowConfirmClear(false);
  };

  // Handle sample play from history
  const handlePlaySample = (sample) => {
    if (onPlayFromHistory && typeof onPlayFromHistory === 'function') {
      onPlayFromHistory(sample);
    }
  };

  // Format duration for display
  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="history-panel">
      <div className="history-header">
        <h3 className="history-title">
          Discovery History
          {validHistory.length > 0 && (
            <span className="history-count">({validHistory.length})</span>
          )}
        </h3>
        
        {validHistory.length > 0 && (
          <div className="history-actions">
            {showConfirmClear ? (
              <div className="confirm-clear">
                <span className="confirm-text">Clear all history?</span>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="confirm-button"
                  disabled={isLoading}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={handleCancelClear}
                  className="cancel-button"
                  disabled={isLoading}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleClearHistory}
                className="clear-button"
                disabled={isLoading}
                title="Clear history"
              >
                Clear All
              </button>
            )}
          </div>
        )}
      </div>

      <div className="history-content">
        {isLoading ? (
          <div className="history-loading">
            <div className="loading-spinner"></div>
            <p>Loading history...</p>
          </div>
        ) : validHistory.length === 0 ? (
          <div className="history-empty">
            <div className="empty-icon">🕒</div>
            <h4>No History Yet</h4>
            <p>Samples you view will appear here for easy access.</p>
          </div>
        ) : (
          <div className="history-list">
            {validHistory.map((sample, index) => {
              const isPlaying = currentPlayingSampleId === sample.id;
              
              return (
                <div
                  key={`${sample.id}-${index}`}
                  className={`history-item ${isPlaying ? 'playing' : ''}`}
                >
                  <div className="history-item-thumbnail">
                    <img
                      src={sample.thumbnailUrl}
                      alt={`${sample.title} thumbnail`}
                      className="thumbnail-image"
                      onError={(e) => {
                        e.target.src = '/placeholder-thumbnail.jpg';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handlePlaySample(sample)}
                      className="play-overlay"
                      disabled={isLoading}
                      title={isPlaying ? 'Stop' : 'Play'}
                    >
                      {isPlaying ? '⏸️' : '▶️'}
                    </button>
                  </div>

                  <div className="history-item-info">
                    <div className="history-item-main">
                      <h4 className="sample-title" title={sample.title}>
                        {sample.title}
                      </h4>
                      <p className="sample-artist" title={sample.artist}>
                        {sample.artist}
                      </p>
                    </div>

                    <div className="history-item-meta">
                      <div className="sample-details">
                        <span className="sample-year">{sample.year}</span>
                        <span className="sample-genre">{sample.genre}</span>
                        <span className="sample-duration">
                          {formatDuration(sample.duration)}
                        </span>
                      </div>
                      
                      {sample.viewedAt && (
                        <div className="viewed-timestamp">
                          {formatTimestamp(sample.viewedAt)}
                        </div>
                      )}
                    </div>

                    {sample.isMock && (
                      <div className="mock-indicator">
                        <span className="mock-badge">Demo</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPanel;