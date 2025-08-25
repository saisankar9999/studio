
import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { credential } from 'firebase-admin';

let app: App;
let db: Firestore;

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : null;

export function configureFirebase() {
  if (!serviceAccount) {
    console.warn(
      'Firebase service account key not found. Firestore integration will be disabled.'
    );
    // Return a dummy object if not configured
    return { app: null, db: null };
  }

  if (!getApps().length) {
    app = initializeApp({
      credential: credential.cert(serviceAccount),
    });
    console.log('Firebase Admin initialized.');
  } else {
    app = getApp();
  }

  db = getFirestore(app);

  return { app, db };
}
