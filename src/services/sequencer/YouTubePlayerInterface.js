/**
 * @fileoverview YouTube Player Integration Interface
 * Provides a clean interface for sequencer to control YouTube video playback
 * Handles error recovery and provides fallback mechanisms
 */

/**
 * Interface for YouTube player integration with sequencer
 * Provides error handling and graceful degradation
 */
class YouTubePlayerInterface {
  constructor() {
    /** @type {Object|null} */
    this.youtubePlayer = null;
    
    /** @type {boolean} */
    this.isConnected = false;
    
    /** @type {boolean} */
    this.isDegraded = false;
    
    /** @type {string} */
    this.degradationReason = null;
    
    /** @type {Array} */
    this.errorLog = [];
    
    /** @type {number} */
    this.lastSeekTime = 0;
    
    /** @type {boolean} */
    this.isSeekInProgress = false;
    
    /** @type {Function[]} */
    this.errorCallbacks = [];
    
    /** @type {Function[]} */
    this.degradationCallbacks = [];
    
    /** @type {Object} */
    this.stats = {
      totalSeeks: 0,
      successfulSeeks: 0,
      failedSeeks: 0,
      averageSeekLatency: 0,
      degradationEvents: 0,
      recoveryEvents: 0
    };
    
    /** @type {Object} */
    this.degradationConfig = {
      maxConsecutiveFailures: 50, // Much more tolerant - only degrade after many failures
      failureTimeWindow: 120000, // 2 minutes window
      autoRecoveryInterval: 10000 // Try recovery every 10 seconds
    };
    
    /** @type {Array} */
    this.recentFailures = [];
    
    /** @type {number|null} */
    this.autoRecoveryTimer = null;
  }

  /**
   * Connect to YouTube player instance
   * @param {Object} youtubePlayer - YouTube player instance
   * @returns {boolean} Whether connection was successful
   */
  connect(youtubePlayer) {
    if (!youtubePlayer) {
      console.warn('No YouTube player provided - sequencer will work without video control');
      return false;
    }

    // Validate player has required methods
    const requiredMethods = ['seekTo', 'getCurrentTime', 'getPlayerState'];
    const missingMethods = requiredMethods.filter(method => 
      typeof youtubePlayer[method] !== 'function'
    );

    if (missingMethods.length > 0) {
      console.warn(`YouTube player missing required methods: ${missingMethods.join(', ')} - video control will be limited`);
      // Still connect but with limited functionality
    }

    this.youtubePlayer = youtubePlayer;
    this.isConnected = true;
    
    // Clear any existing degradation since we have a new connection
    if (this.isDegraded) {
      this.exitDegradedMode('New player connection established');
    }
    
    console.log('YouTubePlayerInterface connected successfully');
    return true;
  }

  /**
   * Disconnect from YouTube player
   * @returns {void}
   */
  disconnect() {
    this.youtubePlayer = null;
    this.isConnected = false;
    this.isSeekInProgress = false;
    
    console.log('YouTubePlayerInterface disconnected');
  }

