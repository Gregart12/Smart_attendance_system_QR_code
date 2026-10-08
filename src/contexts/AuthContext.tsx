import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  sendEmailVerification,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
  User as FirebaseUser
} from 'firebase/auth';
import { auth, googleOAuthClientId } from '../firebase/config';
import { isAuthObserverPaused, onAuthObserverResumed, runWithAuthObserverPaused } from '../firebase/sessionControl';
import {
  getUserProfile,
  findAccountByEmail,
  createAdminProfile,
  createStaffProfile,
  isEmailTaken,
  isStaffIdTaken,
  isAccountRevoked,
  indexAccountEmail,
  generateUniqueStaffId
} from '../firebase/services';
import { hashPasscode, validateAdminPasscode, verifyAdminPasscode } from '../firebase/adminPasscode';
import { toFriendlyError, normalizeEmail, validatePassword, MIN_PASSWORD_LENGTH } from '../firebase/errors';
import { UserProfile, StaffProfile, UserRole } from '../types';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

const DEFAULT_DEPARTMENT = 'Department of Information Technology';
const DEFAULT_DESIGNATION = 'IT Lecturer / Systems Officer';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | StaffProfile | null;
  role: UserRole | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  registerAdmin: (name: string, email: string, pass: string, dept: string, adminPasscode: string) => Promise<void>;
  registerStaff: (
    name: string,
    staffId: string,
    email: string,
    pass: string,
    dept: string,
    designation: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  confirmResetPassword: (oobCode: string, newPassword: string) => Promise<void>;
  verifyResetCode: (oobCode: string) => Promise<string>;
  continueWithGoogle: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const withTimeout = <T,>(promise: Promise<T>, message: string, timeoutMs = 20000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), timeoutMs);
    })
  ]);
};

function suspendedMessage(profile: UserProfile | StaffProfile): string | null {
  if (profile.role !== 'staff' || !('status' in profile)) return null;
  if (profile.status === 'active') return null;
  return `This staff account is ${profile.status}. Contact the HOD / ICT office to have it reinstated.`;
}

function needsStaffEmailVerification(
  user: FirebaseUser,
  profile: UserProfile | StaffProfile | null
): boolean {
  return !user.emailVerified && profile?.role !== 'admin';
}

/**
 * Removes a sign-in account that was created but never finished.
 *
 * Registration has to create the Firebase Auth user before its database profile
 * can exist, so a failure in between would otherwise leave the email claimed by
 * an account that can never sign in. Deleting your own account is the only
 * account removal the client SDK permits, so this re-authenticates with the
 * credentials that were just used and deletes the user.
 */
