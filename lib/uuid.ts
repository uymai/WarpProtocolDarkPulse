import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

/**
 * Signs in anonymously if not already signed in, then returns the Firebase UID.
 * The UID is managed by Firebase Auth — it is NOT stored in localStorage and
 * cannot be spoofed by modifying browser storage.
 */
export async function getOrCreatePlayerId(): Promise<string> {
  if (auth.currentUser) return auth.currentUser.uid;
  const result = await signInAnonymously(auth);
  return result.user.uid;
}

/**
 * Subscribes to Firebase Auth state. Triggers sign-in if not authenticated.
 * Returns an unsubscribe function.
 */
export function subscribeToPlayerId(callback: (uid: string | null) => void): () => void {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      callback(user.uid);
    } else {
      try {
        const result = await signInAnonymously(auth);
        callback(result.user.uid);
      } catch {
        callback(null);
      }
    }
  });
}
