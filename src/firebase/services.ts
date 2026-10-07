import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot
} from './rtdb';
import { ref as dbRef, runTransaction } from 'firebase/database';
import { db, auth } from './config';
import {
  UserProfile,
  StaffProfile,
  UserRole,
  AttendanceSession,
  AttendanceRecord,
  SystemNotification,
  AuditLog,
  SystemSettings
} from '../types';
import { normalizeEmail } from './errors';
import { DEFAULT_IT_DEPT_GEO } from '../utils/haversine';
import { getDateKey } from '../utils/dateUtils';

// ================= ADMIN & STAFF PROFILES =================

export async function getUserProfile(uid: string): Promise<UserProfile | StaffProfile | null> {
  try {
    const adminRef = doc(db, 'admins', uid);
    const adminSnap = await getDoc(adminRef);
    if (adminSnap.exists()) {
      return adminSnap.data() as UserProfile;
    }

    const staffRef = doc(db, 'staff', uid);
    const staffSnap = await getDoc(staffRef);
    if (staffSnap.exists()) {
      return staffSnap.data() as StaffProfile;
    }

    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

export interface AccountRef {
  uid: string;
  role: UserRole;
}

/**
 * Email -> account lookup that does not expose the staff directory.
 *
 * The sign-up and password-reset flows need to know whether an email is already
 * registered while the visitor is signed out. Querying /staff or /admins for that
 * would publish the whole directory, so a small index collection is used instead
 * and only holds the uid and role for one specific email.
 */
export async function findAccountByEmail(email: string): Promise<AccountRef | null> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  try {
    const snap = await getDoc(doc(db, 'accountEmails', normalizedEmail));
    if (snap.exists()) {
      const data = snap.data() as { uid?: string; role?: UserRole };
      if (data.uid && (data.role === 'admin' || data.role === 'staff')) {
        return { uid: data.uid, role: data.role };
      }
    }
  } catch (error) {
    console.error('Error reading account email index:', error);
    return null;
  }

  // Fallback for accounts created before the index existed. Only an
  // already-authenticated admin may read the directory, so this adds no
  // anonymous exposure.
  if (!(await isCurrentUserAdmin())) return null;

  try {
    const staffSnap = await getDocs(query(collection(db, 'staff'), where('email', '==', normalizedEmail)));
    if (!staffSnap.empty) return { uid: staffSnap.docs[0].id, role: 'staff' };

    const adminSnap = await getDocs(query(collection(db, 'admins'), where('email', '==', normalizedEmail)));
    if (!adminSnap.empty) return { uid: adminSnap.docs[0].id, role: 'admin' };
  } catch (error) {
    console.error('Error backfilling account email index:', error);
  }

  return null;
}

export async function isEmailTaken(email: string, exceptUid?: string): Promise<boolean> {
  const account = await findAccountByEmail(email);
  if (!account) return false;
  return account.uid !== exceptUid;
}

export async function isStaffIdTaken(staffId: string, exceptUid?: string): Promise<boolean> {
  const normalized = (staffId || '').trim();
  if (!normalized) return false;

  try {
    const snap = await getDoc(doc(db, 'staffIds', normalized));
    if (snap.exists()) {
      const owner = (snap.data() as { uid?: string }).uid;
      if (owner) return owner !== exceptUid;
    }
  } catch (error) {
    console.error('Error reading staff ID index:', error);
    return false;
  }

  // Fallback for records created before the index existed. Only an
  // already-authenticated admin may query the directory, so this adds no
  // anonymous exposure.
  if (!(await isCurrentUserAdmin())) return false;

  try {
    const snap = await getDocs(query(collection(db, 'staff'), where('staffId', '==', normalized)));
    return snap.docs.some((entry) => entry.id !== exceptUid);
  } catch (error) {
    console.error('Error backfilling staff ID index:', error);
    return false;
  }
}

/** Keeps the staff ID index in step with staff records. */
export async function indexStaffId(staffId: string, uid: string, previousStaffId?: string) {
  const normalized = (staffId || '').trim();
  if (!normalized) return;
  try {
    await setDoc(doc(db, 'staffIds', normalized), { uid, indexedAt: new Date().toISOString() });
    const previous = (previousStaffId || '').trim();
    if (previous && previous !== normalized) {
      await deleteDoc(doc(db, 'staffIds', previous));
    }
  } catch (err) {
    console.warn('Could not update staff ID index:', err);
  }
}

export async function removeStaffIdIndex(staffId: string, uid: string) {
  const normalized = (staffId || '').trim();
  if (!normalized) return;
  try {
    const ref = doc(db, 'staffIds', normalized);
    const snap = await getDoc(ref);
    if (snap.exists() && (snap.data() as { uid?: string }).uid === uid) {
      await deleteDoc(ref);
    }
  } catch (err) {
    console.warn('Could not remove staff ID index:', err);
  }
}

/**
 * Finds a staff ID that is not already claimed. Auto-provisioned profiles used a
 * bare Math.random() 3-digit suffix, which both collides quickly and silently
 * overwrote another member's index entry.
 */
export async function generateUniqueStaffId(): Promise<string> {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 30; attempt++) {
    const candidate = `IT/${year}/${Math.floor(1000 + Math.random() * 9000)}`;
    if (!(await isStaffIdTaken(candidate))) return candidate;
  }
  // Fall back to something guaranteed distinct rather than a duplicate.
  return `IT/${year}/${Date.now().toString().slice(-6)}`;
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  try {
    return (await getDoc(doc(db, 'admins', user.uid))).exists();
  } catch {
    return false;
  }
}

