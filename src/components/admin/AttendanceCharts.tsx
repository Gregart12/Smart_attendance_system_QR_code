import React, { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { AttendanceRecord } from '../../types';
import { getDateKey } from '../../utils/dateUtils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Chart.js writes these straight to canvas colours, where `var(--x)` is invalid. */
function readCssColor(variable: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value || fallback;
}

interface ChartsProps {
  records: AttendanceRecord[];
}

export const AttendanceCharts: React.FC<ChartsProps> = ({ records }) => {
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  const theme = useMemo(
    () => ({
      text: readCssColor('--text-primary', '#f8fafc'),
      muted: readCssColor('--text-secondary', '#94a3b8'),
      grid: readCssColor('--border-color', 'rgba(148,163,184,0.2)')
    }),
    []
  );

  // Derived from real attendance records, not hardcoded series.
  const chartData = useMemo(() => {
    const isPresent = (r: AttendanceRecord) => r.status === 'present' || r.status === 'late';

    if (timeframe === 'daily') {
      const hours = Array.from({ length: 14 }, (_, i) => `${String(8 + i).padStart(2, '0')}:00`);
      const counts = new Array(14).fill(0) as number[];
      for (const r of records) {
        const hour = Number((r.time || '').slice(0, 2));
        if (Number.isFinite(hour) && hour >= 8 && hour < 22) counts[hour - 8]++;
      }
      return {
        kind: 'bar' as const,
        labels: hours,
        datasets: [
          { label: 'Scans', data: counts, backgroundColor: '#3b82f6', borderRadius: 6 }
        ]
      };
    }

    if (timeframe === 'weekly') {
      const labels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const present = new Array(7).fill(0) as number[];
      const late = new Array(7).fill(0) as number[];
      for (const r of records) {
        const parsed = new Date(`${r.date}T00:00:00`);
        if (Number.isNaN(parsed.getTime())) continue;
        const idx = (parsed.getDay() + 6) % 7; // Monday-first
        if (r.status === 'present') present[idx]++;
        else if (r.status === 'late') late[idx]++;
        else if (r.status === 'absent') present[idx] += 0;
      }
      return {
        kind: 'bar' as const,
        labels,
        datasets: [
          { label: 'Present', data: present, backgroundColor: '#10b981', borderRadius: 6 },
          { label: 'Late', data: late, backgroundColor: '#f59e0b', borderRadius: 6 }
        ]
      };
    }

    // Monthly: four rolling weeks of scans.
    const today = new Date();
    const weekStarts = [0, 7, 14, 21].map((offset) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (23 - offset));
      return d;
    });
    const buckets = weekStarts.map(() => ({ present: 0, late: 0 }));
    for (const r of records) {
      const parsed = new Date(`${r.date}T00:00:00`);
      if (Number.isNaN(parsed.getTime())) continue;
      const idx = weekStarts.findIndex((ws) => parsed.getTime() >= ws.getTime());
      if (idx === -1) continue;
      if (r.status === 'present') buckets[idx].present++;
      else if (r.status === 'late') buckets[idx].late++;
    }
    return {
      kind: 'line' as const,
      labels: ['4 weeks ago', '3 weeks ago', '2 weeks ago', 'This week'],
      datasets: [
        {
          label: 'Present',
          data: buckets.map((b) => b.present),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.3,
          fill: true
        },
        {
          label: 'Late',
          data: buckets.map((b) => b.late),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.3,
          fill: true
        }
      ]
    };
  }, [records, timeframe]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: theme.text, font: { family: 'system-ui' } }
      }
    },
    scales: {
      x: {
        ticks: { color: theme.muted },
        grid: { color: theme.grid }
      },
      y: {
        beginAtZero: true,
        ticks: { color: theme.muted, precision: 0 },
        grid: { color: theme.grid }
      }
    }
  };

  const totalInView = chartData.datasets.reduce(
    (sum, ds) => sum + ds.data.reduce((a, b) => a + b, 0),
    0
  );

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Attendance Trends & Analytics</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
            Derived from {records.length} stored attendance record{records.length === 1 ? '' : 's'}
            {totalInView === 0 ? ' — no scans in this range yet' : ''}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-primary)', padding: '0.25rem', borderRadius: 'var(--radius-sm)' }}>
          {(['daily', 'weekly', 'monthly'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className="btn btn-sm"
              style={{
                textTransform: 'capitalize',
                background: timeframe === tf ? 'var(--bg-surface)' : 'transparent',
                color: timeframe === tf ? 'var(--accent-primary)' : 'var(--text-secondary)',
                boxShadow: timeframe === tf ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: '280px', width: '100%' }}>
        {chartData.kind === 'line' ? (
          <Line data={chartData} options={options} />
        ) : (
          <Bar data={chartData} options={options} />
        )}
      </div>
    </div>
  );
};
