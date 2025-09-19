
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { configureFirebase } from './firebase-client';

interface ProfileData {
  name: string;
  resume: string;
  jobDescription: string;
}

// Function to add a profile to a user's collection
export async function addProfile(userId: string, profileData: ProfileData) {
  const { db } = configureFirebase();
  if (!db) throw new Error('Firestore is not initialized.');

  const profilesCollectionRef = collection(db, 'users', userId, 'profiles');
  const docRef = await addDoc(profilesCollectionRef, {
    ...profileData,
    createdAt: new Date(),
  });

  return { id: docRef.id, ...profileData };
}

// Function to get all profiles for a user
export async function getUserProfiles(userId: string) {
  const { db } = configureFirebase();
  if (!db) throw new Error('Firestore is not initialized.');

  const profilesCollectionRef = collection(db, 'users', userId, 'profiles');
  const q = query(profilesCollectionRef, orderBy('createdAt', 'desc'), limit(10));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as { id: string; name: string; resume: string; jobDescription: string }[];
}


// Function to delete a profile
export async function deleteProfile(userId: string, profileId: string) {
  const { db } = configureFirebase();
  if (!db) throw new Error('Firestore is not initialized.');

  const profileDocRef = doc(db, 'users', userId, 'profiles', profileId);
  await deleteDoc(profileDocRef);
}
