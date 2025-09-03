/**
 * Simple test script to verify YouTube API integration is working
 * Run this to test your API key and connection
 */

// Load environment variables for Node.js
import { config } from 'dotenv';
config();

import { YouTubeIntegration } from './YouTubeIntegration.js';

// Create a fresh instance for testing
const youTubeIntegration = new YouTubeIntegration();

async function testYouTubeAPI() {
  console.log('🎵 Testing YouTube API Integration...\n');

  try {
    // Test 1: Check if API is configured
    console.log('1. Checking API configuration...');
    const isConfigured = youTubeIntegration.isConfigured();
    console.log(`   ✅ API configured: ${isConfigured}\n`);

    if (!isConfigured) {
      console.log('❌ API key not configured. Please check your .env file.');
      return;
    }

    // Test 2: Test connection
    console.log('2. Testing API connection...');
    const canConnect = await youTubeIntegration.testConnection();
    console.log(`   ✅ Connection test: ${canConnect ? 'SUCCESS' : 'FAILED'}\n`);

    if (!canConnect) {
      console.log('❌ Cannot connect to YouTube API. Please check your API key.');
      return;
    }

    // Test 3: Search for samples
    console.log('3. Searching for vintage soul samples...');
    const samples = await youTubeIntegration.searchSamples({
      genres: ['Soul'],
      yearRange: { start: 1960, end: 1980 },
      maxResults: 3
    });

    console.log(`   ✅ Found ${samples.length} samples:`);
    samples.forEach((sample, index) => {
      console.log(`   ${index + 1}. "${sample.title}" by ${sample.artist} (${sample.year})`);
      console.log(`      Genre: ${sample.genre}, Duration: ${sample.duration}s, Tempo: ${sample.tempo || 'N/A'}`);
      console.log(`      YouTube ID: ${sample.youtubeId}`);
    });

    // Test 4: Get rate limit status
    console.log('\n4. Checking rate limit status...');
    const quotaStatus = youTubeIntegration.getRateLimitStatus();
    console.log(`   ✅ Daily requests used: ${quotaStatus.dailyRequests}/${quotaStatus.dailyLimit}`);
    console.log(`   ✅ Remaining requests: ${quotaStatus.remainingRequests}`);

    console.log('\n🎉 YouTube API integration is working perfectly!');
    console.log('\nYou can now use the Sample Discovery feature with real YouTube data.');

  } catch (error) {
    console.error('❌ Error testing YouTube API:', error);
    console.error('Error message:', error?.message || 'No error message');
    console.error('Error stack:', error?.stack || 'No stack trace');
    
    if (error?.message?.includes('403')) {
      console.log('\n💡 This might be an API key issue. Please check:');
      console.log('   - Your API key is correct in the .env file');
      console.log('   - The YouTube Data API v3 is enabled in Google Cloud Console');
      console.log('   - Your API key has the correct permissions');
    } else if (error?.message?.includes('quota')) {
      console.log('\n💡 You may have exceeded your daily quota. It resets at midnight UTC.');
    }
  }
}

// Run the test
testYouTubeAPI();