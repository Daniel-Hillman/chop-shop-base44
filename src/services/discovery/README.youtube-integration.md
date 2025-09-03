# YouTube Integration Service

## Overview

The YouTubeIntegration service provides comprehensive YouTube API integration for the Sample Discovery feature. It includes proper authentication, rate limiting, quota management, error handling, and data transformation.

## Features

### ✅ Implemented Features

1. **YouTube API Integration**
   - Search for vintage samples (1950s-1990s)
   - Get detailed video information
   - Channel information retrieval
   - Proper API authentication with environment variables

2. **Rate Limiting & Quota Management**
   - 10 requests per second limit
   - 10,000 requests per day quota tracking
   - Automatic quota reset at midnight UTC
   - Persistent quota tracking via localStorage

3. **Error Handling**
   - Comprehensive error recovery with exponential backoff
   - Graceful degradation to cached/mock data
   - User-friendly error messages
   - Network error detection and handling

4. **Data Transformation**
   - YouTube API responses transformed to SampleData format
   - Intelligent metadata extraction (year, genre, tempo, instruments)
   - Fallback data generation for invalid responses
   - Data validation using discovery types

5. **Caching**
   - 5-minute cache for search results
   - 10-minute cache for video details
   - 1-hour cache for channel information
   - Memory-efficient cache management

6. **Performance Monitoring**
   - API call duration tracking
   - Success/failure rate monitoring
   - Cache hit rate tracking
   - Error frequency logging

## Configuration

### Environment Variables

Add to your `.env` file:

```env
VITE_YOUTUBE_API_KEY=your_youtube_api_key_here
```

✅ **Status: CONFIGURED** - Your YouTube API key has been successfully added to the environment variables.

### Getting a YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the YouTube Data API v3
4. Create credentials (API Key)
5. Restrict the API key to YouTube Data API v3
6. Add the key to your `.env` file

## Usage

```javascript
import youTubeIntegration from './YouTubeIntegration.js';

// Search for samples
const samples = await youTubeIntegration.searchSamples({
  genres: ['Soul', 'Funk'],
  yearRange: { start: 1960, end: 1980 },
  maxResults: 12
});

// Get video details
const video = await youTubeIntegration.getVideoDetails('dQw4w9WgXcQ');

// Check API status
const isConfigured = youTubeIntegration.isConfigured();
const canConnect = await youTubeIntegration.testConnection();
const quotaStatus = youTubeIntegration.getRateLimitStatus();
```

## API Methods

### `searchSamples(searchParams)`
Search for vintage samples on YouTube.

**Parameters:**
- `searchParams.genres` - Array of genres to search
- `searchParams.yearRange` - Object with start/end years
- `searchParams.maxResults` - Maximum results (default: 12)
- `searchParams.order` - Search order (default: 'relevance')

**Returns:** Promise<SampleData[]>

### `getVideoDetails(videoId)`
Get detailed information about a specific video.

**Parameters:**
- `videoId` - YouTube video ID

**Returns:** Promise<SampleData>

### `getChannelInfo(channelId)`
Get channel information.

**Parameters:**
- `channelId` - YouTube channel ID

**Returns:** Promise<ChannelInfo>

### `isConfigured()`
Check if API key is properly configured.

**Returns:** boolean

### `testConnection()`
Test API connectivity.

**Returns:** Promise<boolean>

### `getRateLimitStatus()`
Get current rate limit status.

**Returns:** Object with quota information

## Error Handling

The service handles various error scenarios:

1. **API Key Issues**
   - Missing or invalid API key
   - Clear error messages with setup instructions

2. **Rate Limiting**
   - Automatic request throttling
   - Daily quota tracking and enforcement
   - Graceful quota exceeded handling

3. **Network Errors**
   - Connection timeouts
   - Network unavailability
   - Retry logic with exponential backoff

4. **API Errors**
   - Invalid requests
   - Quota exceeded
   - Service unavailable

5. **Data Issues**
   - Invalid video IDs
   - Empty search results
   - Malformed API responses

## Data Transformation

The service intelligently transforms YouTube API data:

### Metadata Extraction
- **Year**: Extracted from title, description, or decade references
- **Genre**: Determined from search context or content analysis
- **Tempo**: Parsed from BPM mentions in description
- **Instruments**: Detected from title/description keywords
- **Artist**: Extracted from title format or channel name

### Validation
All transformed data is validated against the SampleData schema with fallback generation for invalid data.

## Testing

The service includes comprehensive tests:

- Unit tests for all methods
- Integration tests for API workflows
- Error scenario testing
- Performance monitoring tests
- Cache behavior validation

Run tests:
```bash
npm test -- src/services/discovery/__tests__/YouTubeIntegration.test.js
```

## Performance Considerations

1. **Caching Strategy**
   - Search results cached for 5 minutes
   - Video details cached for 10 minutes
   - Reduces API calls and improves response times

2. **Rate Limiting**
   - Conservative 10 requests/second limit
   - Prevents API quota exhaustion
   - Automatic request queuing

3. **Memory Management**
   - Efficient cache cleanup
   - Minimal memory footprint
   - Proper resource disposal

## Security

1. **API Key Protection**
   - Environment variable storage
   - No hardcoded credentials
   - Client-side key validation

2. **Input Sanitization**
   - Query parameter validation
   - Safe URL construction
   - XSS prevention

3. **Error Information**
   - No sensitive data in error messages
   - Safe error logging
   - User-friendly error display

## Integration with Discovery Feature

The YouTubeIntegration service is designed to work seamlessly with:

- **MockSampleProvider**: Fallback when API unavailable
- **DiscoveryCacheManager**: Efficient result caching
- **DiscoveryErrorService**: Comprehensive error handling
- **DiscoveryPerformanceMonitor**: Performance tracking

## Future Enhancements

Potential improvements for future versions:

1. **Advanced Search**
   - Playlist integration
   - Channel-specific searches
   - Advanced filtering options

2. **Analytics**
   - Usage pattern tracking
   - Popular search terms
   - Performance optimization

3. **Offline Support**
   - Enhanced caching strategies
   - Offline-first architecture
   - Background sync capabilities

## Troubleshooting

### Common Issues

1. **"YouTube API key not configured"**
   - Add VITE_YOUTUBE_API_KEY to .env file
   - Ensure API key is valid and active

2. **"Daily YouTube API quota exceeded"**
   - Wait until midnight UTC for quota reset
   - Consider implementing request prioritization

3. **Network errors**
   - Check internet connectivity
   - Verify API endpoint accessibility
   - Review firewall/proxy settings

4. **Empty search results**
   - Try broader search terms
   - Check year range filters
   - Verify genre spellings

### Debug Mode

Enable debug logging by setting:
```javascript
youTubeIntegration.debugMode = true;
```

This will log detailed information about API calls, caching, and error handling.