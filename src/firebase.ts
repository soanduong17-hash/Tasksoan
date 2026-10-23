import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firestore Database with explicit database ID from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Authentication
export const auth = getAuth(app);

// Google Auth Provider configured for popups
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Validate connection to Firestore on boot as required by system guidelines
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firestore] Live connection verified successfully');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firestore] Client is offline or using cache. Local persistence active.');
    }
    return false;
  }
}
