import React from 'react';
import { Users, UserCheck, UserX, TrendingUp } from 'lucide-react';

interface StatsProps {
  totalStaff: number;
  presentToday: number;
  absentToday: number;
  hasCompletedAttendanceSession?: boolean;
  attendancePercent: number;
}

export const StatsCards: React.FC<StatsProps> = ({
  totalStaff,
  presentToday,
  absentToday,
  hasCompletedAttendanceSession = false,
  attendancePercent
}) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
      {/* Total Staff Card */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total IT Staff
            </span>
            <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', background: 'var(--accent-light)', color: 'var(--accent-primary)' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {totalStaff}
          </div>
        </div>
        <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Registered in Department
        </div>
      </div>

      {/* Present Today Card */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Present Today
            </span>
            <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', background: 'var(--success-bg)', color: 'var(--success-color)' }}>
              <UserCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--success-color)', lineHeight: 1.1 }}>
            {presentToday}
          </div>
        </div>
        <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Verified QR Scans
        </div>
      </div>

      {/* Absent Today Card */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Absent Today
            </span>
            <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', background: 'var(--danger-bg)', color: 'var(--danger-color)' }}>
              <UserX size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--danger-color)', lineHeight: 1.1 }}>
            {absentToday}
          </div>
        </div>
        <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {hasCompletedAttendanceSession ? 'Unmarked Staff Members' : 'No completed attendance session today'}
        </div>
      </div>

      {/* Attendance Rate Featured Card */}
      <div
        style={{
          background: 'var(--accent-gradient)',
          color: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Attendance Rate
            </span>
            <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.2)', color: '#ffffff' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.1 }}>
            {attendancePercent}%
          </div>
        </div>
        <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.85)' }}>
          Overall Department Metric
        </div>
      </div>
    </div>
  );
};

