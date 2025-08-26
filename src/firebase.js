import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDBLjHyR3kiZNsoz63ZGpRcHfMoARgnRAA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "chop-stop.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "chop-stop",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "chop-stop.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "285885896798",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:285885896798:web:05ffbca2d4ead63140bccf",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);

if (import.meta.env.DEV) {
  connectFunctionsEmulator(functions, "localhost", 5001);
}

