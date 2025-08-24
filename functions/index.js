const functions = require("firebase-functions");
const ytdl = require("ytdl-core");
const cors = require("cors");

// Configure CORS with specific origins for better security
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173', // Vite dev server
    'https://your-app-domain.com' // Add your production domain
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Accept'],
  credentials: true
};

const corsHandler = cors(corsOptions);

// Utility function for logging with structured format
function logInfo(message, data = {}) {
  console.log(`[AudioStream] ${message}`, JSON.stringify(data));
}

function logError(message, error, data = {}) {
  console.error(`[AudioStream ERROR] ${message}`, {
    error: error.message || error,
    stack: error.stack,
    ...data
  });
}

// Validate YouTube URL with enhanced checks
function validateYouTubeUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required and must be a string' };
  }

  if (!ytdl.validateURL(url)) {
    return { valid: false, error: 'Invalid YouTube URL format' };
  }

  // Additional validation for URL length and suspicious patterns
  if (url.length > 500) {
    return { valid: false, error: 'URL too long' };
  }

  return { valid: true };
}

// Get standardized audio format options
function getAudioOptions() {
  return {
    filter: 'audioonly',
    quality: 'highestaudio',
    format: 'mp4', // Prefer mp4 container for better compatibility
    requestOptions: {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }
  };
}

exports.getAudioStream = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes max
    memory: '1GB'
  })
  .https.onRequest((req, res) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);

    logInfo('Audio stream request started', {
      requestId,
      method: req.method,
      userAgent: req.get('User-Agent'),
      origin: req.get('Origin')
    });

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', req.get('Origin') || '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control, Accept');
      res.set('Access-Control-Max-Age', '3600');
      return res.status(204).send('');
    }

    corsHandler(req, res, async () => {
      try {
        const videoUrl = req.query.url || req.body?.url;

        logInfo('Processing audio request', { requestId, videoUrl: videoUrl ? 'provided' : 'missing' });

        // Validate request method
        if (req.method !== 'GET' && req.method !== 'POST') {
          logError('Invalid request method', new Error('Method not allowed'), { requestId, method: req.method });
          return res.status(405).json({
            error: 'Method not allowed',
            message: 'Only GET and POST methods are supported',
            requestId
          });
        }

        // Validate YouTube URL
        const urlValidation = validateYouTubeUrl(videoUrl);
        if (!urlValidation.valid) {
          logError('URL validation failed', new Error(urlValidation.error), { requestId, videoUrl });
          return res.status(400).json({
            error: 'Invalid URL',
            message: urlValidation.error,
            requestId
          });
        }

        // Get video info for additional validation
        let videoInfo;
        try {
          logInfo('Fetching video info', { requestId });

          // Try to get basic info first with minimal options
          videoInfo = await ytdl.getBasicInfo(videoUrl);

          if (!videoInfo || !videoInfo.videoDetails) {
            throw new Error('Unable to retrieve video information');
          }

          // Check if video is available
          if (videoInfo.videoDetails.isLiveContent) {
            throw new Error('Live streams are not supported');
          }

          if (videoInfo.videoDetails.isPrivate) {
            throw new Error('Private videos are not accessible');
          }

          // Additional checks for age-restricted or unavailable content
          if (videoInfo.videoDetails.age_restricted) {
            logInfo('Age-restricted video detected', { requestId });
          }

          logInfo('Video info retrieved successfully', {
            requestId,
            title: videoInfo.videoDetails.title,
            duration: videoInfo.videoDetails.lengthSeconds,
            author: videoInfo.videoDetails.author?.name,
            isLive: videoInfo.videoDetails.isLiveContent,
            isPrivate: videoInfo.videoDetails.isPrivate
          });

        } catch (infoError) {
          logError('Failed to get video info', infoError, { requestId, videoUrl });

          // Provide more specific error messages
          let errorMessage = 'Unable to access video. ';
          if (infoError.message.includes('Video unavailable')) {
            errorMessage += 'The video may be private, deleted, or region-restricted.';
          } else if (infoError.message.includes('Sign in to confirm')) {
            errorMessage += 'The video requires sign-in or is age-restricted.';
          } else if (infoError.message.includes('This video is not available')) {
            errorMessage += 'The video is not available in your region.';
          } else {
            errorMessage += 'It may be private, deleted, or region-restricted.';
          }

          return res.status(400).json({
            error: 'Video not accessible',
            message: errorMessage,
            requestId,
            details: process.env.NODE_ENV === 'development' ? infoError.message : undefined
          });
        }

        // Set response headers for audio streaming
        res.set({
          'Content-Type': 'audio/mp4',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Request-ID': requestId
        });

        // Create audio stream with enhanced options
        const audioOptions = getAudioOptions();
        logInfo('Creating audio stream', { requestId, options: audioOptions });

        const stream = ytdl(videoUrl, audioOptions);
        let bytesStreamed = 0;
        let streamStarted = false;

        // Handle stream response to set proper headers
        stream.on('response', (response) => {
          streamStarted = true;
          const contentLength = response.headers['content-length'];

          logInfo('Stream response received', {
            requestId,
            contentType: response.headers['content-type'],
            contentLength,
            statusCode: response.statusCode
          });

          if (contentLength) {
            res.set('Content-Length', contentLength);
          }

          // Override content-type if needed for standardization
          if (response.headers['content-type']) {
            const contentType = response.headers['content-type'];
            if (contentType.includes('audio')) {
              res.set('Content-Type', contentType);
            }
          }
        });

        // Track streaming progress
        stream.on('data', (chunk) => {
          bytesStreamed += chunk.length;
        });

        // Handle successful stream completion
        stream.on('end', () => {
          const duration = Date.now() - startTime;
          logInfo('Stream completed successfully', {
            requestId,
            bytesStreamed,
            duration: `${duration}ms`
          });
        });

        // Enhanced error handling for stream
        stream.on('error', (streamError) => {
          const duration = Date.now() - startTime;
          logError('Stream error occurred', streamError, {
            requestId,
            bytesStreamed,
            duration: `${duration}ms`,
            streamStarted
          });

          if (!res.headersSent) {
            res.status(500).json({
              error: 'Stream error',
              message: 'Failed to stream audio. The video may be unavailable or there may be a temporary issue.',
              requestId,
              details: process.env.NODE_ENV === 'development' ? streamError.message : undefined
            });
          }
        });

        // Handle client disconnect
        req.on('close', () => {
          logInfo('Client disconnected', { requestId, bytesStreamed });
          if (stream && !stream.destroyed) {
            stream.destroy();
          }
        });

        // Pipe stream to response
        stream.pipe(res);

        // Set timeout for stream initialization
        const streamTimeout = setTimeout(() => {
          if (!streamStarted) {
            logError('Stream timeout', new Error('Stream failed to start within timeout'), { requestId });
            if (!res.headersSent) {
              res.status(504).json({
                error: 'Stream timeout',
                message: 'Audio stream failed to start within the expected time',
                requestId
              });
            }
            if (stream && !stream.destroyed) {
              stream.destroy();
            }
          }
        }, 30000); // 30 second timeout

        stream.on('response', () => {
          clearTimeout(streamTimeout);
        });

      } catch (error) {
        const duration = Date.now() - startTime;
        logError('Function error', error, {
          requestId,
          duration: `${duration}ms`,
          url: req.query.url ? 'provided' : 'missing'
        });

        if (!res.headersSent) {
          res.status(500).json({
            error: 'Internal server error',
            message: 'An unexpected error occurred while processing the audio stream',
            requestId,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
          });
        }
      }
    });
  });