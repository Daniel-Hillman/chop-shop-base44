#!/usr/bin/env node

/**
 * Sample Library Setup Script
 * Sets up Cloud Storage buckets and uploads default sample packs
 */

import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase configuration (should match your project)
const firebaseConfig = {
  // Add your Firebase config here
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const auth = getAuth(app);

/**
 * Upload sample pack to Cloud Storage
 */
async function uploadSamplePack(packId, packData, samplesDir) {
  console.log(`Uploading sample pack: ${packData.name}`);
  
  const uploadPromises = packData.samples.map(async (sampleName) => {
    const samplePath = path.join(samplesDir, packId, sampleName);
    
    if (!fs.existsSync(samplePath)) {
      console.warn(`Sample file not found: ${samplePath}`);
      return null;
    }
    
    const fileBuffer = fs.readFileSync(samplePath);
    const storageRef = ref(storage, `sample-packs/${packId}/${sampleName}`);
    
    const metadata = {
      contentType: 'audio/wav',
      customMetadata: {
        packId,
        packName: packData.name,
        category: packData.category,
        tags: packData.tags.join(','),
        createdAt: new Date().toISOString()
      }
    };
    
    try {
      const snapshot = await uploadBytes(storageRef, fileBuffer, metadata);
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log(`  ✓ Uploaded: ${sampleName}`);
      return { name: sampleName, url: downloadURL };
    } catch (error) {
      console.error(`  ✗ Failed to upload ${sampleName}:`, error.message);
      return null;
    }
  });
  
  const results = await Promise.all(uploadPromises);
  return results.filter(result => result !== null);
}

/**
 * Main setup function
 */
async function setupSampleLibrary() {
  try {
    // Sign in as admin (you'll need to create an admin user first)
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminEmail || !adminPassword) {
      throw new Error('Admin credentials not provided in environment variables');
    }
    
    console.log('Signing in as admin...');
    await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    console.log('✓ Admin signed in successfully');
    
    // Define sample packs directory
    const samplesDir = path.join(__dirname, '..', 'assets', 'samples');
    
    // Create samples directory if it doesn't exist
    if (!fs.existsSync(samplesDir)) {
      fs.mkdirSync(samplesDir, { recursive: true });
      console.log('Created samples directory:', samplesDir);
    }
    
    // Default sample packs configuration
    const defaultPacks = [
      {
        id: 'trap-essentials',
        name: 'Trap Essentials',
        description: 'Essential trap drum samples',
        category: 'drums',
        tags: ['trap', 'hip-hop', 'drums'],
        samples: [
          'kick_trap_01.wav',
          'kick_trap_02.wav',
          'snare_trap_01.wav',
          'snare_trap_02.wav',
          'hihat_trap_01.wav',
          'hihat_trap_02.wav',
          'openhat_trap_01.wav',
          'perc_trap_01.wav'
        ]
      }
    ];
    
    console.log('Starting sample pack uploads...');
    
    for (const pack of defaultPacks) {
      const packDir = path.join(samplesDir, pack.id);
      
      // Create pack directory if it doesn't exist
      if (!fs.existsSync(packDir)) {
        fs.mkdirSync(packDir, { recursive: true });
        console.log(`Created pack directory: ${packDir}`);
        console.log(`Please add sample files to: ${packDir}`);
        continue;
      }
      
      const uploadedSamples = await uploadSamplePack(pack.id, pack, samplesDir);
      console.log(`✓ Pack "${pack.name}" uploaded with ${uploadedSamples.length} samples`);
    }
    
    console.log('✓ Sample library setup completed!');
    
  } catch (error) {
    console.error('Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupSampleLibrary();
}

export { setupSampleLibrary };