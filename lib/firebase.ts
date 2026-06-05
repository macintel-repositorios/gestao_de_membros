// Firebase configuration - v2
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, RecaptchaVerifier, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Get environment variables
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "";
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "";
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "";
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "";

// Check if Firebase is properly configured
export const isFirebaseConfigured = !!(apiKey && authDomain && projectId && appId);



// Firebase config object
const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
};

// Initialize Firebase only when configured
let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
    authInstance.languageCode = "pt-BR";
    
    // Ensure session persistence
    setPersistence(authInstance, browserLocalPersistence).catch(console.error);

  } catch (error) {
    console.error("[v0] Firebase initialization error:", error);
  }
}

const auth = authInstance as Auth;
const db = dbInstance as Firestore;

export { app, auth, db, RecaptchaVerifier };

