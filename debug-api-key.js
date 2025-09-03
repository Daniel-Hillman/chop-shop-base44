// Simple debug script to check API key loading
import { config } from 'dotenv';
config();

console.log('=== API Key Debug ===');
console.log('All environment variables with YOUTUBE:');
Object.keys(process.env).filter(key => key.includes('YOUTUBE')).forEach(key => {
  console.log(`${key}: ${process.env[key] ? process.env[key].substring(0, 10) + '...' : 'undefined'}`);
});

console.log('\nDirect check:');
console.log('process.env.VITE_YOUTUBE_API_KEY:', process.env.VITE_YOUTUBE_API_KEY);

// Test the YouTubeIntegration class directly
console.log('\n=== Testing YouTubeIntegration ===');
import { YouTubeIntegration } from './src/services/discovery/YouTubeIntegration.js';

const integration = new YouTubeIntegration();
console.log('API Key in class:', integration.apiKey);
console.log('Is configured:', integration.isConfigured());