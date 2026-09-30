export type UserRole = 'admin' | 'staff';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  department: string;
  createdAt?: string;
  phone?: string;
  photoUrl?: string;
  accountTitle?: string;
}

export interface StaffProfile extends UserProfile {
  staffId: string;
  designation: string;
  staffCategory?: 'academic' | 'non-academic';
  status: 'active' | 'suspended' | 'inactive';
  photoUrl?: string;
  attendanceStreak?: number;
  totalPresent?: number;
  totalSessions?: number;
}

export interface AttendanceSession {
  id: string;
  title: string;
  department: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  buildingName: string;
  sessionToken: string;
  expiresAt: number; // timestamp in ms
  createdAt: string;
  createdBy: string; // display name of the administrator who created it
  createdByUid?: string; // auth uid, asserted by database.rules.json
  status: 'active' | 'closed' | 'expired';
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  sessionTitle: string;
  staffUid: string;
  staffId: string;
  staffName: string;
  department: string;
  date: string;
  time: string;
  latitude: number;
  longitude: number;
  distanceFromCenterMeters: number;
  status: 'present' | 'late' | 'absent';
  deviceInfo: string;
  scannedAt: string;
  notes?: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  targetDepartment?: string;
  createdAt: string;
  createdBy: string;
}

export interface AuditLog {
  id: string;
  action: string;
  performedBy: string;
  details: string;
  timestamp: string;
}

export interface SystemSettings {
  defaultLat: number;
  defaultLng: number;
  defaultRadius: number;
  departmentName: string;
  buildingName: string;
  updatedAt?: string;
}

export interface GeoLocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}
