import React from 'react';
import { Flame, Award, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface StreakProps {
  streak: number;
  totalPresent: number;
  totalSessions: number;
}

export const AttendanceStreakCard: React.FC<StreakProps> = ({
  streak = 0,
  totalPresent = 0,
  totalSessions = 0
}) => {
  // A member with no history yet is not "100% punctual" — show no rate at all
  // rather than a number that implies a perfect record.
  const hasData = totalSessions > 0;
  const percentage = hasData ? Math.round((totalPresent / totalSessions) * 100) : null;

  return (
    <div className="glass-card staff-streak-card" style={{ background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--accent-light) 100%)' }}>
      <div className="staff-streak-card__content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="staff-streak-card__copy">
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Punctuality Performance
          </span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.2rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Flame size={28} color="#f97316" fill="#f97316" /> {streak} Days Streak
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            {streak > 5
              ? ' Exemplary attendance record! Keep up the great streak.'
              : 'Consistent daily check-ins boost your department rating.'}
          </p>
        </div>

        <div className="staff-streak-card__metric" style={{ textAlign: 'right' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              border: '4px solid var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              fontWeight: 800,
              color: 'var(--accent-primary)',
              background: 'var(--bg-surface)'
            }}
          >
            {percentage === null ? '—' : `${percentage}%`}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
            On-time Rate
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>
            {totalPresent}/{totalSessions} on time
          </span>
        </div>
      </div>
    </div>
  );
};
