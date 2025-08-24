/**
 * Simple local server to replace Firebase function for development
 * Run with: node local-server.cjs
 */

const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');

const app = express();
const PORT = 5002;

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Accept'],
  credentials: true
}));

// Handle preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.get('Origin') || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control, Accept');
  res.sendStatus(200);
});

app.get('/getAudioStream', async (req, res) => {
  try {
    const videoUrl = req.query.url;
    
    if (!videoUrl) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    if (!ytdl.validateURL(videoUrl)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    console.log('Processing:', videoUrl);

    // Set response headers
    res.set({
      'Content-Type': 'audio/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache'
    });

    // Create audio stream
    const stream = ytdl(videoUrl, {
      filter: 'audioonly',
      quality: 'highestaudio',
      format: 'mp4'
    });

    // Handle errors
    stream.on('error', (error) => {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream error', message: error.message });
      }
    });

    // Pipe stream to response
    stream.pipe(res);

  } catch (error) {
    console.error('Server error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Server error', message: error.message });
    }
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Local audio server running at http://localhost:${PORT}`);
  console.log(`📡 Endpoint: http://localhost:${PORT}/getAudioStream?url=YOUTUBE_URL`);
});