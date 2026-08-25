import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

let authInstance: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error(
      'Firebase is not configured. Set the NEXT_PUBLIC_FIREBASE_* variables in .env.local and rebuild.'
    );
  }
  if (!authInstance) {
    const app: FirebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);
    authInstance = getAuth(app);
    void setPersistence(authInstance, browserLocalPersistence);
  }
  return authInstance;
}

export function allowedEmails(): string[] {
  return (process.env.NEXT_PUBLIC_ADMIN_ALLOWED_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = allowedEmails();
  if (!list.length) return true;
  return list.includes(email.trim().toLowerCase());
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const auth = getFirebaseAuth();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logoutUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

export function watchAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}
