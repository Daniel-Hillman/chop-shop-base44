/**
 * Demo/Manual test for AudioProcessingService
 * 
 * This file can be imported and used to manually test the AudioProcessingService
 * in the browser console or in a React component.
 */

import audioProcessingService from './AudioProcessingService.js';

/**
 * Demo function to test AudioProcessingService
 * @param {string} youtubeUrl - YouTube URL to test with
 */
export async function demoAudioProcessingService(youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ') {
  console.log('🎵 AudioProcessingService Demo Starting...');
  console.log('URL:', youtubeUrl);
  
  // Test 1: Check initial stats
  console.log('\n📊 Initial Stats:', audioProcessingService.getStats());
  
  // Test 2: Check if cached
  console.log('\n💾 Is Cached:', audioProcessingService.isCached(youtubeUrl));
  
  // Test 3: Test AudioContext creation
  console.log('\n🎧 AudioContext:', audioProcessingService.getAudioContext());
  
  // Test 4: Download and process audio with progress tracking
  console.log('\n⬬ Starting download...');
  
  try {
    const result = await audioProcessingService.downloadAndProcessAudio(
      youtubeUrl,
      (progress) => {
        console.log(`📈 Progress:`, progress);
      }
    );
    
    console.log('\n✅ Download successful!');
    console.log('Audio Buffer:', {
      duration: result.audioBuffer.duration,
      sampleRate: result.audioBuffer.sampleRate,
      numberOfChannels: result.audioBuffer.numberOfChannels
    });
    console.log('Waveform Data Length:', result.waveformData.length);
    console.log('Waveform Sample:', result.waveformData.slice(0, 10));
    
    // Test 5: Check cache after download
    console.log('\n💾 Is Cached After Download:', audioProcessingService.isCached(youtubeUrl));
    
    // Test 6: Get cached data
    const cached = audioProcessingService.getAudioBuffer(youtubeUrl);
    console.log('\n🗂️ Cached Data Available:', !!cached);
    
    // Test 7: Final stats
    console.log('\n📊 Final Stats:', audioProcessingService.getStats());
    
    return result;
    
  } catch (error) {
    console.error('\n❌ Download failed:', error);
    throw error;
  }
}

/**
 * Test retry logic with a bad URL
 */
export async function testRetryLogic() {
  console.log('\n🔄 Testing Retry Logic with bad URL...');
  
  try {
    await audioProcessingService.downloadAndProcessAudio(
      'https://www.youtube.com/watch?v=invalid_video_id',
      (progress) => {
        console.log(`🔄 Retry Progress:`, progress);
      }
    );
  } catch (error) {
    console.log('✅ Retry logic worked - expected error:', error.message);
  }
}

/**
 * Test cache management
 */
export function testCacheManagement() {
  console.log('\n🗑️ Testing Cache Management...');
  
  const initialStats = audioProcessingService.getStats();
  console.log('Before clear:', initialStats);
  
  audioProcessingService.clearCache();
  
  const afterStats = audioProcessingService.getStats();
  console.log('After clear:', afterStats);
  
  console.log('✅ Cache management test complete');
}

/**
 * Run all demo tests
 */
export async function runAllDemoTests(youtubeUrl) {
  console.log('🚀 Running All AudioProcessingService Demo Tests...\n');
  
  try {
    // Test basic functionality
    await demoAudioProcessingService(youtubeUrl);
    
    // Test cache management
    testCacheManagement();
    
    // Test retry logic (this will fail as expected)
    await testRetryLogic();
    
    console.log('\n🎉 All demo tests completed!');
    
  } catch (error) {
    console.error('\n💥 Demo test failed:', error);
  } finally {
    // Cleanup
    audioProcessingService.cleanup();
    console.log('\n🧹 Cleanup completed');
  }
}

// Export the service for direct access
export { audioProcessingService };

// Usage examples:
// import { demoAudioProcessingService, runAllDemoTests } from './services/AudioProcessingService.demo.js';
// 
// // Test with default URL
// demoAudioProcessingService();
// 
// // Test with custom URL
// demoAudioProcessingService('https://www.youtube.com/watch?v=your_video_id');
// 
// // Run all tests
// runAllDemoTests('https://www.youtube.com/watch?v=your_video_id');