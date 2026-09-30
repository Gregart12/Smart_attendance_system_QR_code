const AUTH_MESSAGES: Record<string, string> = {
  // --- Provider / project configuration ---
  'auth/operation-not-allowed':
    'This sign-in method is disabled in the Firebase console. Open Firebase Console > Authentication > Sign-in method and enable "Email/Password" (and "Google"), then try again.',
  'auth/unauthorized-domain':
    'This domain is not authorised in Firebase. Open Firebase Console > Authentication > Settings > Authorized domains and add this site URL.',
  'auth/invalid-api-key':
    'The Firebase API key is invalid. Check the apiKey value in firebase-applet-config.json (or VITE_FIREBASE_API_KEY).',
  'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
    'The Firebase API key is invalid. Check the apiKey value in firebase-applet-config.json (or VITE_FIREBASE_API_KEY).',
  'auth/app-not-authorized':
    'This Firebase project rejected the request for this app. Confirm the appId in firebase-applet-config.json matches the Web app in Firebase Console > Project settings.',

  // --- Credentials ---
  'auth/invalid-email':
    'That email address is not valid. Use a real address such as name@dept.edu.ng.',
  'auth/missing-email':
    'Enter your email address.',
  'auth/missing-password':
    'Enter your password.',
  'auth/invalid-credential':
    'Incorrect email or password. If you have never signed in, register an account first.',
  'auth/user-not-found':
    'No account exists for that email address. Register the account first, or use "Forgot Password".',
  'auth/wrong-password':
    'Incorrect email or password. Please try again.',
  'auth/invalid-login-credentials':
    'Incorrect email or password. Please try again.',
  'auth/user-disabled':
    'This account has been disabled by an administrator. Contact the HOD / ICT office.',

  // --- Account creation ---
  'auth/email-already-in-use':
    'An account already exists for this email address. Sign in instead, or use "Forgot Password" to reset it.',
  'auth/account-exists-with-different-credential':
    'An account already exists for this email with a different sign-in method. Sign in with that method instead.',
  'auth/weak-password':
    'Password is too weak. Use at least 6 characters with a mix of letters and numbers.',
  'auth/too-many-requests':
    'Too many attempts. Wait a few minutes before trying again, or reset your password.',

  // --- Account state ---
  'auth/requires-recent-login':
    'For security, please sign in again before performing this action.',
  'auth/user-token-expired':
    'Your session expired. Please sign in again.',
  'auth/network-request-failed':
    'Could not reach Firebase. Check your internet connection, then try again.',
  'auth/timeout':
    'The request to Firebase timed out. Check your internet connection and try again.',
  'auth/popup-blocked':
    'Your browser blocked the sign-in popup. Allow pop-ups for this site, or use the redirect sign-in button.',
  'auth/popup-closed-by-user':
    'Sign-in was cancelled before completion. Please try again.',
  'auth/cancelled-popup-request':
    'Another sign-in window is already open. Finish or close it and try again.',
  'auth/credential-already-in-use':
    'This credential is already linked to another account.',
  'auth/operation-not-supported-in-this-environment':
    'This sign-in method is not supported in this browser. Try a different browser or device.',

  // --- Password reset ---
  'auth/expired-action-code':
    'This password reset link has expired. Please request a new one.',
  'auth/invalid-action-code':
    'This password reset link is invalid or has already been used. Please request a new one.',
};

const DATA_MESSAGES: Record<string, string> = {
  'permission-denied':
    'The database denied this request. Publish database.rules.json (firebase deploy --only database, or paste it into the Realtime Database rules tab) and confirm you are signed in with the right role.',
  permission_denied:
    'The database denied this request. Publish database.rules.json (firebase deploy --only database, or paste it into the Realtime Database rules tab) and confirm you are signed in with the right role.',
  'unauthenticated':
    'You are signed out. Please sign in again to continue.',
  'unavailable':
    'The Firebase Realtime Database is not available for this project. Open Firebase Console > Realtime Database and click "Create database", then use "Check again".',
  'not-found':
    'That record no longer exists.',
  'resource-exhausted':
    'The Firebase free-tier quota is used up. The Realtime Database allows 100k reads and 10k writes per month; check usage in the Firebase console.',
  'deadline-exceeded':
    'The database did not respond in time. Please try again.',
  'aborted':
    'The request was aborted because of a conflicting change. Please try again.',
  'internal':
    'The database returned an internal error. If this persists, check the Realtime Database in the Firebase console.',
  'invalid-database-url':
    'The configured Realtime Database URL is not valid. Check VITE_FIREBASE_DATABASE_URL in .env.',
};

function extractCode(error: unknown): string | null {
  if (typeof error === 'string') return error;
  if (!error || typeof error !== 'object') return null;

  const rawCode = (error as { code?: unknown }).code;
  if (typeof rawCode === 'string' && rawCode.length > 0) {
    // Auth codes keep their "auth/" prefix and are keyed that way in the table
    // above. Realtime Database codes are upper case ("PERMISSION_DENIED") and
    // are looked up in lower case.
    if (rawCode.startsWith('auth/')) return rawCode;
    if (/^[A-Z_]+$/.test(rawCode)) return rawCode.toLowerCase();
    return rawCode;
  }

  const message = (error as { message?: unknown }).message;
  if (typeof message === 'string') {
    // A missing database surfaces as a 404 from the REST backend.
    if (/does not exist|404|not found/i.test(message)) return 'not-found';
    const match = message.match(/^auth\/[a-z0-9-]+$/i);
    if (match) return match[0];
  }
  return null;
}

/**
 * Converts a raw Firebase Auth / Realtime Database error into a message that
 * tells the user what actually went wrong and which console setting to change.
 */
export function toFriendlyError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const code = extractCode(error);

  if (code) {
    const mapped = AUTH_MESSAGES[code] ?? DATA_MESSAGES[code];
    if (mapped) return mapped;
  }

  if (error instanceof Error && error.message && !/^Firebase:\s*Error/i.test(error.message)) {
    return error.message;
  }

  return fallback;
}

export const MIN_PASSWORD_LENGTH = 6;

export function validatePassword(password: string): string | null {
  if (!password) return 'Enter a password.';
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
  }
  return null;
}

/** Trims and lowercases an email so lookups and uniqueness checks always match. */
export function normalizeEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}
