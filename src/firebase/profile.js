import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

const PROFILES_COLLECTION = 'user_profiles';

/**
 * Subscribe to a user's business profile for real-time updates.
 * @param {string} uid - User ID
 * @param {(profile: any) => void} onUpdate - Callback fired with profile data or null
 * @returns {() => void} Unsubscribe function
 */
export function subscribeUserProfile(uid, onUpdate) {
  if (!uid) {
    onUpdate(null);
    return () => {};
  }
  
  const ref = doc(db, PROFILES_COLLECTION, uid);
  return onSnapshot(ref, (snap) => {
    onUpdate({
      id: snap.id,
      data: snap.exists() ? snap.data() : null,
      exists: snap.exists(),
      fromCache: snap.metadata.fromCache
    });
  });
}

/**
 * Create or update the user's business profile document.
 * @param {string} uid - User ID
 * @param {Object} data - The profile fields (businessName, address, phone, email)
 */
export async function saveUserProfile(uid, data) {
  if (!uid) return;
  const ref = doc(db, PROFILES_COLLECTION, uid);
  await setDoc(ref, {
    ...data,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

/**
 * Fetch a user profile once (mostly handled via subscription, but useful for one-offs)
 */
export async function getUserProfile(uid) {
  if (!uid) return null;
  const ref = doc(db, PROFILES_COLLECTION, uid);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