async function discardOrphanedAccount(user: FirebaseUser) {
  try {
    // The newly created user is already current. Delete it directly so the
    // auth observer cannot see a sign-out/sign-in gap and provision a profile.
    await deleteUser(user);
  } catch {
    // Best effort. If this fails the account is inert: it has no profile, so
    // signing in with it cannot reach any part of the app.
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | StaffProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  // Set when an auth event arrives while observation is paused, so the state can
  // be re-read when the pause lifts.
  const pendingResyncRef = useRef(false);

  const clearSession = useCallback(() => {
    setCurrentUser(null);
    setUserProfile(null);
    setRole(null);
  }, []);

  const logout = useCallback(async () => {
    await firebaseSignOut(auth);
    clearSession();
  }, [clearSession]);

  // Auto sign-out after a period of inactivity.
  useEffect(() => {
    if (!currentUser) return;

    let timer: number | undefined;
    const resetTimer = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void logout();
      }, INACTIVITY_TIMEOUT_MS);
    };

    const events: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'click'
    ];
    events.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      window.clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [currentUser, logout]);

  /**
   * Resolves a profile for an authenticated user, provisioning one if the
   * account exists in Firebase Auth but has no database record yet. This is
   * what unblocks accounts left half-created by a failed profile write.
   */
  const resolveProfile = useCallback(async (user: FirebaseUser): Promise<UserProfile | StaffProfile> => {
    const existing = await getUserProfile(user.uid);
    if (existing) return existing;

    const email = normalizeEmail(user.email || '');

    // An administrator whose account was revoked can never be re-provisioned.
    if (await isAccountRevoked(user.uid)) {
      throw new Error('This account has been revoked. Contact the HOD / ICT office.');
    }

    // Refuse to attach this sign-in to an email that belongs to someone else.
    if (email) {
      const owner = await findAccountByEmail(email);
      if (owner && owner.uid !== user.uid) {
        throw new Error(
          'This email is already registered to a different account. Contact the HOD / ICT office.'
        );
      }
    }

    const staffId = await generateUniqueStaffId();
    return createStaffProfile({
      uid: user.uid,
      staffId,
      name: user.displayName || email.split('@')[0] || 'Staff Member',
      email,
      department: DEFAULT_DEPARTMENT,
      designation: DEFAULT_DESIGNATION,
      status: 'active'
    });
  }, []);

  const applySession = useCallback(
    (user: FirebaseUser, profile: UserProfile | StaffProfile) => {
      if (profile.email) {
        void indexAccountEmail(profile.email, profile.uid, profile.role);
      }
      setCurrentUser(user);
      setUserProfile(profile);
      setRole(profile.role);
    },
    []
  );

  const fetchProfile = useCallback(
    async (user: FirebaseUser) => {
      try {
        const existingProfile = await getUserProfile(user.uid);
        if (needsStaffEmailVerification(user, existingProfile)) {
          await firebaseSignOut(auth).catch(() => undefined);
          clearSession();
          return;
        }

        const profile = existingProfile ?? await resolveProfile(user);
        const blocked = suspendedMessage(profile);
        if (blocked) {
          await firebaseSignOut(auth);
          clearSession();
          setLoading(false);
          return;
        }
        applySession(user, profile);
      } catch (err) {
        console.warn('Profile resolution warning:', err);
        await firebaseSignOut(auth).catch(() => undefined);
        clearSession();
      }
    },
    [applySession, clearSession, resolveProfile]
  );

  const syncGoogleStaffProfile = useCallback(
    async (authUser: FirebaseUser) => {
      try {
        if (!authUser.emailVerified) {
          await sendEmailVerification(authUser);
          throw new Error('Your email is not verified. We sent a confirmation link; open it before signing in again.');
        }

        const profile = await resolveProfile(authUser);
        const blocked = suspendedMessage(profile);
        if (blocked) throw new Error(blocked);
        applySession(authUser, profile);
        return profile;
      } catch (err) {
        // A Google sign-in that cannot be given a usable profile must not leave
        // the browser authenticated.
        await firebaseSignOut(auth).catch(() => undefined);
        clearSession();
        throw err;
      }
    },
    [applySession, clearSession, resolveProfile]
  );

  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          await syncGoogleStaffProfile(result.user);
        }
      } catch (err) {
        console.warn('Google redirect result sync warning:', err);
      }
    };
    void handleRedirectResult();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Creating a staff account temporarily signs the browser in as that new
      // staff member. Reacting to that would provision a duplicate record and
      // eject the admin from the admin area, so the event is dropped and
      // re-read once the pause ends.
      if (isAuthObserverPaused()) {
        pendingResyncRef.current = true;
        return;
      }

      try {
        if (user) {
          await fetchProfile(user);
        } else {
          clearSession();
        }
      } finally {
        // Always clear loading, even if profile resolution threw: leaving it
        // true pins the whole app to its loading screen.
        setLoading(false);
      }
    });

    const unsubscribeResume = onAuthObserverResumed(() => {
      if (!pendingResyncRef.current) return;
      pendingResyncRef.current = false;

      void (async () => {
        try {
          const current = auth.currentUser;
          if (current) {
            await fetchProfile(current);
          } else {
            clearSession();
          }
        } catch {
          clearSession();
        } finally {
          setLoading(false);
        }
      })();
    });

    return () => {
      unsubscribeResume();
      unsubscribe();
    };
  }, [clearSession, fetchProfile, syncGoogleStaffProfile]);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    const normalizedEmail = normalizeEmail(email);
    let signedIn = false;

    try {
      if (!normalizedEmail) throw new Error('Enter your email address.');
      if (!pass) throw new Error('Enter your password.');

      await runWithAuthObserverPaused(async () => {
        try {
          const cred = await withTimeout(
            signInWithEmailAndPassword(auth, normalizedEmail, pass),
            'Sign-in timed out. Check your internet connection and Firebase Authentication settings.'
          );
          signedIn = true;

          const profile = await withTimeout(
            (async () => {
              const found = await getUserProfile(cred.user.uid);
              if (needsStaffEmailVerification(cred.user, found)) {
                try {
                  await sendEmailVerification(cred.user);
                } catch (err) {
                  throw new Error(toFriendlyError(err, 'Could not send a verification email. Please try again later.'));
                }
                throw new Error(`Email verification required: we sent a confirmation link to ${normalizedEmail}. Open it, then sign in again.`);
              }
              return found ?? resolveProfile(cred.user);
            })(),
            'Unable to load your profile. Check your internet connection and the Realtime Database.'
          );

          const blocked = suspendedMessage(profile);
          if (blocked) throw new Error(blocked);

          applySession(cred.user, profile);
        } catch (err) {
          if (signedIn) {
            await firebaseSignOut(auth).catch(() => undefined);
            signedIn = false;
            clearSession();
          }
          throw err;
        }
      });
    } catch (err) {
      // Never leave a half-authorised session behind: a revoked, suspended or
      // otherwise unusable account must end up signed out.
      if (signedIn) {
        await firebaseSignOut(auth).catch(() => undefined);
        clearSession();
      }
      if (err instanceof Error && err.message) throw err;
      throw new Error(toFriendlyError(err, 'Failed to sign in. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const registerAdmin = async (name: string, email: string, pass: string, dept: string, adminPasscode: string) => {
    setLoading(true);
    const normalizedEmail = normalizeEmail(email);

    try {
      if (!name.trim()) throw new Error("Enter the administrator's full name.");
      const passwordError = validatePassword(pass);
      if (passwordError) throw new Error(passwordError);
      if (!normalizedEmail) throw new Error('Enter a valid email address.');

      // The passcode gates admin creation. It is checked before the sign-in
      // account exists, so a wrong guess leaves nothing behind. The database
      // rules hold the expected hash, so the app never contains the passcode and
      // never learns whether a guess was close.
      const passcodeError = validateAdminPasscode(adminPasscode);
      if (passcodeError) throw new Error(passcodeError);
      if (!(await verifyAdminPasscode(adminPasscode))) {
        throw new Error('That administrator passcode is not correct.');
      }

      const existing = await findAccountByEmail(normalizedEmail);
      if (existing) {
        throw new Error(`An account already exists for ${normalizedEmail}. Sign in instead.`);
      }

      await runWithAuthObserverPaused(async () => {
        const cred = await withTimeout(
          createUserWithEmailAndPassword(auth, normalizedEmail, pass),
          'Registration timed out. Check your internet connection and Firebase Authentication settings.'
        );

        try {
          const profile = await withTimeout(
            createAdminProfile({
              uid: cred.user.uid,
              name: name.trim(),
              email: normalizedEmail,
              department: dept.trim() || DEFAULT_DEPARTMENT,
              // The proof the rules require to create an admin record. It is a
              // one-way hash, so it is safe to store on the profile.
              adminPasscodeProof: await hashPasscode(adminPasscode)
            }),
            'The sign-in account was created but the admin profile could not be saved. Check the Realtime Database.'
          );
          applySession(cred.user, profile);
        } catch (err) {
          // Delete the orphaned sign-in account so the email is not left claimed
          // and this person can simply register again.
          await discardOrphanedAccount(cred.user);
          clearSession();
          throw new Error(
            toFriendlyError(
              err,
              'Your sign-in account could not be completed, so it was removed. Please try again.'
            )
          );
        }
      });
    } catch (err) {
      if (err instanceof Error && err.message) throw err;
      throw new Error(toFriendlyError(err, 'Failed to create the admin account.'));
    } finally {
      setLoading(false);
    }
  };

  const registerStaff = async (
    name: string,
    staffId: string,
    email: string,
    pass: string,
    dept: string,
    designation: string
  ) => {
    setLoading(true);
    const normalizedEmail = normalizeEmail(email);
    const normalizedStaffId = (staffId || '').trim();

    try {
      if (!name.trim()) throw new Error('Enter your full name.');
      if (!normalizedStaffId) throw new Error('Enter your staff ID.');
      const passwordError = validatePassword(pass);
      if (passwordError) throw new Error(passwordError);
      if (!normalizedEmail) throw new Error('Enter a valid email address.');

      if (await isEmailTaken(normalizedEmail)) {
        throw new Error(`An account already exists for ${normalizedEmail}. Sign in instead.`);
      }
      if (await isStaffIdTaken(normalizedStaffId)) {
        throw new Error(`Staff ID "${normalizedStaffId}" is already in use.`);
      }

      await runWithAuthObserverPaused(async () => {
        const cred = await withTimeout(
          createUserWithEmailAndPassword(auth, normalizedEmail, pass),
          'Registration timed out. Check your internet connection and Firebase Authentication settings.'
        );

        try {
          await withTimeout(
            sendEmailVerification(cred.user),
            'The account was created, but the confirmation email could not be sent. Check Firebase Authentication email templates and try again.'
          );

          await withTimeout(
            createStaffProfile({
              uid: cred.user.uid,
              staffId: normalizedStaffId,
              name: name.trim(),
              email: normalizedEmail,
              department: dept.trim() || DEFAULT_DEPARTMENT,
              designation: designation.trim() || DEFAULT_DESIGNATION,
              status: 'active'
            }),
            'Your account was created, but the staff profile could not be saved. Check your internet connection and the Realtime Database.'
          );
        } catch (err) {
          await discardOrphanedAccount(cred.user);
          clearSession();
          throw new Error(
            toFriendlyError(
              err,
              'Your sign-in account was created but the staff profile could not be saved. Sign in again to complete setup.'
            )
          );
        }

        await firebaseSignOut(auth).catch(() => undefined);
        clearSession();
      });
    } catch (err) {
      if (err instanceof Error && err.message) throw err;
      throw new Error(toFriendlyError(err, 'Failed to create the staff account.'));
    } finally {
      setLoading(false);
    }
  };

  // Memoized: the reset-password page runs verifyResetCode inside a useEffect
  // keyed on it, so a new function identity on every render would re-verify the
  // link (and re-issue network calls) continuously.
  const resetPassword = useCallback(async (email: string) => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) throw new Error('Enter your email address.');

    const existingAccount = await findAccountByEmail(normalizedEmail);
    if (!existingAccount) {
      throw new Error(
        'No staff or admin account was found for this email address. Create an account first, or ask your administrator to check the address.'
      );
    }

    try {
      await sendPasswordResetEmail(auth, normalizedEmail, {
        url: `${window.location.origin}/reset-password`,
        handleCodeInApp: true
      });
    } catch (err) {
      throw new Error(toFriendlyError(err, 'Could not send the password reset email.'));
    }
  }, []);

  const confirmResetPassword = useCallback(async (oobCode: string, newPassword: string) => {
    const passwordError = validatePassword(newPassword);
    if (passwordError) throw new Error(passwordError);

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
    }

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
    } catch (err) {
      throw new Error(
        toFriendlyError(err, 'Failed to reset your password. Please request a new link.')
      );
    }
  }, []);

  const verifyResetCode = useCallback(async (oobCode: string) => {
    try {
      return await verifyPasswordResetCode(auth, oobCode);
    } catch (err) {
      throw new Error(
        toFriendlyError(err, 'This password reset link is invalid or has expired.')
      );
    }
  }, []);

  const continueWithGoogle = async () => {
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const params: Record<string, string> = { prompt: 'select_account' };
      if (googleOAuthClientId) params.client_id = googleOAuthClientId;
      provider.setCustomParameters(params);

      try {
        const result = await signInWithPopup(auth, provider);
        await syncGoogleStaffProfile(result.user);
      } catch (popupErr: any) {
        const code = popupErr?.code as string | undefined;
        if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
          await signInWithRedirect(auth, provider);
          return;
        }
        throw popupErr;
      }
    } catch (err: unknown) {
      const code = (err as { code?: string } | null)?.code;
      if (typeof code !== 'string' && err instanceof Error && err.message) throw err;
      throw new Error(
        toFriendlyError(err, 'Google sign-in could not be completed. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = useCallback(async () => {
    if (auth.currentUser) {
      await fetchProfile(auth.currentUser);
    }
  }, [fetchProfile]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        role,
        loading,
        login,
        registerAdmin,
        registerStaff,
        logout,
        resetPassword,
        confirmResetPassword,
        verifyResetCode,
        continueWithGoogle,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
