import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendPasswordResetEmail,
  signOut,
  updateCurrentUser,
  type User
} from 'firebase/auth';
import { auth } from './config';
import { createStaffProfile, isEmailTaken, isStaffIdTaken } from './services';
import { runWithAuthObserverPaused } from './sessionControl';
import { toFriendlyError, normalizeEmail, validatePassword } from './errors';
import type { StaffProfile } from '../types';

/** Pre-flight validation failures that must not be rewritten as Firebase errors. */
class InputError extends Error {}

/**
 * The staff account exists and is correct, but the admin's own session could not
 * be put back. Distinct from an InputError so the caller can say so precisely.
 */
export class SessionRestoreError extends Error {}

export interface NewStaffAccount {
  name: string;
  staffId: string;
  email: string;
  password: string;
  department: string;
  designation: string;
  phone?: string;
  photoUrl?: string;
  status?: StaffProfile['status'];
}

/**
 * Creates a staff member as a real Firebase Authentication user.
 *
 * The web SDK cannot create Auth users on someone else's behalf, so the admin's
 * browser is used as the creation context: the new user is created (which
 * briefly signs the browser in as them), their profile is written, and the
 * admin session is then restored with updateCurrentUser().
 */
export async function createStaffAuthAccount(input: NewStaffAccount): Promise<StaffProfile> {
  const adminUser: User | null = auth.currentUser;
  if (!adminUser) {
    throw new Error('Your admin session expired. Please sign in again before registering staff.');
  }

  const email = normalizeEmail(input.email);
  const staffId = (input.staffId || '').trim();

  await validateNewStaff({ ...input, email, staffId });

  let createdUser: User | null = null;

  try {
    const profile = await runWithAuthObserverPaused(async () => {
      const credential = await createUserWithEmailAndPassword(auth, email, input.password);
      createdUser = credential.user;

      // The newly signed-in staff member writes their own record, which the
      // The Realtime Database rules permit exactly this case.
      const created = await createStaffProfile({
        uid: credential.user.uid,
        staffId,
        name: input.name.trim(),
        email,
        department: input.department.trim() || 'Department of Information Technology',
        designation: input.designation.trim() || 'IT Officer',
        status: input.status || 'active',
        phone: input.phone?.trim() || '',
        photoUrl: input.photoUrl || ''
      });

      await restoreAdminSession(adminUser);
      return created;
    });

    return profile;
  } catch (err) {
    if (createdUser && !(err instanceof SessionRestoreError)) {
      // The profile write failed while the new user is current. Delete it
      // directly so a later retry is not blocked by an orphaned email.
      await deleteUser(createdUser).catch(() => undefined);
    } else if (createdUser) {
      // The profile is valid, but the admin session could not be restored.
      await signOut(auth).catch(() => undefined);
    }

    if (err instanceof SessionRestoreError) {
      throw new Error(
        `The staff account for ${email} was created successfully, but your admin session could ` +
          'not be restored. Please sign in again as an administrator.'
      );
    }

    if (err instanceof InputError) throw err;

    throw new Error(
      toFriendlyError(
        err,
        'The sign-in account was created but the staff profile could not be saved. Publish the updated database.rules.json and try again.'
      )
    );
  }
}

async function validateNewStaff(input: {
  name: string;
  staffId: string;
  email: string;
  password: string;
}) {
  if (!input.name.trim()) throw new InputError("Enter the staff member's full name.");
  if (!input.staffId.trim()) throw new InputError('Enter a staff ID.');

  const passwordError = validatePassword(input.password);
  if (passwordError) throw new InputError(passwordError);

  if (await isEmailTaken(input.email)) {
    throw new InputError(`An account already exists for ${input.email}. Use a different email address.`);
  }
  if (await isStaffIdTaken(input.staffId.trim())) {
    throw new InputError(`Staff ID "${input.staffId.trim()}" is already in use. Choose a different staff ID.`);
  }
}

async function restoreAdminSession(adminUser: User): Promise<void> {
  try {
    // Re-authenticating the admin can fail when the session is old
    // (auth/requires-recent-login). The staff record is already saved at that
    // point, so surface it as its own error rather than a generic failure.
    await updateCurrentUser(auth, adminUser);
  } catch (err) {
    console.warn('Could not restore admin session after creating staff account:', err);
    await signOut(auth).catch(() => undefined);
    throw new SessionRestoreError(
      'The staff account was created but the admin session could not be restored.'
    );
  }
}

/** Sends a Firebase password reset email so a staff member can set their own password. */
export async function sendStaffPasswordReset(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  try {
    await sendPasswordResetEmail(auth, normalized, {
      url: `${window.location.origin}/reset-password`,
      handleCodeInApp: true
    });
  } catch (err) {
    throw new Error(toFriendlyError(err, 'Could not send the password reset email. Please try again.'));
  }
}
