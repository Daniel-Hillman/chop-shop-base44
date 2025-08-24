/**
 * StorageManager Demo
 * 
 * Demonstrates the StorageManager functionality for temporary audio caching
 */

import storageManager from './StorageManager.js';

// Demo function to show StorageManager capabilities
export async function demonstrateStorageManager() {
  console.log('=== StorageManager Demo ===');
  
  try {
    // Initialize the storage manager
    console.log('1. Initializing StorageManager...');
    await storageManager.init();
    console.log('✓ StorageManager initialized successfully');
    
    // Get initial storage info
    console.log('\n2. Getting initial storage information...');
    const initialInfo = await storageManager.getStorageInfo();
    console.log('Initial storage info:', {
      entryCount: initialInfo.entryCount,
      totalSizeMB: initialInfo.totalSizeMB,
      maxSizeMB: initialInfo.maxSizeMB
    });
    
    // Create a mock audio buffer for testing
    console.log('\n3. Creating mock audio buffer...');
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const mockAudioBuffer = audioContext.createBuffer(2, 44100 * 10, 44100); // 10 seconds, stereo
    
    // Fill with test data (sine wave)
    for (let channel = 0; channel < mockAudioBuffer.numberOfChannels; channel++) {
      const channelData = mockAudioBuffer.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 0.5; // 440Hz sine wave
      }
    }
    
    const mockWaveformData = Array.from({ length: 400 }, (_, i) => Math.random() * 0.8);
    console.log('✓ Mock audio buffer created (10 seconds, 44.1kHz, stereo)');
    
    // Test storing audio
    console.log('\n4. Storing audio buffer...');
    const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const storeResult = await storageManager.store(testUrl, mockAudioBuffer, mockWaveformData);
    console.log('✓ Audio stored successfully:', storeResult);
    
    // Check if audio exists
    console.log('\n5. Checking if audio exists...');
    const exists = await storageManager.has(testUrl);
    console.log('✓ Audio exists in storage:', exists);
    
    // Retrieve stored audio
    console.log('\n6. Retrieving stored audio...');
    const retrieved = await storageManager.retrieve(testUrl);
    if (retrieved) {
      console.log('✓ Audio retrieved successfully');
      console.log('Retrieved metadata:', {
        duration: retrieved.metadata.duration,
        sampleRate: retrieved.metadata.sampleRate,
        numberOfChannels: retrieved.metadata.numberOfChannels,
        sizeMB: Math.round(retrieved.metadata.size / (1024 * 1024) * 100) / 100
      });
      console.log('Waveform data length:', retrieved.waveformData?.length);
    } else {
      console.log('✗ Failed to retrieve audio');
    }
    
    // Get updated storage info
    console.log('\n7. Getting updated storage information...');
    const updatedInfo = await storageManager.getStorageInfo();
    console.log('Updated storage info:', {
      entryCount: updatedInfo.entryCount,
      totalSizeMB: updatedInfo.totalSizeMB,
      utilizationPercent: updatedInfo.utilizationPercent
    });
    
    // Test storing multiple entries
    console.log('\n8. Storing additional test entries...');
    const additionalUrls = [
      'https://www.youtube.com/watch?v=9bZkp7q19f0',
      'https://www.youtube.com/watch?v=oHg5SJYRHA0'
    ];
    
    for (const url of additionalUrls) {
      await storageManager.store(url, mockAudioBuffer, mockWaveformData);
      console.log(`✓ Stored audio for ${url}`);
    }
    
    // Test cleanup functionality
    console.log('\n9. Testing cleanup functionality...');
    const cleanedCount = await storageManager.cleanup();
    console.log('✓ Cleanup completed, entries cleaned:', cleanedCount);
    
    // Test removal
    console.log('\n10. Testing entry removal...');
    const removeResult = await storageManager.remove(testUrl);
    console.log('✓ Entry removed:', removeResult);
    
    // Verify removal
    const existsAfterRemoval = await storageManager.has(testUrl);
    console.log('✓ Entry exists after removal:', existsAfterRemoval);
    
    // Final storage info
    console.log('\n11. Final storage information...');
    const finalInfo = await storageManager.getStorageInfo();
    console.log('Final storage info:', {
      entryCount: finalInfo.entryCount,
      totalSizeMB: finalInfo.totalSizeMB,
      oldestEntry: finalInfo.oldestEntry ? new Date(finalInfo.oldestEntry).toLocaleString() : null,
      newestEntry: finalInfo.newestEntry ? new Date(finalInfo.newestEntry).toLocaleString() : null
    });
    
    console.log('\n=== Demo completed successfully! ===');
    
    return {
      success: true,
      message: 'StorageManager demo completed successfully',
      finalInfo
    };
    
  } catch (error) {
    console.error('Demo failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Test ID generation
export function testIdGeneration() {
  console.log('\n=== ID Generation Test ===');
  
  const testUrls = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s',
    'https://example.com/audio.mp3'
  ];
  
  testUrls.forEach(url => {
    const id = storageManager.generateId(url);
    console.log(`URL: ${url}`);
    console.log(`ID:  ${id}\n`);
  });
}

// Test utility methods
export function testUtilityMethods() {
  console.log('\n=== Utility Methods Test ===');
  
  // Test size formatting
  const sizes = [0, 1024, 1536, 1024 * 1024, 1024 * 1024 * 1024];
  console.log('Size formatting:');
  sizes.forEach(size => {
    console.log(`${size} bytes = ${storageManager.formatSize(size)}`);
  });
  
  // Test expiration checking
  console.log('\nExpiration checking:');
  const now = Date.now();
  const ttl = storageManager.config.entryTTL;
  
  const entries = [
    { timestamp: now, description: 'Fresh entry' },
    { timestamp: now - ttl / 2, description: 'Half-expired entry' },
    { timestamp: now - ttl - 1000, description: 'Expired entry' }
  ];
  
  entries.forEach(entry => {
    const expired = storageManager.isExpired(entry);
    console.log(`${entry.description}: ${expired ? 'EXPIRED' : 'VALID'}`);
  });
}

// Export for use in browser console or other modules
if (typeof window !== 'undefined') {
  window.storageManagerDemo = {
    demonstrate: demonstrateStorageManager,
    testIdGeneration,
    testUtilityMethods,
    storageManager
  };
  
  console.log('StorageManager demo functions available at window.storageManagerDemo');
}