  /**
   * Jump to timestamp with error handling and graceful degradation
   * @param {number} timestamp - Timestamp in seconds
   * @param {boolean} allowSeek - Whether seeking is allowed (default: true)
   * @param {boolean} maintainPlayback - Whether to maintain current playback state (default: true)
   * @returns {Promise<boolean>} Whether seek was successful
   */
  async jumpToTimestamp(timestamp, allowSeek = true, maintainPlayback = true) {
    // Handle degraded mode
    if (this.isDegraded) {
      console.log(`Seek skipped in degraded mode: ${timestamp}s (reason: ${this.degradationReason})`);
      return false;
    }

    // Validate timestamp
    if (typeof timestamp !== 'number' || isNaN(timestamp) || timestamp < 0) {
      console.warn(`Invalid timestamp provided: ${timestamp}`);
      return false;
    }

    if (!this.isConnected || !this.youtubePlayer) {
      console.warn('YouTube player not connected, skipping seek');
      return false;
    }

    if (!allowSeek) {
      console.log('Seek operation skipped (not allowed)');
      return true;
    }

    // For drum sequencer, allow rapid seeks by canceling previous seek
    if (this.isSeekInProgress) {
      // Don't block, just override the previous seek
    }

    const startTime = performance.now();
    this.isSeekInProgress = true;
    this.stats.totalSeeks++;

    try {
      // Check if player is in a valid state for seeking
      const playerState = this.youtubePlayer.getPlayerState();
      if (playerState === -1) { // Unstarted
        this.handleSeekFailure('Cannot seek: player not ready');
        return false;
      }

      // Store current playback state
      const wasPlaying = playerState === 1; // YT.PlayerState.PLAYING
      
      // Perform the seek with allowSeekAhead parameter for better performance
      this.youtubePlayer.seekTo(timestamp, true);
      this.lastSeekTime = timestamp;
      
      // Handle playback state synchronization
      if (maintainPlayback) {
        // Reduced delay for drum sequencer performance (was 50ms)
        await new Promise(resolve => setTimeout(resolve, 10));
        
        if (wasPlaying && this.youtubePlayer.getPlayerState() !== 1) {
          // Resume playback if it was playing before seek
          this.youtubePlayer.playVideo();
        } else if (!wasPlaying && this.youtubePlayer.getPlayerState() === 1) {
          // Pause if it wasn't playing before seek
          this.youtubePlayer.pauseVideo();
        }
      }
      
      // Update stats and clear recent failures on success
      const latency = performance.now() - startTime;
      this.updateSeekLatency(latency);
      this.stats.successfulSeeks++;
      this.clearRecentFailures();
      
      return true;

    } catch (error) {
      this.handleSeekFailure(`Seek failed: ${error.message}`);
      return false;
    } finally {
      this.isSeekInProgress = false;
    }
  }

  /**
   * Fast seek for drum sequencer chop triggering
   * Optimized for rapid seeks without playback state management
   * @param {number} timestamp - Timestamp to seek to
   * @returns {boolean} Whether seek was initiated
   */
  fastSeekForChop(timestamp) {
    // Validate timestamp
    if (typeof timestamp !== 'number' || isNaN(timestamp) || timestamp < 0) {
      console.warn('Invalid timestamp for fastSeekForChop:', timestamp);
      return false;
    }

    if (!this.isConnected || !this.youtubePlayer) {
      console.warn('YouTube player not connected for fastSeekForChop');
      return false;
    }

    try {
      // Add debug logging for browser testing
      console.log(`🎬 FastSeekForChop: Seeking to ${timestamp}s`);
      
      // Direct seek without state management for speed
      this.youtubePlayer.seekTo(timestamp, true);
      this.lastSeekTime = timestamp;
      this.stats.totalSeeks++;
      this.stats.successfulSeeks++;
      
      console.log(`✅ FastSeekForChop: Seek successful to ${timestamp}s`);
      return true;
    } catch (error) {
      console.error('FastSeekForChop error:', error);
      // Don't handle the error here, let the service try fallback methods
      throw error;
    }
  }

  /**
   * Handle seek failure with degradation logic
   * @private
   * @param {string} errorMessage - Error message
   */
  handleSeekFailure(errorMessage) {
    this.logError(errorMessage);
    this.stats.failedSeeks++;
    
    // Track recent failures for degradation decision
    this.recentFailures.push({
      timestamp: Date.now(),
      error: errorMessage
    });
    
    // Clean old failures outside the time window
    const now = Date.now();
    this.recentFailures = this.recentFailures.filter(
      failure => now - failure.timestamp < this.degradationConfig.failureTimeWindow
    );
    
    // Check if we should enter degraded mode
    if (this.recentFailures.length >= this.degradationConfig.maxConsecutiveFailures) {
      this.enterDegradedMode('Too many consecutive seek failures');
    }
  }

