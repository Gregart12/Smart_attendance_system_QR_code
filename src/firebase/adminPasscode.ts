import { remove, ref, set } from 'firebase/database';
import { db } from './config';

/**
 * Gate for creating administrator accounts.
 *
 * The passcode itself is never part of this application. It is typed into the
 * admin registration form, hashed in the browser with SHA-256, and only the
 * hash travels to the database. The expected hash lives in
 * `database.rules.json`, which end users cannot read, so the passcode cannot be
 * recovered from the deployed site or its bundle.
 *
 * Because the comparison happens in the security rules, the app cannot reject a
 * bad passcode on its own: a write to a small probe node is only permitted when
 * its value equals the expected hash. That check runs before the Firebase Auth
 * account is created, so a wrong passcode never leaves a half-built account
 * behind.
 */

export const MIN_ADMIN_PASSCODE_LENGTH = 12;

const PROBE_PATH = 'system/adminPasscodeProbe';

/** Lowercase hex SHA-256 of `value`. */
export async function hashPasscode(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function validateAdminPasscode(value: string): string | null {
  if (!value) return 'Enter the administrator passcode.';
  if (value.trim().length < MIN_ADMIN_PASSCODE_LENGTH) {
    return `The passcode must be at least ${MIN_ADMIN_PASSCODE_LENGTH} characters.`;
  }
  return null;
}

/**
 * True when the passcode matches the hash held in the security rules.
 *
 * A wrong passcode is rejected by the database with a permission error rather
 * than a message saying so, which is what keeps the passcode out of the app.
 */
export async function verifyAdminPasscode(passcode: string): Promise<boolean> {
  const hash = await hashPasscode(passcode);
  const probe = ref(db, PROBE_PATH);

  try {
    await set(probe, hash);
  } catch {
    return false;
  }

  // Leave no trace behind. The rules also permit this delete.
  await remove(probe).catch(() => undefined);
  return true;
}
