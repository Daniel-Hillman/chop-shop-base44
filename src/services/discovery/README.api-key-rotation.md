# YouTube API Key Rotation Setup

## Overview
The YouTube API integration now supports multiple API keys with automatic rotation to handle quota limits gracefully.

## Quick Setup

### Option 1: Add a Second API Key (Recommended)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable YouTube Data API v3
4. Create a new API key
5. Add it to your `.env` file:

```env
# Your existing key
VITE_YOUTUBE_API_KEY_1=AIzaSyCh328nmjLof_VLzffGcj--xwYQ9gpeEko

# Your new key
VITE_YOUTUBE_API_KEY_2=YOUR_NEW_API_KEY_HERE
```

### Option 2: Use Multiple Keys (Up to 5 supported)
```env
VITE_YOUTUBE_API_KEY_1=your_first_key
VITE_YOUTUBE_API_KEY_2=your_second_key
VITE_YOUTUBE_API_KEY_3=your_third_key
VITE_YOUTUBE_API_KEY_4=your_fourth_key
VITE_YOUTUBE_API_KEY_5=your_fifth_key
```

## How It Works

### Automatic Rotation
- When a quota exceeded error (403) occurs, the system automatically rotates to the next available API key
- Keys marked as quota exceeded are skipped until their reset time (next day)
- If all keys are quota exceeded, the system falls back to cached/mock data

### Quota Tracking
- Each API key's quota status is tracked separately
- Quota resets are calculated based on YouTube's reset time (midnight Pacific Time)
- Status is persisted across browser sessions

### Fallback Strategy
```
API Key 1 → Quota Exceeded → API Key 2 → Quota Exceeded → API Key 3 → ... → Cache/Mock Data
```

## Testing

Run the test script to verify your setup:
```bash
node src/services/discovery/test-api-rotation.js
```

## API Key Status

You can check the status of your API keys programmatically:
```javascript
const youtube = new YouTubeIntegration();
const status = youtube.getApiKeyStatus();

console.log('Total keys:', status.totalKeys);
console.log('Current key:', status.currentKeyIndex);
console.log('Quota exceeded keys:', status.quotaExceededKeys);
```

## Benefits

### With Multiple Keys
- **5x Daily Quota**: Each key gets 10,000 requests/day
- **Automatic Failover**: Seamless switching when quota exceeded
- **Better User Experience**: Reduced fallback to mock data
- **Development Friendly**: Continue working even after hitting limits

### Single Key Fallback
- System still works with just one key
- Graceful degradation to cached/mock data
- No breaking changes to existing setup

## Quota Limits

### YouTube API v3 Quotas (per key)
- **Search requests**: 100 units each
- **Video details**: 1 unit each  
- **Daily limit**: 10,000 units
- **Reset time**: Midnight Pacific Time

### Estimated Usage
- **100 searches/day**: ~10,000 units (full quota)
- **1000 video details/day**: ~1,000 units
- **Mixed usage**: Plan accordingly

## Best Practices

### For Development
- Use 2-3 API keys for comfortable development
- Test quota rotation before deploying
- Monitor usage in console logs

### For Production
- Use 3-5 API keys for high availability
- Implement usage analytics
- Set up monitoring for quota status

### Security
- Keep API keys in `.env` file (never commit)
- Use different keys for different environments
- Rotate keys periodically

## Troubleshooting

### "No YouTube API keys configured"
- Check your `.env` file has at least one key
- Ensure key names match the expected format
- Restart your development server

### "All API keys are quota exceeded"
- Wait until next day (midnight Pacific Time)
- Add more API keys to your configuration
- System will fall back to cached/mock data

### Keys not rotating
- Check console logs for rotation messages
- Verify multiple keys are configured correctly
- Test with the provided test script

## Migration from Single Key

Your existing setup will continue to work:
```env
# This still works
VITE_YOUTUBE_API_KEY=your_existing_key
```

To upgrade to multiple keys:
```env
# Keep your existing key
VITE_YOUTUBE_API_KEY=your_existing_key

# Add numbered keys (these take precedence)
VITE_YOUTUBE_API_KEY_1=your_existing_key
VITE_YOUTUBE_API_KEY_2=your_new_key
```

## Console Messages

Watch for these messages in your browser console:

### Success Messages
- `🔑 Initialized X YouTube API key(s)` - Setup successful
- `🔄 Rotated to API key #X` - Successful rotation
- `🔄 Retrying with new API key...` - Automatic retry

### Warning Messages  
- `⚠️ Only one API key available, cannot rotate` - Need more keys
- `⚠️ All API keys are quota exceeded` - All keys exhausted
- `❌ API key #X quota exceeded` - Key marked as exceeded

This system ensures your YouTube sample discovery continues working even when you hit API limits!