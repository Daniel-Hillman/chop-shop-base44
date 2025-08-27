import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate Firebase configuration
if (!firebaseConfig.projectId) {
  console.error('Firebase configuration is missing. Please check your environment variables.');
  console.log('Required environment variables:');
  console.log('- VITE_FIREBASE_API_KEY');
  console.log('- VITE_FIREBASE_AUTH_DOMAIN');
  console.log('- VITE_FIREBASE_PROJECT_ID');
  console.log('- VITE_FIREBASE_STORAGE_BUCKET');
  console.log('- VITE_FIREBASE_MESSAGING_SENDER_ID');
  console.log('- VITE_FIREBASE_APP_ID');
}

// Initialize Firebase
let app, db, auth, functions, storage;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  functions = getFunctions(app);
  storage = getStorage(app);
  
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Failed to initialize Firebase:', error);
  throw error;
}

export { db, auth, functions, storage };

// Connect to emulators in development
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR !== 'false') {
  // Use a flag to track if emulators have been connected
  if (!globalThis.__FIREBASE_EMULATORS_CONNECTED__) {
    try {
      connectFirestoreEmulator(db, 'localhost', 8080);
      console.log('Connected to Firestore emulator');
    } catch (error) {
      console.log('Firestore emulator connection failed or already connected:', error.message);
    }
    
    try {
      connectFunctionsEmulator(functions, "localhost", 5002);
      console.log('Connected to Functions emulator');
    } catch (error) {
      console.log('Functions emulator connection failed or already connected:', error.message);
    }
    
    try {
      connectStorageEmulator(storage, "localhost", 9199);
      console.log('Connected to Storage emulator');
    } catch (error) {
      console.log('Storage emulator connection failed or already connected:', error.message);
    }
    
    // Mark emulators as connected
    globalThis.__FIREBASE_EMULATORS_CONNECTED__ = true;
  }
}