  /**
   * Enter degraded mode with automatic recovery
   * @param {string} reason - Reason for degradation
   */
  enterDegradedMode(reason) {
    if (this.isDegraded) {
      return; // Already in degraded mode
    }
    
    console.warn(`Entering degraded mode: ${reason}`);
    
    this.isDegraded = true;
    this.degradationReason = reason;
    this.stats.degradationEvents++;
    
    // Notify degradation callbacks
    this.degradationCallbacks.forEach(callback => {
      try {
        callback({
          type: 'degradation',
          reason,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Error in degradation callback:', error);
      }
    });
    
    // Set up automatic recovery attempt
    this.scheduleAutoRecovery();
  }

  /**
   * Exit degraded mode
   * @param {string} reason - Reason for recovery
   */
  exitDegradedMode(reason = 'Manual recovery') {
    if (!this.isDegraded) {
      return; // Not in degraded mode
    }
    
    console.log(`Exiting degraded mode: ${reason}`);
    
    this.isDegraded = false;
    this.degradationReason = null;
    this.stats.recoveryEvents++;
    this.clearRecentFailures();
    
    // Clear auto-recovery timer
    if (this.autoRecoveryTimer) {
      clearTimeout(this.autoRecoveryTimer);
      this.autoRecoveryTimer = null;
    }
    
    // Notify degradation callbacks
    this.degradationCallbacks.forEach(callback => {
      try {
        callback({
          type: 'recovery',
          reason,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Error in degradation callback:', error);
      }
    });
  }

  /**
   * Schedule automatic recovery attempt
   * @private
   */
  scheduleAutoRecovery() {
    if (this.autoRecoveryTimer) {
      clearTimeout(this.autoRecoveryTimer);
    }
    
    this.autoRecoveryTimer = setTimeout(async () => {
      console.log('Attempting automatic recovery from degraded mode...');
      
      const recovered = await this.attemptRecovery();
      if (recovered) {
        this.exitDegradedMode('Automatic recovery successful');
      } else {
        console.log('Automatic recovery failed, remaining in degraded mode');
        // Schedule another recovery attempt
        this.scheduleAutoRecovery();
      }
    }, this.degradationConfig.autoRecoveryInterval);
  }

  /**
   * Clear recent failures
   * @private
   */
  clearRecentFailures() {
    this.recentFailures = [];
  }

  /**
   * Get current playback time
   * @returns {number} Current time in seconds, or 0 if unavailable
   */
  getCurrentTime() {
    if (!this.isConnected || !this.youtubePlayer) {
      return 0;
    }

    try {
      return this.youtubePlayer.getCurrentTime() || 0;
    } catch (error) {
      this.logError(`Failed to get current time: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get player state
   * @returns {number} Player state, or -1 if unavailable
   */
  getPlayerState() {
    if (!this.isConnected || !this.youtubePlayer) {
      return -1;
    }

    try {
      return this.youtubePlayer.getPlayerState();
    } catch (error) {
      this.logError(`Failed to get player state: ${error.message}`);
      return -1;
    }
  }

  /**
   * Get detailed player state information
   * @returns {Object} Detailed player state
   */
  getDetailedPlayerState() {
    if (!this.isConnected || !this.youtubePlayer) {
      return {
        state: -1,
        currentTime: 0,
        duration: 0,
        isPlaying: false,
        isPaused: false,
        isBuffering: false,
        isReady: false
      };
    }

    try {
      const state = this.youtubePlayer.getPlayerState();
      const currentTime = this.youtubePlayer.getCurrentTime() || 0;
      const duration = this.youtubePlayer.getDuration() || 0;

      return {
        state,
        currentTime,
        duration,
        isPlaying: state === 1, // YT.PlayerState.PLAYING
        isPaused: state === 2,  // YT.PlayerState.PAUSED
        isBuffering: state === 3, // YT.PlayerState.BUFFERING
        isReady: state !== -1,   // Not unstarted
        isEnded: state === 0     // YT.PlayerState.ENDED
      };
    } catch (error) {
      this.logError(`Failed to get detailed player state: ${error.message}`);
      return {
        state: -1,
        currentTime: 0,
        duration: 0,
        isPlaying: false,
        isPaused: false,
        isBuffering: false,
        isReady: false,
        isEnded: false
      };
    }
  }

  /**
   * Synchronize player state with external state
   * @param {Object} targetState - Target state to synchronize to
   * @param {boolean} targetState.isPlaying - Target playing state
   * @param {number} targetState.currentTime - Target time position
   * @returns {Promise<boolean>} Whether synchronization was successful
   */
  async synchronizeState(targetState) {
    if (!this.isConnected || !this.youtubePlayer) {
      this.logError('Cannot synchronize: YouTube player not connected');
      return false;
    }

    try {
      const currentState = this.getDetailedPlayerState();
      let syncSuccess = true;

      // Synchronize time position if specified and different
      if (typeof targetState.currentTime === 'number') {
        const timeDifference = Math.abs(currentState.currentTime - targetState.currentTime);
        
        // Only seek if time difference is significant (>0.5 seconds)
        if (timeDifference > 0.5) {
          const seekSuccess = await this.jumpToTimestamp(
            targetState.currentTime, 
            true, 
            targetState.isPlaying !== undefined ? targetState.isPlaying : currentState.isPlaying
          );
          if (!seekSuccess) {
            syncSuccess = false;
          }
        }
      }

      // Synchronize playback state if specified
      if (typeof targetState.isPlaying === 'boolean') {
        // Small delay to allow any seek operation to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const updatedState = this.getDetailedPlayerState();
        
        if (targetState.isPlaying && !updatedState.isPlaying) {
          this.youtubePlayer.playVideo();
          console.log('Synchronized player to playing state');
        } else if (!targetState.isPlaying && updatedState.isPlaying) {
          this.youtubePlayer.pauseVideo();
          console.log('Synchronized player to paused state');
        }
      }

      return syncSuccess;
    } catch (error) {
      this.logError(`State synchronization failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if player is ready for operations
   * @returns {boolean} Whether player is ready
   */
  isPlayerReady() {
    if (!this.isConnected || !this.youtubePlayer) {
      return false;
    }

    try {
      const state = this.youtubePlayer.getPlayerState();
      return state !== -1; // Not unstarted
    } catch (error) {
      return false;
    }
  }

  /**
   * Get connection status
   * @returns {Object} Connection status information
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      isPlayerReady: this.isPlayerReady(),
      isSeekInProgress: this.isSeekInProgress,
      isDegraded: this.isDegraded,
      degradationReason: this.degradationReason,
      lastSeekTime: this.lastSeekTime,
      errorCount: this.errorLog.length,
      recentFailures: this.recentFailures.length,
      stats: { ...this.stats }
    };
  }

  /**
   * Get recent errors
   * @param {number} limit - Maximum number of errors to return
   * @returns {Array} Recent error entries
   */
  getRecentErrors(limit = 10) {
    return this.errorLog.slice(-limit);
  }

  /**
   * Clear error log
   * @returns {void}
   */
  clearErrors() {
    this.errorLog = [];
  }

  /**
   * Add error callback
   * @param {Function} callback - Error callback function
   */
  onError(callback) {
    if (typeof callback === 'function') {
      this.errorCallbacks.push(callback);
    }
  }

  /**
   * Remove error callback
   * @param {Function} callback - Callback to remove
   */
  removeErrorCallback(callback) {
    const index = this.errorCallbacks.indexOf(callback);
    if (index > -1) {
      this.errorCallbacks.splice(index, 1);
    }
  }

  /**
   * Force exit from degraded mode (manual recovery)
   * @returns {boolean} Whether recovery was successful
   */
  forceRecovery() {
    if (!this.isDegraded) {
      console.log('Not in degraded mode, no recovery needed');
      return true;
    }

    console.log('Forcing recovery from degraded mode...');
    
    // Clear failure history
    this.clearRecentFailures();
    
    // Test basic player functionality
    if (this.youtubePlayer && typeof this.youtubePlayer.getCurrentTime === 'function') {
      try {
        // Try a simple operation to test if player is working
        this.youtubePlayer.getCurrentTime();
        this.exitDegradedMode('Manual recovery - player test successful');
        return true;
      } catch (error) {
        console.warn('Player test failed during recovery:', error);
        // Still exit degraded mode for sequencer functionality
        this.exitDegradedMode('Manual recovery - forced exit despite test failure');
        return true;
      }
    }
    
    // Exit degraded mode even if we can't test the player
    this.exitDegradedMode('Manual recovery - forced exit');
    return true;
  }

  /**
   * Force exit from degraded mode for sequencer use
   * @returns {void}
   */
  forceExitDegradedMode() {
    if (this.isDegraded) {
      console.log('🔄 Force exiting degraded mode for sequencer use');
      this.clearRecentFailures();
      this.exitDegradedMode('Forced exit for sequencer playback');
    }
  }

  /**
   * Add degradation callback
   * @param {Function} callback - Degradation callback function
   */
  onDegradation(callback) {
    if (typeof callback === 'function') {
      this.degradationCallbacks.push(callback);
    }
  }

  /**
   * Remove degradation callback
   * @param {Function} callback - Callback to remove
   */
  removeDegradationCallback(callback) {
    const index = this.degradationCallbacks.indexOf(callback);
    if (index > -1) {
      this.degradationCallbacks.splice(index, 1);
    }
  }

  /**
   * Force exit from degraded mode
   * @returns {Promise<boolean>} Whether recovery was successful
   */
  async forceRecovery() {
    console.log('Forcing recovery from degraded mode...');
    
    const recovered = await this.attemptRecovery();
    if (recovered) {
      this.exitDegradedMode('Forced recovery');
      return true;
    }
    
    return false;
  }

  /**
   * Test connection with player
   * @returns {Promise<boolean>} Whether connection test passed
   */
  async testConnection() {
    if (!this.isConnected || !this.youtubePlayer) {
      return false;
    }

    try {
      // Test basic operations
      const currentTime = this.getCurrentTime();
      const playerState = this.getPlayerState();
      
      console.log(`Connection test: time=${currentTime}, state=${playerState}`);
      return true;
    } catch (error) {
      this.logError(`Connection test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Attempt to recover from connection errors
   * @returns {Promise<boolean>} Whether recovery was successful
   */
  async attemptRecovery() {
    if (!this.youtubePlayer) {
      this.logError('Cannot recover: no YouTube player instance');
      return false;
    }

    try {
      console.log('Attempting YouTube player recovery...');
      
      // Reset connection state
      this.isSeekInProgress = false;
      
      // Test if player is responsive
      const testPassed = await this.testConnection();
      
      if (testPassed) {
        console.log('YouTube player recovery successful');
        return true;
      } else {
        this.logError('YouTube player recovery failed: connection test failed');
        return false;
      }
    } catch (error) {
      this.logError(`Recovery attempt failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Handle player errors with automatic recovery
   * @param {Error} error - Error that occurred
   * @returns {Promise<boolean>} Whether error was handled successfully
   */
  async handlePlayerError(error) {
    this.logError(`Player error occurred: ${error.message}`);
    
    const errorType = this.classifyPlayerError(error);
    
    // Attempt automatic recovery based on error type
    switch (errorType) {
      case 'seek_error':
      case 'state_error':
      case 'timing_error':
        console.log('Attempting automatic recovery for recoverable player error...');
        return await this.attemptRecovery();
        
      case 'network_error':
        console.log('Network error detected, attempting connection recovery...');
        return await this.attemptNetworkRecovery();
        
      case 'permission_error':
      case 'unavailable_error':
        console.log('Permanent error detected, no recovery possible');
        return false;
        
      default:
        console.log('Unknown error type, attempting general recovery...');
        return await this.attemptRecovery();
    }
  }

  /**
   * Classify player error for appropriate handling
   * @param {Error} error - Error to classify
   * @returns {string} Error type classification
   */
  classifyPlayerError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('seek') || message.includes('timestamp')) {
      return 'seek_error';
    }
    if (message.includes('state') || message.includes('player state')) {
      return 'state_error';
    }
    if (message.includes('timing') || message.includes('sync')) {
      return 'timing_error';
    }
    if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
      return 'network_error';
    }
    if (message.includes('permission') || message.includes('forbidden') || message.includes('unauthorized')) {
      return 'permission_error';
    }
    if (message.includes('unavailable') || message.includes('private') || message.includes('deleted')) {
      return 'unavailable_error';
    }
    
    return 'unknown_error';
  }

  /**
   * Attempt network-specific recovery
   * @returns {Promise<boolean>} Whether network recovery was successful
   */
  async attemptNetworkRecovery() {
    try {
      console.log('Attempting network recovery...');
      
      // Wait for potential network recovery
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test basic connectivity
      if (!navigator.onLine) {
        this.logError('Device is offline, cannot recover network connection');
        return false;
      }
      
      // Test player responsiveness
      const testPassed = await this.testConnection();
      
      if (testPassed) {
        console.log('Network recovery successful');
        return true;
      } else {
        this.logError('Network recovery failed: player still unresponsive');
        return false;
      }
    } catch (error) {
      this.logError(`Network recovery attempt failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get error recovery suggestions based on error type
   * @param {string} errorMessage - Error message
   * @returns {Object} Recovery suggestions
   */
  getErrorRecoverySuggestions(errorMessage) {
    const suggestions = {
      userAction: 'Try refreshing the page',
      technicalAction: 'Reconnect YouTube player',
      canRetry: true
    };

    if (errorMessage.includes('not connected') || errorMessage.includes('not ready')) {
      suggestions.userAction = 'Wait for video to load completely';
      suggestions.technicalAction = 'Reinitialize player connection';
    } else if (errorMessage.includes('seek') || errorMessage.includes('timestamp')) {
      suggestions.userAction = 'Try playing the video first';
      suggestions.technicalAction = 'Verify video is seekable';
    } else if (errorMessage.includes('state')) {
      suggestions.userAction = 'Check if video is still available';
      suggestions.technicalAction = 'Refresh player state';
    } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
      suggestions.userAction = 'Check your internet connection';
      suggestions.technicalAction = 'Retry with network recovery';
      suggestions.canRetry = true;
    }

    return suggestions;
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance statistics
   */
  getPerformanceStats() {
    const successRate = this.stats.totalSeeks > 0 
      ? (this.stats.successfulSeeks / this.stats.totalSeeks) * 100 
      : 0;

    return {
      ...this.stats,
      successRate: successRate.toFixed(2),
      errorRate: (100 - successRate).toFixed(2)
    };
  }

  /**
   * Reset statistics
   * @returns {void}
   */
  resetStats() {
    this.stats = {
      totalSeeks: 0,
      successfulSeeks: 0,
      failedSeeks: 0,
      averageSeekLatency: 0
    };
  }

  /**
   * Log error with timestamp
   * @private
   * @param {string} message - Error message
   */
  logError(message) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: message
    };

    this.errorLog.push(errorEntry);
    
    // Keep only last 50 errors
    if (this.errorLog.length > 50) {
      this.errorLog = this.errorLog.slice(-50);
    }

    console.error(`YouTubePlayerInterface: ${message}`);

    // Notify error callbacks
    this.errorCallbacks.forEach(callback => {
      try {
        callback(errorEntry);
      } catch (error) {
        console.error('Error in error callback:', error);
      }
    });
  }

  /**
   * Update seek latency statistics
   * @private
   * @param {number} latency - Seek latency in milliseconds
   */
  updateSeekLatency(latency) {
    const total = this.stats.averageSeekLatency * (this.stats.successfulSeeks - 1);
    this.stats.averageSeekLatency = (total + latency) / this.stats.successfulSeeks;
  }

  /**
   * Clean up resources
   * @returns {void}
   */
  destroy() {
    // Clear auto-recovery timer
    if (this.autoRecoveryTimer) {
      clearTimeout(this.autoRecoveryTimer);
      this.autoRecoveryTimer = null;
    }
    
    this.disconnect();
    this.errorCallbacks = [];
    this.degradationCallbacks = [];
    this.errorLog = [];
    this.recentFailures = [];
    this.resetStats();
    
    this.isDegraded = false;
    this.degradationReason = null;
    
    console.log('YouTubePlayerInterface destroyed');
  }
}

export { YouTubePlayerInterface };