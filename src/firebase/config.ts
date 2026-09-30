import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import firebaseConfigJson from '../../firebase-applet-config.json';

const env = import.meta.env;

const readEnv = (key: string, fallback: string): string => {
  const value = (env as Record<string, string | undefined>)[key];
  return value && value.trim().length > 0 ? value.trim() : fallback;
};

/**
 * Values can come from Vite env vars (set these in Render) and fall back to the
 * checked-in firebase-applet-config.json.
 */
const firebaseConfig: FirebaseOptions = {
  apiKey: readEnv('VITE_FIREBASE_API_KEY', firebaseConfigJson.apiKey),
  authDomain: readEnv('VITE_FIREBASE_AUTH_DOMAIN', firebaseConfigJson.authDomain),
  projectId: readEnv('VITE_FIREBASE_PROJECT_ID', firebaseConfigJson.projectId),
  storageBucket: readEnv('VITE_FIREBASE_STORAGE_BUCKET', firebaseConfigJson.storageBucket),
  messagingSenderId: readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', firebaseConfigJson.messagingSenderId),
  appId: readEnv('VITE_FIREBASE_APP_ID', firebaseConfigJson.appId),
};

// initializeApp no longer accepts oauthClientId / recaptchaSiteKey, so they are
// exported separately and applied to the Google provider in AuthContext.
export const googleOAuthClientId = readEnv(
  'VITE_FIREBASE_OAUTH_CLIENT_ID',
  firebaseConfigJson.oAuthClientId || ''
);

const missingKeys = (Object.keys(firebaseConfig) as (keyof FirebaseOptions)[]).filter(
  (key) => !firebaseConfig[key]
);

if (missingKeys.length > 0) {
  console.error(
    `[firebase] Missing configuration for: ${missingKeys.join(', ')}. ` +
      'Set the VITE_FIREBASE_* environment variables or fill in firebase-applet-config.json.'
  );
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

/**
 * Storage is the Realtime Database, not Cloud Firestore: this project stays on
 * the Firebase Spark (free) plan, and Firestore cannot be provisioned there
 * without a billing account. The RTDB is included in the free tier.
 *
 * `databaseURL` is not part of FirebaseOptions, so it is set explicitly. Set
 * VITE_FIREBASE_DATABASE_URL if the database was created with a name other than
 * the project's default.
 */
const databaseUrl =
  readEnv('VITE_FIREBASE_DATABASE_URL', '') ||
  firebaseConfigJson.databaseUrl ||
  `https://${firebaseConfig.projectId}-default-rtdb.firebaseio.com`;

export const db = getDatabase(app, databaseUrl);
export const storage = getStorage(app);

export default app;
