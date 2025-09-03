/**
 * Test script for YouTube API key rotation functionality
 */

import { config } from 'dotenv';

// Load environment variables
config();

async function testApiKeyRotation() {
    console.log('🧪 Testing YouTube API Key Rotation...\n');

    // Debug environment variables
    console.log('Environment variables:');
    console.log('- VITE_YOUTUBE_API_KEY:', process.env.VITE_YOUTUBE_API_KEY ? 'Set' : 'Not set');
    console.log('- VITE_YOUTUBE_API_KEY_1:', process.env.VITE_YOUTUBE_API_KEY_1 ? 'Set' : 'Not set');
    console.log('- VITE_YOUTUBE_API_KEY_2:', process.env.VITE_YOUTUBE_API_KEY_2 ? 'Set' : 'Not set');
    console.log();

    // Only proceed if we have at least one key
    if (!process.env.VITE_YOUTUBE_API_KEY && !process.env.VITE_YOUTUBE_API_KEY_1) {
        console.log('❌ No YouTube API keys found in environment variables');
        console.log('Please check your .env file and ensure you have either:');
        console.log('- VITE_YOUTUBE_API_KEY=your_key');
        console.log('- VITE_YOUTUBE_API_KEY_1=your_key');
        return;
    }

    // Import and test after confirming keys exist
    const { YouTubeIntegration } = await import('./YouTubeIntegration.js');
    const youtube = new YouTubeIntegration();

    // Test 1: Check initial setup
    console.log('📋 Initial API Key Status:');
    const initialStatus = youtube.getApiKeyStatus();
    console.log(`- Total keys: ${initialStatus.totalKeys}`);
    console.log(`- Current key index: ${initialStatus.currentKeyIndex}`);
    console.log(`- Quota exceeded keys: ${initialStatus.quotaExceededKeys.length}\n`);

    // Test 2: Test key rotation
    console.log('🔄 Testing Key Rotation:');
    if (initialStatus.totalKeys > 1) {
        const rotated = youtube.rotateApiKey();
        console.log(`- Rotation successful: ${rotated}`);

        const newStatus = youtube.getApiKeyStatus();
        console.log(`- New key index: ${newStatus.currentKeyIndex}\n`);
    } else {
        console.log('- Only one key available, rotation not possible\n');
    }

    // Test 3: Test quota exceeded marking
    console.log('🚫 Testing Quota Exceeded Marking:');
    youtube.markKeyQuotaExceeded();

    const quotaStatus = youtube.getApiKeyStatus();
    console.log(`- Quota exceeded keys after marking: ${quotaStatus.quotaExceededKeys.length}`);

    if (quotaStatus.quotaExceededKeys.length > 0) {
        console.log('- Quota exceeded key details:', quotaStatus.quotaExceededKeys[0]);
    }

    // Test 4: Test rotation after quota exceeded
    console.log('\n🔄 Testing Rotation After Quota Exceeded:');
    const rotationAfterQuota = youtube.rotateApiKey();
    console.log(`- Rotation after quota exceeded: ${rotationAfterQuota}`);

    const finalStatus = youtube.getApiKeyStatus();
    console.log(`- Final key index: ${finalStatus.currentKeyIndex}`);

    console.log('\n✅ API Key Rotation Test Complete!');
}

// Run the test
testApiKeyRotation().catch(console.error);