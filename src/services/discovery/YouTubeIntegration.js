/**
 * @fileoverview YouTubeIntegration - YouTube API integration service for sample discovery
 * Provides YouTube API integration with proper authentication, rate limiting, quota management,
 * error handling, and data transformation for the sample discovery feature.
 */

import { validateSampleData } from '../../types/discovery.js';
import discoveryErrorService from './DiscoveryErrorService.js';
import DiscoveryCacheManager from './DiscoveryCacheManager.js';
import DiscoveryPerformanceMonitor from './DiscoveryPerformanceMonitor.js';

/**
 * YouTube API integration service with comprehensive error handling and rate limiting
 */
export class YouTubeIntegration {
  constructor() {
    // Initialize multiple API keys for quota management
    this.apiKeys = this._initializeApiKeys();
    this.currentKeyIndex = 0;
    this.keyQuotaStatus = new Map(); // Track quota status per key
    
    // Current API key (for backward compatibility)
    this.apiKey = this.getCurrentApiKey();
    this.baseUrl = 'https://www.googleapis.com/youtube/v3';
    this.errorService = discoveryErrorService;
    this.cacheManager = new DiscoveryCacheManager();
    this.performanceMonitor = new DiscoveryPerformanceMonitor();
    
    // Rate limiting configuration
    this.rateLimiter = {
      requestsPerSecond: 10, // Conservative limit
      requestsPerDay: 10000, // YouTube API quota limit
      currentRequests: 0,
      dailyRequests: 0,
      lastRequestTime: 0,
      dailyResetTime: this._getDailyResetTime()
    };

    // Request queue for rate limiting
    this.requestQueue = [];
    this.isProcessingQueue = false;

    // API endpoints
    this.endpoints = {
      search: '/search',
      videos: '/videos',
      channels: '/channels'
    };

    // Initialize daily quota tracking
    this._initializeDailyQuota();
  }

  /**
   * Initialize API keys from environment variables
   * @private
   * @returns {string[]} Array of available API keys
   */
  _initializeApiKeys() {
    const keys = [];
    const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : process.env;
    
    // Check for numbered API keys first
    for (let i = 1; i <= 5; i++) {
      const key = env[`VITE_YOUTUBE_API_KEY_${i}`];
      if (key && key.trim()) {
        keys.push(key.trim());
      }
    }
    
    // Fallback to single key if no numbered keys found
    if (keys.length === 0) {
      const singleKey = env.VITE_YOUTUBE_API_KEY;
      if (singleKey && singleKey.trim()) {
        keys.push(singleKey.trim());
      }
    }
    
    console.log(`🔑 Initialized ${keys.length} YouTube API key(s)`);
    return keys;
  }

  /**
   * Get current API key
   * @returns {string} Current API key
   */
  getCurrentApiKey() {
    if (this.apiKeys.length === 0) {
      throw new Error('No YouTube API keys configured');
    }
    return this.apiKeys[this.currentKeyIndex];
  }

  /**
   * Rotate to next available API key
   * @returns {boolean} True if rotation successful, false if no more keys
   */
  rotateApiKey() {
    if (this.apiKeys.length <= 1) {
      console.warn('⚠️ Only one API key available, cannot rotate');
      return false;
    }

    const originalIndex = this.currentKeyIndex;
    let attempts = 0;
    
    do {
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
      attempts++;
      
      const currentKey = this.getCurrentApiKey();
      const quotaStatus = this.keyQuotaStatus.get(currentKey);
      
      // Check if this key is not quota exceeded or if enough time has passed
      if (!quotaStatus || !quotaStatus.exceeded || this._isQuotaResetTime(quotaStatus.resetTime)) {
        this.apiKey = currentKey;
        console.log(`🔄 Rotated to API key #${this.currentKeyIndex + 1}`);
        
        // Clear quota exceeded status if reset time has passed
        if (quotaStatus && quotaStatus.exceeded && this._isQuotaResetTime(quotaStatus.resetTime)) {
          this.keyQuotaStatus.delete(currentKey);
        }
        
        return true;
      }
    } while (this.currentKeyIndex !== originalIndex && attempts < this.apiKeys.length);
    
    console.warn('⚠️ All API keys are quota exceeded');
    return false;
  }

