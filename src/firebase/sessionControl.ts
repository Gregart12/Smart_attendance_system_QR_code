/**
 * Guards the window in which an administrator's browser is temporarily signed
 * in as a different user.
 *
 * Creating a staff sign-in account from the admin's browser calls
 * `createUserWithEmailAndPassword`, which swaps the active Firebase session to
 * the new staff member. Without a pause, the `onAuthStateChanged` observer in
 * AuthProvider would react to that swap by provisioning a second, incomplete
 * staff record and rendering the admin as a staff member - bouncing them out of
 * the admin area mid-task.
 *
 * The flag is deliberately module-level rather than React state: the observer
 * and the account-creation helper are in different modules, and the pause must
 * apply to the observer callback that is already in flight.
 */
let paused = false;
let pauseDepth = 0;
const resumeListeners = new Set<() => void>();

export function isAuthObserverPaused(): boolean {
  return paused;
}

/**
 * Subscribes to the moment observation resumes. Firebase does not re-emit the
 * auth state after a pause, so anything dropped while paused has to be re-read
 * explicitly or the app stays stuck on its initial loading state.
 */
export function onAuthObserverResumed(listener: () => void): () => void {
  resumeListeners.add(listener);
  return () => {
    resumeListeners.delete(listener);
  };
}

/**
 * Runs `task` while auth-state observation is suspended. Nested calls are
 * reference-counted, so an inner pause cannot un-pause an outer one.
 */
export async function runWithAuthObserverPaused<T>(task: () => Promise<T>): Promise<T> {
  pauseDepth += 1;
  paused = true;
  try {
    return await task();
  } finally {
    pauseDepth = Math.max(0, pauseDepth - 1);
    paused = pauseDepth > 0;
    if (!paused) {
      for (const listener of resumeListeners) {
        try {
          listener();
        } catch {
          // A listener must never break the task that just finished.
        }
      }
    }
  }
}
