import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

function isConfigNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    String((error as Record<string, unknown>).code) === 'auth/configuration-not-found'
  );
}

function throwConfigHelp(cause: unknown): never {
  throw new Error(
    'Firebase Anonymous Authentication is not enabled. ' +
      'Go to Firebase Console → Authentication → Sign-in method → Anonymous → Enable, then redeploy.',
    { cause }
  );
}

/**
 * Signs in anonymously if not already signed in, then returns the Firebase UID.
 * The UID is managed by Firebase Auth — it is NOT stored in localStorage and
 * cannot be spoofed by modifying browser storage.
 */
export async function getOrCreatePlayerId(): Promise<string> {
  if (auth.currentUser) return auth.currentUser.uid;
  try {
    const result = await signInAnonymously(auth);
    return result.user.uid;
  } catch (error) {
    if (isConfigNotFound(error)) throwConfigHelp(error);
    throw error;
  }
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
      } catch (error) {
        if (isConfigNotFound(error)) throwConfigHelp(error);
        callback(null);
      }
    }
  });
}
