import { initializeApp, getApps, getApp, App, cert } from 'firebase-admin/app';
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore';

let app: App;
let db: Firestore;

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : null;

export function configureFirebase() {
  if (!serviceAccount) {
    console.warn(
      'Firebase service account key not found in environment variables. Firestore integration on the server will be disabled.'
    );
    // Return a dummy object if not configured
    return { app: null, db: null, firestore: null };
  }

  if (!getApps().length) {
    app = initializeApp({
      credential: cert(serviceAccount),
    });
    console.log('Firebase Admin initialized.');
  } else {
    app = getApp();
  }

  db = getFirestore(app);

  return { app, db, firestore: { FieldValue } };
}
