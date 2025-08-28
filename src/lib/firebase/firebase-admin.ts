import { initializeApp, getApps, getApp, App, cert } from 'firebase-admin/app';
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore';

let app: App;
let db: Firestore;

const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

let serviceAccount: any;
if (serviceAccountString) {
  try {
    serviceAccount = JSON.parse(serviceAccountString);
  } catch (error) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Make sure it's a valid JSON string on a single line.", error);
    serviceAccount = null;
  }
}


export function configureFirebase() {
  if (!serviceAccount) {
    console.warn(
      'Firebase service account key not found or is invalid in environment variables. Firestore integration on the server will be disabled.'
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
