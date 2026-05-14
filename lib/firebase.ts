import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "dummy-key-for-build",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check for apiKey at runtime, not build time
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Use lazy initialization or a check inside exported functions to handle missing keys
export const getDb = () => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    if (typeof window !== 'undefined') {
        console.error("Firebase API Key is missing. Check your environment variables.");
    }
    return null;
  }
  return getFirestore(app, process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || "(default)");
};

export const db = getDb();
export const auth = getAuth(app);
export const functions = getFunctions(app);