  /**
   * Mark current API key as quota exceeded
   * @param {string} resetTime - When quota resets (ISO string)
   */
  markKeyQuotaExceeded(resetTime = null) {
    const currentKey = this.getCurrentApiKey();
    this.keyQuotaStatus.set(currentKey, {
      exceeded: true,
      resetTime: resetTime || this._getNextDayResetTime(),
      timestamp: new Date().toISOString()
    });
    
    console.warn(`❌ API key #${this.currentKeyIndex + 1} quota exceeded, marked until ${resetTime || 'tomorrow'}`);
  }

  /**
   * Check if quota reset time has passed
   * @private
   * @param {string} resetTime - Reset time ISO string
   * @returns {boolean} True if reset time has passed
   */
  _isQuotaResetTime(resetTime) {
    if (!resetTime) return false;
    return new Date() >= new Date(resetTime);
  }

  /**
   * Get next day reset time (YouTube quotas reset at midnight Pacific Time)
   * @private
   * @returns {string} ISO string for next reset
   */
  _getNextDayResetTime() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0); // 8 AM UTC = Midnight Pacific
    return tomorrow.toISOString();
  }

  /**
   * Get API key status summary
   * @returns {Object} Status of all API keys
   */
  getApiKeyStatus() {
    return {
      totalKeys: this.apiKeys.length,
      currentKeyIndex: this.currentKeyIndex,
      quotaExceededKeys: Array.from(this.keyQuotaStatus.entries()).map(([key, status]) => ({
        keyIndex: this.apiKeys.indexOf(key),
        resetTime: status.resetTime,
        exceeded: status.exceeded
      }))
    };
  }

  /**
   * Search for vintage samples on YouTube
   * @param {Object} searchParams - Search parameters
   * @param {string[]} searchParams.genres - Genres to search for
   * @param {Object} searchParams.yearRange - Year range filter
   * @param {number} searchParams.maxResults - Maximum results to return
   * @param {string} searchParams.order - Search order (relevance, date, rating, etc.)
   * @returns {Promise<import('../../types/discovery.js').SampleData[]>} Array of sample data
   */
  async searchSamples(searchParams = {}) {
    const startTime = performance.now();
    const cacheKey = this._generateCacheKey('search', searchParams);
    
    try {
      // Check cache first
      const cachedResults = this.cacheManager.getCachedResults(searchParams);
      if (cachedResults) {
        this.performanceMonitor.recordMetric('apiCall', {
          duration: performance.now() - startTime,
          cached: true,
          success: true,
          apiName: 'youtube'
        });
        return cachedResults;
      }

      // Validate API key
      if (!this.apiKey || this.apiKey === 'your_youtube_api_key_here') {
        throw new Error('YouTube API key not configured. Please set VITE_YOUTUBE_API_KEY in your .env file.');
      }

      // Check rate limits
      await this._checkRateLimit();

      // Build search query
      const searchQuery = this._buildSearchQuery(searchParams);
      
      // Make API request
      const searchResults = await this._makeApiRequest(this.endpoints.search, {
        part: 'snippet',
        q: searchQuery,
        type: 'video',
        maxResults: searchParams.maxResults || 12,
        order: searchParams.order || 'relevance',
        videoDuration: 'medium', // 4-20 minutes
        videoDefinition: 'any',
        safeSearch: 'none'
      });

      if (!searchResults.items || searchResults.items.length === 0) {
        throw new Error('No samples found for the specified criteria');
      }

      // Get detailed video information
      const videoIds = searchResults.items.map(item => item.id.videoId).join(',');
      const videoDetails = await this._makeApiRequest(this.endpoints.videos, {
        part: 'snippet,contentDetails,statistics',
        id: videoIds
      });

      // Transform API response to sample data
      const samples = this._transformToSampleData(videoDetails.items, searchParams);

      // Cache the results
      this.cacheManager.cacheResults(searchParams, samples, 300000); // 5 minutes

      this.performanceMonitor.recordMetric('apiCall', {
        duration: performance.now() - startTime,
        cached: false,
        success: true,
        apiName: 'youtube',
        resultCount: samples.length
      });

      return samples;

    } catch (error) {
      this.performanceMonitor.recordMetric('apiCall', {
        duration: performance.now() - startTime,
        cached: false,
        success: false,
        apiName: 'youtube',
        error: error.message
      });

      // Check if this is a quota exceeded error (403)
      if (error.status === 403 || error.message?.includes('quota') || error.message?.includes('exceeded')) {
        console.warn('🚫 YouTube API quota exceeded, attempting key rotation...');
        
        // Mark current key as quota exceeded
        this.markKeyQuotaExceeded();
        
        // Try to rotate to next available key
        if (this.rotateApiKey()) {
          console.log('🔄 Retrying with new API key...');
          // Retry the request with new key (recursive call with retry limit)
          if (!searchParams._retryCount) {
            searchParams._retryCount = 1;
            return this.searchSamples(searchParams);
          } else if (searchParams._retryCount < this.apiKeys.length) {
            searchParams._retryCount++;
            return this.searchSamples(searchParams);
          }
        }
        
        console.warn('⚠️ All API keys exhausted, falling back to cached/mock data');
      }

      // Handle specific YouTube API errors
      const handledError = this.errorService.handleYouTubeAPIError(error);
      throw handledError;
    }
  }

  /**
   * Get detailed information about a specific video
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<import('../../types/discovery.js').SampleData>} Sample data
   */
  async getVideoDetails(videoId) {
    const startTime = performance.now();
    const cacheKey = this._generateCacheKey('video', { videoId });

    try {
      // Check cache first  
      const cachedResult = this.cacheManager.getCachedResults({ videoId });
      if (cachedResult) {
        this.performanceMonitor.recordMetric('apiCall', {
          duration: performance.now() - startTime,
          cached: true,
          success: true,
          apiName: 'youtube'
        });
        return cachedResult;
      }

      // Validate API key
      if (!this.apiKey || this.apiKey === 'your_youtube_api_key_here') {
        throw new Error('YouTube API key not configured');
      }

      // Check rate limits
      await this._checkRateLimit();

      // Make API request
      const videoDetails = await this._makeApiRequest(this.endpoints.videos, {
        part: 'snippet,contentDetails,statistics',
        id: videoId
      });

      if (!videoDetails.items || videoDetails.items.length === 0) {
        throw new Error(`Video not found: ${videoId}`);
      }

      // Transform to sample data
      const samples = this._transformToSampleData(videoDetails.items);
      const sample = samples[0];

      // Cache the result
      this.cacheManager.cacheResults({ videoId }, sample, 600000); // 10 minutes

      this.performanceMonitor.recordMetric('apiCall', {
        duration: performance.now() - startTime,
        cached: false,
        success: true,
        apiName: 'youtube'
      });

      return sample;

    } catch (error) {
      this.performanceMonitor.recordMetric('apiCall', {
        duration: performance.now() - startTime,
        cached: false,
        success: false,
        apiName: 'youtube',
        error: error.message
      });

      // Check if this is a quota exceeded error (403)
      if (error.status === 403 || error.message?.includes('quota') || error.message?.includes('exceeded')) {
        console.warn('🚫 YouTube API quota exceeded for video details, attempting key rotation...');
        
        // Mark current key as quota exceeded
        this.markKeyQuotaExceeded();
        
        // Try to rotate to next available key
        if (this.rotateApiKey()) {
          console.log('🔄 Retrying video details with new API key...');
          // Retry the request with new key
          return this.getVideoDetails(videoId);
        }
        
        console.warn('⚠️ All API keys exhausted for video details');
      }

      const handledError = this.errorService.handleYouTubeAPIError(error);
      throw handledError;
    }
  }

  /**
   * Get channel information
   * @param {string} channelId - YouTube channel ID
   * @returns {Promise<Object>} Channel information
   */
  async getChannelInfo(channelId) {
    const startTime = performance.now();
    const cacheKey = this._generateCacheKey('channel', { channelId });

    try {
      // Check cache first
      const cachedResult = this.cacheManager.getCachedResults({ channelId });
      if (cachedResult) {
        return cachedResult;
      }

      // Validate API key
      if (!this.apiKey || this.apiKey === 'your_youtube_api_key_here') {
        throw new Error('YouTube API key not configured');
      }

      // Check rate limits
      await this._checkRateLimit();

      // Make API request
      const channelDetails = await this._makeApiRequest(this.endpoints.channels, {
        part: 'snippet,statistics',
        id: channelId
      });

      if (!channelDetails.items || channelDetails.items.length === 0) {
        throw new Error(`Channel not found: ${channelId}`);
      }

      const channel = channelDetails.items[0];
      const channelInfo = {
        id: channel.id,
        title: channel.snippet.title,
        description: channel.snippet.description,
        thumbnailUrl: channel.snippet.thumbnails?.default?.url,
        subscriberCount: channel.statistics?.subscriberCount,
        videoCount: channel.statistics?.videoCount
      };

      // Cache the result
      this.cacheManager.cacheResults({ channelId }, channelInfo, 3600000); // 1 hour

      return channelInfo;

    } catch (error) {
      const handledError = this.errorService.handleYouTubeAPIError(error);
      throw handledError;
    }
  }

  /**
   * Build search query based on parameters
   * @private
   * @param {Object} searchParams - Search parameters
   * @returns {string} Search query string
   */
  _buildSearchQuery(searchParams) {
    const queryParts = [];

    // Add genre-specific terms
    if (searchParams.genres && searchParams.genres.length > 0) {
      const genreTerms = searchParams.genres.join(' OR ');
      queryParts.push(`(${genreTerms})`);
    }

    // Add year range terms
    if (searchParams.yearRange) {
      const { start, end } = searchParams.yearRange;
      if (start && end) {
        // Add decade-specific terms for better vintage results
        const decades = [];
        for (let year = Math.floor(start / 10) * 10; year <= end; year += 10) {
          decades.push(`${year}s`);
        }
        if (decades.length > 0) {
          queryParts.push(`(${decades.join(' OR ')})`);
        }
      }
    }

    // Add vintage/classic terms for better results
    queryParts.push('(vintage OR classic OR original OR "rare groove")');

    // Add music-specific terms
    queryParts.push('(music OR song OR track OR sample)');

    // Exclude common non-music content
    queryParts.push('-cover -remix -live -concert -interview');

    return queryParts.join(' ');
  }

  /**
   * Transform YouTube API response to sample data format
   * @private
   * @param {Array} videoItems - YouTube API video items
   * @param {Object} searchParams - Original search parameters for context
   * @returns {import('../../types/discovery.js').SampleData[]} Array of sample data
   */
  _transformToSampleData(videoItems, searchParams = {}) {
    return videoItems.map(video => {
      // Extract year from title or description
      const year = this._extractYear(video.snippet.title, video.snippet.description);
      
      // Determine genre from search params or video metadata
      const genre = this._determineGenre(video, searchParams);
      
      // Parse duration
      const duration = this._parseDuration(video.contentDetails?.duration);
      
      // Extract tempo if available (basic heuristic)
      const tempo = this._extractTempo(video.snippet.title, video.snippet.description);

      const sampleData = {
        id: `youtube-${video.id}`,
        title: this._cleanTitle(video.snippet.title),
        artist: this._extractArtist(video.snippet.title, video.snippet.channelTitle),
        year: year,
        genre: genre,
        duration: duration,
        youtubeId: video.id,
        thumbnailUrl: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url,
        tempo: tempo,
        instruments: this._extractInstruments(video.snippet.title, video.snippet.description),
        tags: this._extractTags(video.snippet.tags, video.snippet.title),
        isMock: false,
        // Additional metadata
        channelTitle: video.snippet.channelTitle,
        publishedAt: video.snippet.publishedAt,
        viewCount: parseInt(video.statistics?.viewCount) || 0,
        likeCount: parseInt(video.statistics?.likeCount) || 0
      };

      // Validate the sample data
      const validation = validateSampleData(sampleData);
      if (!validation.isValid) {
        console.warn('Invalid sample data generated:', validation.errors, sampleData);
        // Return a corrected version with defaults
        return this._createFallbackSampleData(video);
      }

      return sampleData;
    }).filter(sample => sample !== null);
  }

  /**
   * Create fallback sample data when transformation fails
   * @private
   * @param {Object} video - YouTube video object
   * @returns {import('../../types/discovery.js').SampleData} Fallback sample data
   */
  _createFallbackSampleData(video) {
    return {
      id: `youtube-${video.id}`,
      title: video.snippet.title || 'Unknown Title',
      artist: video.snippet.channelTitle || 'Unknown Artist',
      year: 1970, // Default vintage year
      genre: 'Soul', // Default genre
      duration: 180, // Default 3 minutes
      youtubeId: video.id,
      thumbnailUrl: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url || 'https://img.youtube.com/vi/default/mqdefault.jpg',
      tempo: 120,
      instruments: ['unknown'],
      tags: ['vintage', 'sample'],
      isMock: false
    };
  }

  /**
   * Extract year from title or description
   * @private
   * @param {string} title - Video title
   * @param {string} description - Video description
   * @returns {number} Extracted year or default
   */
  _extractYear(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    // Look for 4-digit years between 1950-1995
    const yearMatch = text.match(/\b(19[5-9][0-9])\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1]);
      if (year >= 1950 && year <= 1995) {
        return year;
      }
    }

    // Look for decade references
    const decadeMatch = text.match(/\b(50s|60s|70s|80s|90s)\b/);
    if (decadeMatch) {
      const decadeMap = { '50s': 1955, '60s': 1965, '70s': 1975, '80s': 1985, '90s': 1995 };
      return decadeMap[decadeMatch[1]];
    }

    // Default to 1970 for vintage content
    return 1970;
  }

  /**
   * Determine genre from video metadata
   * @private
   * @param {Object} video - YouTube video object
   * @param {Object} searchParams - Search parameters
   * @returns {string} Determined genre
   */
  _determineGenre(video, searchParams) {
    const title = video.snippet.title.toLowerCase();
    const description = video.snippet.description?.toLowerCase() || '';
    const text = `${title} ${description}`;

    // Check if search was genre-specific
    if (searchParams && searchParams.genres && searchParams.genres.length === 1) {
      return searchParams.genres[0];
    }

    // Genre detection based on keywords
    const genreKeywords = {
      'Soul': ['soul', 'motown', 'stax', 'atlantic', 'aretha', 'james brown', 'stevie wonder'],
      'Jazz': ['jazz', 'bebop', 'swing', 'blue note', 'miles davis', 'coltrane', 'monk'],
      'Funk': ['funk', 'p-funk', 'parliament', 'funkadelic', 'sly stone', 'meters'],
      'Blues': ['blues', 'chicago blues', 'delta blues', 'muddy waters', 'bb king', 'howlin wolf'],
      'Afrobeat': ['afrobeat', 'fela kuti', 'africa 70', 'nigerian', 'afro']
    };

    for (const [genre, keywords] of Object.entries(genreKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return genre;
      }
    }

    // Default to Soul for vintage content
    return 'Soul';
  }

  /**
   * Parse ISO 8601 duration to seconds
   * @private
   * @param {string} duration - ISO 8601 duration string
   * @returns {number} Duration in seconds
   */
  _parseDuration(duration) {
    if (!duration) return 180; // Default 3 minutes

    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 180;

    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;

    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    
    // Ensure duration is within valid range (1-600 seconds)
    if (totalSeconds < 1) return 180;
    if (totalSeconds > 600) return 600;
    
    return totalSeconds;
  }

  /**
   * Extract tempo from title or description
   * @private
   * @param {string} title - Video title
   * @param {string} description - Video description
   * @returns {number} Extracted tempo (always returns a valid value)
   */
  _extractTempo(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    // Look for BPM mentions
    const bpmMatch = text.match(/(\d+)\s*bpm/);
    if (bpmMatch) {
      const bpm = parseInt(bpmMatch[1]);
      if (bpm >= 60 && bpm <= 200) {
        return bpm;
      }
    }

    // Genre-based tempo defaults
    const genreTempos = {
      'soul': 110,
      'jazz': 130,
      'funk': 105,
      'blues': 80,
      'afrobeat': 120
    };

    for (const [genre, tempo] of Object.entries(genreTempos)) {
      if (text.includes(genre)) {
        return tempo;
      }
    }

    // Default tempo for vintage music
    return 120;
  }

  /**
   * Extract instruments from title or description
   * @private
   * @param {string} title - Video title
   * @param {string} description - Video description
   * @returns {string[]} Array of detected instruments
   */
  _extractInstruments(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    const instruments = [];

    const instrumentKeywords = {
      'drums': ['drums', 'drummer', 'percussion'],
      'bass': ['bass', 'bassist', 'upright bass'],
      'guitar': ['guitar', 'guitarist'],
      'piano': ['piano', 'pianist', 'keys', 'keyboard'],
      'saxophone': ['saxophone', 'sax', 'tenor sax', 'alto sax'],
      'trumpet': ['trumpet', 'horn section'],
      'vocals': ['vocals', 'singer', 'vocal'],
      'organ': ['organ', 'hammond'],
      'harmonica': ['harmonica', 'harp']
    };

    for (const [instrument, keywords] of Object.entries(instrumentKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        instruments.push(instrument);
      }
    }

    return instruments.length > 0 ? instruments : ['unknown'];
  }

  /**
   * Extract and clean tags
   * @private
   * @param {string[]} apiTags - Tags from YouTube API
   * @param {string} title - Video title
   * @returns {string[]} Cleaned tags array
   */
  _extractTags(apiTags, title) {
    const tags = [];

    // Add API tags if available
    if (apiTags && Array.isArray(apiTags)) {
      tags.push(...apiTags.slice(0, 5)); // Limit to 5 tags
    }

    // Add tags based on title
    const titleLower = title.toLowerCase();
    if (titleLower.includes('rare')) tags.push('rare');
    if (titleLower.includes('classic')) tags.push('classic');
    if (titleLower.includes('vintage')) tags.push('vintage');
    if (titleLower.includes('original')) tags.push('original');

    // Always include 'sample' tag
    tags.push('sample');

    // Remove duplicates and limit
    return [...new Set(tags)].slice(0, 8);
  }

  /**
   * Clean video title for better display
   * @private
   * @param {string} title - Raw video title
   * @returns {string} Cleaned title
   */
  _cleanTitle(title) {
    return title
      .replace(/\[.*?\]/g, '') // Remove bracketed text
      .replace(/\(.*?\)/g, '') // Remove parenthetical text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Extract artist name from title or channel
   * @private
   * @param {string} title - Video title
   * @param {string} channelTitle - Channel title
   * @returns {string} Artist name
   */
  _extractArtist(title, channelTitle) {
    // Try to extract artist from title (format: "Artist - Song")
    const dashMatch = title.match(/^([^-]+)\s*-\s*/);
    if (dashMatch) {
      return dashMatch[1].trim();
    }

    // Use channel title as fallback
    return channelTitle || 'Unknown Artist';
  }

  /**
   * Make authenticated API request with error handling
   * @private
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} API response
   */
  async _makeApiRequest(endpoint, params) {
    const url = new URL(this.baseUrl + endpoint);
    
    // Add API key and parameters
    url.searchParams.append('key', this.apiKey);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    // Update rate limiting counters
    this._updateRateLimitCounters();

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ChopShop-SampleDiscovery/1.0'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`YouTube API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Check rate limits before making requests
   * @private
   * @returns {Promise<void>}
   */
  async _checkRateLimit() {
    const now = Date.now();

    // Check daily quota reset
    if (now >= this.rateLimiter.dailyResetTime) {
      this.rateLimiter.dailyRequests = 0;
      this.rateLimiter.dailyResetTime = this._getDailyResetTime();
    }

    // Check daily quota
    if (this.rateLimiter.dailyRequests >= this.rateLimiter.requestsPerDay) {
      throw new Error('Daily YouTube API quota exceeded. Please try again tomorrow.');
    }

    // Check per-second rate limit
    const timeSinceLastRequest = now - this.rateLimiter.lastRequestTime;
    const minInterval = 1000 / this.rateLimiter.requestsPerSecond;

    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Update rate limiting counters
   * @private
   */
  _updateRateLimitCounters() {
    this.rateLimiter.currentRequests++;
    this.rateLimiter.dailyRequests++;
    this.rateLimiter.lastRequestTime = Date.now();
  }

  /**
   * Get daily quota reset time (midnight UTC)
   * @private
   * @returns {number} Timestamp for next midnight UTC
   */
  _getDailyResetTime() {
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }

  /**
   * Initialize daily quota tracking from localStorage
   * @private
   */
  _initializeDailyQuota() {
    try {
      // Check if we're in a browser environment
      if (typeof localStorage === 'undefined') {
        return; // Skip localStorage operations in Node.js environment
      }
      
      const stored = localStorage.getItem('youtube_api_quota');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.date === new Date().toDateString()) {
          this.rateLimiter.dailyRequests = data.requests || 0;
        }
      }
    } catch (error) {
      console.warn('Failed to load YouTube API quota from localStorage:', error);
    }
  }

  /**
   * Save daily quota tracking to localStorage
   * @private
   */
  _saveDailyQuota() {
    try {
      // Check if we're in a browser environment
      if (typeof localStorage === 'undefined') {
        return; // Skip localStorage operations in Node.js environment
      }
      
      const data = {
        date: new Date().toDateString(),
        requests: this.rateLimiter.dailyRequests
      };
      localStorage.setItem('youtube_api_quota', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save YouTube API quota to localStorage:', error);
    }
  }

  /**
   * Generate cache key for requests
   * @private
   * @param {string} type - Request type
   * @param {Object} params - Request parameters
   * @returns {string} Cache key
   */
  _generateCacheKey(type, params) {
    const paramString = JSON.stringify(params, Object.keys(params).sort());
    return `youtube_${type}_${btoa(paramString).replace(/[^a-zA-Z0-9]/g, '')}`;
  }

  /**
   * Get current rate limit status
   * @returns {Object} Rate limit status
   */
  getRateLimitStatus() {
    return {
      dailyRequests: this.rateLimiter.dailyRequests,
      dailyLimit: this.rateLimiter.requestsPerDay,
      remainingRequests: this.rateLimiter.requestsPerDay - this.rateLimiter.dailyRequests,
      resetTime: new Date(this.rateLimiter.dailyResetTime).toISOString()
    };
  }

  /**
   * Check if API is properly configured
   * @returns {boolean} True if API key is configured
   */
  isConfigured() {
    return !!(this.apiKey && this.apiKey !== 'your_youtube_api_key_here');
  }

  /**
   * Test API connectivity
   * @returns {Promise<boolean>} True if API is accessible
   */
  async testConnection() {
    try {
      if (!this.isConfigured()) {
        return false;
      }

      // Make a simple search request
      await this._makeApiRequest(this.endpoints.search, {
        part: 'snippet',
        q: 'test',
        type: 'video',
        maxResults: 1
      });

      return true;
    } catch (error) {
      console.warn('YouTube API connection test failed:', error);
      return false;
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this._saveDailyQuota();
    this.requestQueue = [];
    this.isProcessingQueue = false;
  }
}

// Create and export singleton instance
export const youTubeIntegration = new YouTubeIntegration();
export default youTubeIntegration;