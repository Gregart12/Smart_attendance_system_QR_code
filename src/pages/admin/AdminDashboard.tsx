import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  subscribeToStaff,
  subscribeToAttendanceRecords,
  subscribeToAttendanceSessions,
  subscribeToAuditLogs,
  subscribeToNotifications
} from '../../firebase/services';
import {
  StaffProfile,
  AttendanceRecord,
  AttendanceSession,
  AuditLog,
  SystemNotification
} from '../../types';
import { StatsCards } from '../../components/admin/StatsCards';
import { getCurrentDateFormatted } from '../../utils/dateUtils';
import { AttendanceCharts } from '../../components/admin/AttendanceCharts';
import { RecentAttendanceTable } from '../../components/admin/RecentAttendanceTable';
import { CreateQRSessionModal } from '../../components/admin/CreateQRSessionModal';
import { SystemAuditLogs } from '../../components/admin/SystemAuditLogs';
import { CountdownTimer } from '../../components/common/CountdownTimer';
import { QrCode, Plus, Sparkles, RefreshCw, Clock, Users, ShieldCheck } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { userProfile } = useAuth();

  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [now, setNow] = useState(() => Date.now());

  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  // Realtime subscriptions
  useEffect(() => {
    const unsubStaff = subscribeToStaff((data) => {
      setStaffList(data);
    });

    const unsubRecords = subscribeToAttendanceRecords((data) => {
      setRecords(data);
    });

    const unsubSessions = subscribeToAttendanceSessions((data) => {
      setSessions(data);
    });

    const unsubLogs = subscribeToAuditLogs((data) => {
      setAuditLogs(data);
    });

    const unsubNotifs = subscribeToNotifications((data) => {
      setNotifications(data);
    });

    return () => {
      unsubStaff();
      unsubRecords();
      unsubSessions();
      unsubLogs();
      unsubNotifs();
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(intervalId);
  }, []);

  // Compute Statistics. todayStr must be the LOCAL calendar day: records are
  // written with a local yyyy-MM-dd string, and toISOString() would be UTC.
  const todayStr = getCurrentDateFormatted();
  const todayRecords = records.filter((r) => r.date === todayStr);

  const totalStaffCount = staffList.length;
  const presentStaffUids = new Set(
    todayRecords
      .filter((r) => r.status === 'present' || r.status === 'late')
      .map((r) => r.staffUid)
  );
  const presentTodayCount = presentStaffUids.size;
  const hasCompletedAttendanceSession = sessions.some((session) =>
    session.date === todayStr &&
    now >= new Date(`${session.date}T${session.startTime}`).getTime() &&
    (session.status !== 'active' || (Number.isFinite(session.expiresAt) && now >= session.expiresAt))
  );
  const absentTodayCount = hasCompletedAttendanceSession
    ? Math.max(0, totalStaffCount - presentTodayCount)
    : 0;
  const attendancePercent = totalStaffCount > 0 ? Math.round((presentTodayCount / totalStaffCount) * 100) : 0;

  const activeSessions = sessions.filter((s) => s.status === 'active' && now < s.expiresAt);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner Header */}
      <div
        className="glass-card"
        style={{
          background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--accent-light) 100%)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}
      >
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Executive Admin Control Center
          </span>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.2rem 0' }}>
            Welcome back, {userProfile?.name || 'HOD / Admin'}
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Department of Information Technology • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => setIsQRModalOpen(true)} className="btn btn-primary btn-lg pulse-glow">
            <QrCode size={20} /> Generate Attendance QR
          </button>
        </div>
      </div>

      {/* Active Session Alert Banner (If Any) */}
      {activeSessions.length > 0 && (
        <div
          className="animate-fade-in"
          style={{
            padding: '1rem 1.25rem',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'var(--accent-primary)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <QrCode size={22} />
            </div>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                Active Session Live: "{activeSessions[0].title}"
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                📍 Geofence Radius: {activeSessions[0].radiusMeters}m | Created by {activeSessions[0].createdBy}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <CountdownTimer expiresAt={activeSessions[0].expiresAt} />
            <button onClick={() => setIsQRModalOpen(true)} className="btn btn-secondary btn-sm">
              View QR Code
            </button>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <StatsCards
        totalStaff={totalStaffCount}
        presentToday={presentTodayCount}
        absentToday={absentTodayCount}
        hasCompletedAttendanceSession={hasCompletedAttendanceSession}
        attendancePercent={attendancePercent}
      />

      {/* Attendance Analytics Charts */}
      <AttendanceCharts records={records} />

      {/* Recent Activity Table */}
      <RecentAttendanceTable records={records} />

      {/* Audit Trail Logs */}
      <SystemAuditLogs logs={auditLogs} />

      {/* Create QR Session Modal */}
      <CreateQRSessionModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        adminName={userProfile?.name || 'Admin'}
      />
    </div>
  );
};
