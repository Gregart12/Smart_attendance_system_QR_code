import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToAttendanceRecords, subscribeToActiveSessions } from '../../firebase/services';
import { AttendanceRecord, AttendanceSession } from '../../types';
import { getCurrentDateFormatted } from '../../utils/dateUtils';
import { AttendanceStreakCard } from '../../components/staff/AttendanceStreakCard';
import { AttendanceHeatmap } from '../../components/staff/AttendanceHeatmap';
import { ScanHistoryTable } from '../../components/staff/ScanHistoryTable';
import { QRScannerModal } from '../../components/staff/QRScannerModal';
import { CountdownTimer } from '../../components/common/CountdownTimer';
import { ScanLine, CheckCircle2, Clock, QrCode } from 'lucide-react';

const getDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const StaffDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [myRecords, setMyRecords] = useState<AttendanceRecord[]>([]);
  const [activeSessions, setActiveSessions] = useState<AttendanceSession[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    // Match strictly on uid. Matching on name alone would let two staff who
    // share a display name see each other's attendance history.
    const unsubR = subscribeToAttendanceRecords((records) => {
      setMyRecords(records.filter((r) => r.staffUid === userProfile?.uid));
    });

    const unsubS = subscribeToActiveSessions((sessions) => setActiveSessions(sessions));

    return () => {
      unsubR();
      unsubS();
    };
  }, [userProfile]);

  // Local calendar date: records are written with format(new Date(), 'yyyy-MM-dd'),
  // so comparing against a UTC string mislabels scans in the first hour of the day.
  const todayStr = getCurrentDateFormatted();
  const todayRecord = myRecords.find((r) => r.date === todayStr);

  // Prefer the counters stored on the profile, but fall back to values derived
  // from this member's own records. The previous `|| myRecords.length` and
  // `|| myRecords.length + 2` fallbacks made a brand-new member read 0% and made
  // the rate structurally pinned to 100%.
  const staffCounters = useMemo(() => {
    const profile = userProfile as any;
    const presentCount = myRecords.filter((r) => r.status === 'present' || r.status === 'late').length;
    const attendedDates = new Set(myRecords.map((r) => r.date));

    let derivedStreak = 0;
    const cursor = new Date();
    while (attendedDates.has(getDateKey(cursor))) {
      derivedStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    return {
      streak: typeof profile?.attendanceStreak === 'number' ? profile.attendanceStreak : derivedStreak,
      totalPresent: typeof profile?.totalPresent === 'number' ? profile.totalPresent : presentCount,
      totalSessions: typeof profile?.totalSessions === 'number' ? profile.totalSessions : attendedDates.size
    };
  }, [myRecords, userProfile]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Welcome Banner */}
      <div
        className="glass-card staff-dashboard-welcome"
        style={{
          background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--success-bg) 100%)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}
      >
        <div className="staff-dashboard-welcome__copy">
          <div className="staff-dashboard-welcome__meta" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span className="badge badge-present" style={{ fontSize: '0.75rem' }}>
              Staff ID: {(userProfile as any)?.staffId || 'IT/2026/089'}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              • {(userProfile as any)?.designation || 'IT Officer'}
            </span>
          </div>

          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.2rem 0' }}>
            Welcome, {userProfile?.name || 'Staff Member'}
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Department of Information Technology • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="staff-dashboard-welcome__action" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => setIsScannerOpen(true)} className="btn btn-success btn-lg pulse-glow">
            <ScanLine size={22} /> Scan Attendance QR
          </button>
        </div>
      </div>

      {/* Active Session Notification Card */}
      {activeSessions.length > 0 && (
        <div
          className="animate-fade-in staff-dashboard-session"
          style={{
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-light)',
            border: '2px solid var(--accent-primary)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <div className="staff-dashboard-session__details" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'var(--accent-primary)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <QrCode size={24} />
            </div>
            <div className="staff-dashboard-session__copy">
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                Live Session Ready: "{activeSessions[0].title}"
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                📍 {activeSessions[0].buildingName} · Location verification required
              </p>
            </div>
          </div>

          <div className="staff-dashboard-session__actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <CountdownTimer expiresAt={activeSessions[0].expiresAt} />
            <button onClick={() => setIsScannerOpen(true)} className="btn btn-primary">
              <ScanLine size={18} /> Open Scanner Now
            </button>
          </div>
        </div>
      )}

      {/* Today's Scan Status Badge */}
      <div className="glass-card staff-dashboard-status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="staff-dashboard-status__copy">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Today's Attendance Status</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
            {todayRecord ? `Scanned today at ${todayRecord.time}` : 'You have not scanned for any session today yet.'}
          </p>
        </div>

        <div className="staff-dashboard-status__badge">
          {todayRecord ? (
            <span className="badge badge-present" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
              <CheckCircle2 size={18} /> Marked {todayRecord.status.toUpperCase()}
            </span>
          ) : (
            <span className="badge badge-absent" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
              <Clock size={18} /> Pending QR Check-in
            </span>
          )}
        </div>
      </div>

      {/* Attendance Streak & Rating */}
      <AttendanceStreakCard
        streak={staffCounters.streak}
        totalPresent={staffCounters.totalPresent}
        totalSessions={staffCounters.totalSessions}
      />

      {/* Heatmap Visual Grid */}
      <AttendanceHeatmap records={myRecords} />

      {/* Personal Scan Logs Table */}
      <ScanHistoryTable records={myRecords} />

      {/* Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        staffProfile={userProfile}
        onSuccess={() => setIsScannerOpen(true)}
      />
    </div>
  );
};
