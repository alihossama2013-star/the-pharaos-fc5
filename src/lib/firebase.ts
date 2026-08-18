import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeFirestore,
  getFirestore,
  collection, 
  doc, 
  setDoc, 
  deleteDoc,
  onSnapshot, 
  query, 
  orderBy, 
  getDocs,
  getDocFromServer,
  writeBatch,
  setLogLevel
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Mute verbose internal connection logs and warnings from Firestore SDK
try {
  setLogLevel('silent');
} catch (e) {
  // Ignore if unsupported in environment
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Firebase Auth setup
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Use initializeFirestore with auto-detect long polling for optimal iframe/proxy compatibility
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  }, firebaseConfig.firestoreDatabaseId || undefined);
} catch (e) {
  dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
}

export const db = dbInstance;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  if (errMsg.includes('Could not reach Cloud Firestore backend') || errMsg.includes('offline') || errMsg.includes("didn't respond")) {
    // Expected behavior in sandboxed or offline environments; handled gracefully by local cache fallback
    return;
  }
  console.warn(`Firestore [${operationType}] at path '${path}': ${errMsg}`);
}

export function removeUndefinedFields<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  });
  return cleaned as Partial<T>;
}

export { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc,
  onSnapshot, 
  query, 
  orderBy, 
  getDocs,
  getDocFromServer,
  writeBatch,
  firebaseSignOut,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  type FirebaseUser
};


