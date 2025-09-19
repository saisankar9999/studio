
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type Auth,
} from 'firebase/auth';
import { configureFirebase } from './firebase-client';

let auth: Auth;

function getFirebaseAuth() {
  if (!auth) {
    const { app } = configureFirebase();
    if (!app) {
      throw new Error(
        'Firebase has not been initialized. Please check your configuration.'
      );
    }
    auth = getAuth(app);
  }
  return auth;
}

export async function createUserWithEmail(email: string, password: string) {
  const auth = getFirebaseAuth();
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );
  return userCredential.user;
}

export async function signInWithEmail(email: string, password: string) {
  const auth = getFirebaseAuth();
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );
  return userCredential.user;
}
