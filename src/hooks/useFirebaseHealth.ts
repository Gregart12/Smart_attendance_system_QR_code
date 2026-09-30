import { useEffect, useRef, useState } from 'react';
import { get, ref } from 'firebase/database';
import { db } from '../firebase/config';

export type FirebaseHealth = {
  checking: boolean;
  problem: string | null;
  retry: () => void;
};

/**
 * Probes the backend once so a misconfigured project fails loudly.
 *
 * The probe reads a random key under /accountEmails. That branch of the rules is
 * the one path a signed-out visitor is allowed to read (a specific, non-existent
 * email resolves to null). Reading the parent folder is denied, but reading a
 * made-up child is allowed, which makes the failure modes distinguishable:
 *
 *   resolves to null  -> database exists and the rules are deployed
 *   PERMISSION_DENIED -> database exists, but database.rules.json is not
 *                        published yet (default deny-all rules take over)
 *   anything else     -> the database itself has not been created
 *
 * Without this check a project with no database looks like a dead app: every
 * register and sign-in attempt throws and the login pages just sit there.
 */
export function useFirebaseHealth(): FirebaseHealth {
  const [checking, setChecking] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setChecking(true);
    setProblem(null);

    // A hung network must not hold the check open forever.
    const timer = window.setTimeout(() => {
      if (cancelled || !mountedRef.current) return;
      setChecking(false);
      setProblem('Timed out contacting Firebase. Check your internet connection, then use "Check again".');
    }, 12000);

    void (async () => {
      try {
        // A random key can never exist, so a rules-enabled profile answers null,
        // while deny-all rules answer PERMISSION_DENIED. Both are reliable.
        const probeKey = `__health__${Date.now()}_${Math.random().toString(36).slice(2)}`;
        await get(ref(db, `accountEmails/${probeKey}`));
        if (!cancelled && mountedRef.current) setProblem(null);
      } catch (err) {
        if (cancelled || !mountedRef.current) return;
        setProblem(describe(err));
      } finally {
        window.clearTimeout(timer);
        if (!cancelled && mountedRef.current) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [nonce]);

  return { checking, problem, retry: () => setNonce((n) => n + 1) };
}

function describe(err: unknown): string {
  const code = (err as { code?: string } | null)?.code ?? '';
  const message = (err as { message?: string } | null)?.message ?? '';

  if (code === 'PERMISSION_DENIED' || /permission denied/i.test(message)) {
    return (
      'The Realtime Database exists but its security rules have not been published. ' +
      'Run "firebase deploy --only database" (or paste database.rules.json into the ' +
      'Realtime Database rules tab in the Firebase console), then use "Check again".'
    );
  }

  if (/does not exist|404|not found/i.test(message) || code === 'INVALID_DATABASE_URL' || code === 'INVALID_REFERENCE') {
    return (
      'The Realtime Database has not been created for this project yet. In the Firebase ' +
      'console open Realtime Database, click "Create database", choose a region, and start ' +
      'in locked mode. Then use "Check again".'
    );
  }

  return `Could not reach the Firebase Realtime Database (${code || 'unknown error'}). Check your internet connection, then use "Check again".`;
}