export async function isAccountRevoked(uid: string): Promise<boolean> {
  try {
    return (await getDoc(doc(db, 'revokedUsers', uid))).exists();
  } catch {
    return false;
  }
}

/** Keeps the email index in step with account creation and role changes. */
export async function indexAccountEmail(email: string, uid: string, role: UserRole) {
  try {
    await setDoc(doc(db, 'accountEmails', normalizeEmail(email)), {
      uid,
      role,
      indexedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Could not update account email index:', err);
  }
}

export async function removeAccountEmailIndex(email: string, uid: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return;
  try {
    const ref = doc(db, 'accountEmails', normalized);
    const snap = await getDoc(ref);
    if (snap.exists() && (snap.data() as { uid?: string }).uid === uid) {
      await deleteDoc(ref);
    }
  } catch (err) {
    console.warn('Could not remove account email index:', err);
  }
}

// ================= ADMIN PROFILES =================
// Administrator accounts are created by anyone who knows the admin passcode.
// The passcode is hashed in the browser and only the hash is sent; the expected
// hash lives in database.rules.json, so database.rules.json is what enforces the
// gate. Any number of administrators may be created, and a staff account can
// never promote itself because the proof is required on every create.

export async function createAdminProfile(
  adminData: Omit<UserProfile, 'role'> & { role?: 'admin'; adminPasscodeProof: string }
) {
  const email = normalizeEmail(adminData.email);
  const profile: UserProfile & { adminPasscodeProof: string } = {
    ...adminData,
    email,
    role: 'admin',
    createdAt: new Date().toISOString()
  };
  await setDoc(doc(db, 'admins', adminData.uid), profile);
  void indexAccountEmail(email, adminData.uid, 'admin');
  void addAuditLog('ADMIN_REGISTERED', email, `Created new admin account: ${adminData.name}`);
  return profile;
}

export async function updateAdminProfile(uid: string, updates: Pick<UserProfile, 'name' | 'department' | 'phone' | 'photoUrl' | 'accountTitle'>) {
  await updateDoc(doc(db, 'admins', uid), {
    name: updates.name.trim(),
    department: updates.department.trim(),
    phone: updates.phone?.trim() || '',
    photoUrl: updates.photoUrl || '',
    accountTitle: updates.accountTitle?.trim() || 'HOD / Director'
  });
}

/** Grants admin rights to an existing account. Admin-only (enforced by rules). */
export async function promoteStaffToAdmin(uid: string, email: string, name: string, department: string) {
  const profile: UserProfile = {
    uid,
    email: normalizeEmail(email),
    name,
    role: 'admin',
    department: department || 'Directorate of Information Technology',
    createdAt: new Date().toISOString()
  };
  await setDoc(doc(db, 'admins', uid), profile);
  await deleteDoc(doc(db, 'staff', uid));
  await indexAccountEmail(email, uid, 'admin');
  await addAuditLog('ADMIN_PROMOTED', normalizeEmail(email), `Promoted ${name} to administrator`);
  return profile;
}

export async function createStaffProfile(staffData: Omit<StaffProfile, 'role'> & { role?: 'staff' }) {
  const email = normalizeEmail(staffData.email);
  const profile: StaffProfile = {
    ...staffData,
    email,
    staffId: (staffData.staffId || '').trim(),
    role: 'staff',
    staffCategory: staffData.staffCategory || 'academic',
    status: staffData.status || 'active',
    attendanceStreak: 0,
    totalPresent: 0,
    totalSessions: 0,
    createdAt: new Date().toISOString()
  };
  await setDoc(doc(db, 'staff', staffData.uid), profile);
  void indexAccountEmail(email, staffData.uid, 'staff');
  void indexStaffId(profile.staffId, staffData.uid);
  void addAuditLog('STAFF_CREATED', 'Admin', `Created staff record for ${staffData.name} (${staffData.staffId})`);
  return profile;
}

export async function updateStaffProfile(uid: string, updates: Partial<StaffProfile>) {
  // uid and role are never editable through this path - role changes go through
  // promoteStaffToAdmin so that a staff record cannot self-escalate.
  const { uid: _uid, role: _role, ...safeUpdates } = updates;

  if (safeUpdates.email) safeUpdates.email = normalizeEmail(safeUpdates.email);
  if (safeUpdates.staffId) safeUpdates.staffId = safeUpdates.staffId.trim();

  const staffRef = doc(db, 'staff', uid);
  const previous = await getDoc(staffRef);
  const previousProfile = previous.data() as StaffProfile | undefined;
  const previousStaffId = previousProfile?.staffId;
  const previousEmail = previousProfile?.email;

  if (safeUpdates.email && (await isEmailTaken(safeUpdates.email, uid))) {
    throw new Error(`An account already exists for ${safeUpdates.email}. Use a different email address.`);
  }
  if (safeUpdates.staffId && (await isStaffIdTaken(safeUpdates.staffId, uid))) {
    throw new Error(`Staff ID "${safeUpdates.staffId}" is already in use.`);
  }

  await updateDoc(staffRef, safeUpdates);

  if (safeUpdates.email) {
    if (previousEmail && previousEmail !== safeUpdates.email) {
      await removeAccountEmailIndex(previousEmail, uid);
    }
    void indexAccountEmail(safeUpdates.email, uid, 'staff');
  }
  if (safeUpdates.staffId) {
    if (previousStaffId && previousStaffId !== safeUpdates.staffId) {
      await removeStaffIdIndex(previousStaffId, uid);
    }
    void indexStaffId(safeUpdates.staffId, uid, previousStaffId);
  }

  await addAuditLog('STAFF_UPDATED', 'Admin', `Updated profile for staff UID: ${uid}`);
}

/**
 * Removes a staff record and blocks the account from ever being re-provisioned
 * automatically on sign-in. The Firebase Auth user itself must be deleted in the
 * Firebase console (the client SDK cannot delete other users).
 */
export async function revokeStaffAccount(uid: string, email: string, name: string) {
  const staffSnap = await getDoc(doc(db, 'staff', uid));
  const staffId = (staffSnap.data() as StaffProfile | undefined)?.staffId;

  await setDoc(doc(db, 'revokedUsers', uid), {
    uid,
    email: normalizeEmail(email),
    name,
    revokedAt: new Date().toISOString()
  });
  await deleteDoc(doc(db, 'staff', uid));

  if (staffId) {
    try {
      await deleteDoc(doc(db, 'staffIds', staffId));
    } catch (err) {
      console.warn('Could not clear staff ID index:', err);
    }
  }

  await addAuditLog('STAFF_DELETED', 'Admin', `Revoked staff account UID: ${uid} (${email})`);
}

export async function getAllStaff(): Promise<StaffProfile[]> {
  try {
    const querySnap = await getDocs(collection(db, 'staff'));
    const list: StaffProfile[] = [];
    querySnap.forEach((doc) => list.push(doc.data() as StaffProfile));
    return list;
  } catch (error) {
    console.error('Error getting all staff:', error);
    return [];
  }
}

export function subscribeToStaff(callback: (staff: StaffProfile[]) => void) {
  return onSnapshot(collection(db, 'staff'), (snapshot) => {
    const list: StaffProfile[] = [];
    snapshot.forEach((doc) => list.push(doc.data() as StaffProfile));
    callback(list);
  }, (err) => {
    console.warn('Realtime Database subscribe error on staff:', err);
  });
}

// ================= ATTENDANCE SESSIONS =================

export async function createAttendanceSession(sessionData: Omit<AttendanceSession, 'id' | 'createdAt' | 'createdByUid'>): Promise<string> {
  const newRef = doc(collection(db, 'attendanceSessions'));
  const id = newRef.id;

  const session: AttendanceSession = {
    ...sessionData,
    id,
    createdAt: new Date().toISOString(),
    // Stamped from the signed-in admin rather than trusted from the caller, so
    // database.rules.json can assert ownership of the session.
    createdByUid: auth.currentUser?.uid ?? '',
    status: 'active',
    // The QR token is deliberately NOT persisted. Session documents are
    // readable by every signed-in staff member, so storing the token there
    // would let anyone copy it and forge a valid-looking payload. The token
    // only ever exists inside the rendered QR image.
    sessionToken: ''
  };

  if (!session.createdByUid) {
    throw new Error('You must be signed in as an administrator to create an attendance session.');
  }

  await setDoc(newRef, session);
  await addAuditLog('QR_SESSION_CREATED', sessionData.createdBy, `Created attendance session: "${sessionData.title}" for ${sessionData.department}`);
  return id;
}

/**
 * Fetches the authoritative session document for a scanned QR payload.
 * Returns null when the session does not exist, so a hand-crafted payload
 * pointing at a non-existent session cannot produce an attendance record.
 */
export async function getAttendanceSessionForScan(sessionId: string): Promise<AttendanceSession | null> {
  try {
    const ref = doc(db, 'attendanceSessions', sessionId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as AttendanceSession;
  } catch (err) {
    console.warn('Session lookup error:', err);
    return null;
  }
}

export async function closeAttendanceSession(sessionId: string) {
  const ref = doc(db, 'attendanceSessions', sessionId);
  await updateDoc(ref, { status: 'closed' });
  await addAuditLog('QR_SESSION_CLOSED', 'Admin', `Closed session ID: ${sessionId}`);
}

export async function deleteAttendanceSession(sessionId: string) {
  await deleteDoc(doc(db, 'attendanceSessions', sessionId));
  await addAuditLog('QR_SESSION_DELETED', 'Admin', `Deleted session ID: ${sessionId}`);
}

/**
 * Streams only the sessions that are still usable: status is "active" and the
 * expiry is in the future. Closed/expired sessions are excluded so consumers
 * do not have to re-derive liveness from timestamps on every render.
 */
export function subscribeToActiveSessions(callback: (sessions: AttendanceSession[]) => void) {
  return onSnapshot(collection(db, 'attendanceSessions'), (snapshot) => {
    const list: AttendanceSession[] = [];
    const now = Date.now();
    snapshot.forEach((doc) => {
      const data = doc.data() as AttendanceSession;
      if (data.status !== 'active') return;
      if (typeof data.expiresAt !== 'number' || now > data.expiresAt) return;
      list.push(data);
    });
    callback(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, (err) => {
    console.warn('Realtime Database active sessions error:', err);
  });
}

export function subscribeToAttendanceSessions(callback: (sessions: AttendanceSession[]) => void) {
  return onSnapshot(collection(db, 'attendanceSessions'), (snapshot) => {
    const list = snapshot.docs.map((sessionDoc) => sessionDoc.data() as AttendanceSession);
    callback(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, (err) => {
    console.warn('Realtime Database attendance sessions error:', err);
  });
}

// ================= ATTENDANCE RECORDS =================

export async function recordAttendance(recordData: Omit<AttendanceRecord, 'id' | 'scannedAt'>): Promise<string> {
  const newRef = doc(collection(db, 'attendanceRecords'));
  const id = newRef.id;

  const record: AttendanceRecord = {
    ...recordData,
    id,
    scannedAt: new Date().toISOString()
  };

  await setDoc(newRef, record);

  // Update staff stats. These counters must not be able to fail the scan itself,
  // so every write is guarded.
  try {
    // Counters are a read-modify-write, so they run inside a transaction: two
    // scans landing in the same instant must not both persist the same total.
    const staffRef = doc(db, 'staff', recordData.staffUid);
    await runTransaction(dbRef(db, staffRef.path), (current) => {
      if (!current) return undefined;
      const profile = current as Partial<StaffProfile>;
      return {
        ...profile,
        // Only an on-time scan counts towards the punctuality numerator; a late
        // scan is still a session attended, so totalSessions always moves.
        totalPresent: (profile.totalPresent || 0) + (recordData.status === 'present' ? 1 : 0),
        totalSessions: (profile.totalSessions || 0) + 1
      };
    });
  } catch (err) {
    console.warn('Failed updating staff punctuality stats:', err);
  }

  try {
    await recomputeAttendanceStreak(recordData.staffUid);
  } catch (err) {
    console.warn('Failed recomputing attendance streak:', err);
  }

  await addAuditLog(
    'ATTENDANCE_SCANNED',
    recordData.staffName,
    `Marked ${recordData.status.toUpperCase()} for session "${recordData.sessionTitle}" (${recordData.distanceFromCenterMeters}m from session center)`
  );

  return id;
}

/**
 * A streak is consecutive calendar days with at least one scan, so it has to be
 * derived from the records. Incrementing it on every scan produced a number that
 * only ever grew and never reflected an actual streak.
 */
export async function recomputeAttendanceStreak(staffUid: string): Promise<number> {
  const q = query(
    collection(db, 'attendanceRecords'),
    where('staffUid', '==', staffUid)
  );
  const snap = await getDocs(q);

  const dates = new Set<string>();
  snap.forEach((d) => {
    const value = d.data().date as string | undefined;
    if (typeof value === 'string') dates.add(value);
  });

  let streak = 0;
  const cursor = new Date();
  while (dates.has(getDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const staffRef = doc(db, 'staff', staffUid);
  const staffSnap = await getDoc(staffRef);
  if (staffSnap.exists()) {
    await updateDoc(staffRef, { attendanceStreak: streak });
  }

  return streak;
}

export async function checkExistingAttendance(sessionId: string, staffUid: string): Promise<boolean> {  try {
    const q = query(
      collection(db, 'attendanceRecords'),
      where('sessionId', '==', sessionId),
      where('staffUid', '==', staffUid)
    );
    const snap = await getDocs(q);
    return !snap.empty;
  } catch {
    return false;
  }
}

export function subscribeToAttendanceRecords(callback: (records: AttendanceRecord[]) => void) {
  return onSnapshot(collection(db, 'attendanceRecords'), (snapshot) => {
    const list: AttendanceRecord[] = [];
    snapshot.forEach((doc) => list.push(doc.data() as AttendanceRecord));
    callback(list.sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()));
  }, (err) => {
    console.warn('Realtime Database attendance records error:', err);
  });
}

// ================= NOTIFICATIONS & ANNOUNCEMENTS =================

export async function createNotification(notifData: Omit<SystemNotification, 'id' | 'createdAt'>) {
  const newRef = doc(collection(db, 'notifications'));
  const notif: SystemNotification = {
    ...notifData,
    id: newRef.id,
    createdAt: new Date().toISOString()
  };
  await setDoc(newRef, notif);
}

export function subscribeToNotifications(callback: (notifications: SystemNotification[]) => void) {
  return onSnapshot(collection(db, 'notifications'), (snapshot) => {
    const list: SystemNotification[] = [];
    snapshot.forEach((doc) => list.push(doc.data() as SystemNotification));
    callback(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, (err) => {
    console.warn('Realtime Database notifications error:', err);
  });
}

// ================= AUDIT LOGS =================

export async function addAuditLog(action: string, performedBy: string, details: string) {
  try {
    const newRef = doc(collection(db, 'logs'));
    const log: AuditLog = {
      id: newRef.id,
      action,
      performedBy,
      details,
      timestamp: new Date().toISOString()
    };
    await setDoc(newRef, log);
  } catch (err) {
    console.warn('Audit log write error:', err);
  }
}

export function subscribeToAuditLogs(callback: (logs: AuditLog[]) => void) {
  return onSnapshot(collection(db, 'logs'), (snapshot) => {
    const list: AuditLog[] = [];
    snapshot.forEach((doc) => list.push(doc.data() as AuditLog));
    callback(list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  }, (err) => {
    console.warn('Realtime Database audit logs error:', err);
  });
}

// ================= SETTINGS =================

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  defaultLat: DEFAULT_IT_DEPT_GEO.latitude,
  defaultLng: DEFAULT_IT_DEPT_GEO.longitude,
  defaultRadius: DEFAULT_IT_DEPT_GEO.radiusMeters,
  departmentName: 'Department of Information Technology',
  buildingName: DEFAULT_IT_DEPT_GEO.buildingName
};

export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const ref = doc(db, 'settings', 'global');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      // Merge over the defaults: a document written by an older build (or
      // partially written) must not leave fields undefined, which would turn
      // controlled inputs in the admin UI into uncontrolled ones.
      return { ...DEFAULT_SYSTEM_SETTINGS, ...snap.data() } as SystemSettings;
    }
  } catch (err) {
    console.warn('Settings load error:', err);
  }
  return { ...DEFAULT_SYSTEM_SETTINGS };
}

export function subscribeToSystemSettings(
  callback: (settings: SystemSettings) => void
): () => void {
  return onSnapshot(
    doc(db, 'settings', 'global'),
    (snap) => {
      callback({ ...DEFAULT_SYSTEM_SETTINGS, ...(snap.exists() ? snap.data() : {}) } as SystemSettings);
    },
    (err) => {
      console.warn('Settings subscribe error:', err);
      callback({ ...DEFAULT_SYSTEM_SETTINGS });
    }
  );
}

export async function saveSystemSettings(settings: SystemSettings) {
  const ref = doc(db, 'settings', 'global');
  await setDoc(ref, {
    ...settings,
    updatedAt: new Date().toISOString()
  });
  await addAuditLog('SETTINGS_UPDATED', 'Admin', 'Updated global geofence and department settings');
}
