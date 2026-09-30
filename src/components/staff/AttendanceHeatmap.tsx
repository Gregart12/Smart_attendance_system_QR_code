import React from 'react';
import { AttendanceRecord } from '../../types';

interface HeatmapProps {
  records: AttendanceRecord[];
}

export const AttendanceHeatmap: React.FC<HeatmapProps> = ({ records }) => {
  // Rolling 30-day window, keyed by LOCAL calendar date. toISOString() would
  // return a UTC date, which duplicates one cell and drops another for anyone
  // east of UTC in the first hour of the day.
  const days = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const hasRecord = records.find((r) => r.date === dateStr);
    const weekday = d.getDay();
    return {
      day: d.getDate(),
      dateStr,
      // Weekend is a property of the actual day, not of the position in the
      // rolling window: indexing by `i` shifts every weekday each day.
      status: hasRecord ? hasRecord.status : weekday === 0 || weekday === 6 ? 'weekend' : 'unmarked'
    };
  });

  return (
    <div className="glass-card" style={{ marginTop: '1.25rem' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Monthly Attendance Heatmap</h3>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        Visual record of your QR attendance scans over the past 30 days
      </p>

      <div className="staff-heatmap-legend"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(36px, 1fr))',
          gap: '0.5rem'
        }}
      >
        {days.map((item) => (
          <div
            key={item.dateStr}
            title={`${item.dateStr}: ${item.status}`}
            style={{
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
              background:
                item.status === 'present'
                  ? 'var(--success-color)'
                  : item.status === 'late'
                  ? 'var(--warning-color)'
                  : item.status === 'weekend'
                  ? 'var(--border-color)'
                  : 'var(--danger-bg)',
              color:
                item.status === 'present' || item.status === 'late'
                  ? '#ffffff'
                  : 'var(--text-secondary)'
            }}
          >
            {item.day}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', fontSize: '0.75rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--success-color)' }} />
          Present
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--warning-color)' }} />
          Late
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--danger-bg)', border: '1px solid var(--border-color)' }} />
          Absent / Missed
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--border-color)' }} />
          Weekend
        </span>
      </div>
    </div>
  );
};
