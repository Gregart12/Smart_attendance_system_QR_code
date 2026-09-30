import React, { useState, useEffect, useMemo } from 'react';
import { subscribeToAttendanceRecords, subscribeToStaff } from '../../firebase/services';
import { AttendanceRecord, StaffProfile } from '../../types';
import { exportAttendanceToPDF, exportAttendanceToExcel, exportAttendanceToCSV } from '../../utils/exportUtils';
import { isDateInPeriod, formatDate } from '../../utils/dateUtils';
import { Printer, Calendar, FileText, Download, Sheet } from 'lucide-react';

type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

const PERIOD_RANGES: Record<ReportPeriod, string> = {
  daily: 'Today',
  weekly: 'This week (Monday onwards)',
  monthly: 'This calendar month',
  yearly: 'This calendar year'
};

export const AdminReports: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [reportType, setReportType] = useState<ReportPeriod>('monthly');

  useEffect(() => {
    const unsubR = subscribeToAttendanceRecords((data) => setRecords(data));
    const unsubS = subscribeToStaff((data) => setStaffList(data));
    return () => {
      unsubR();
      unsubS();
    };
  }, []);

  // The report must actually reflect the selected period. Previously every
  // period printed the full all-time table under a matching header.
  const periodRecords = useMemo(
    () => records.filter((r) => isDateInPeriod(r.date, reportType)),
    [records, reportType]
  );

  const stats = useMemo(() => {
    const present = periodRecords.filter((r) => r.status === 'present').length;
    const late = periodRecords.filter((r) => r.status === 'late').length;
    const absent = periodRecords.filter((r) => r.status === 'absent').length;
    const onTimeRate = periodRecords.length > 0
      ? Math.round((present / periodRecords.length) * 100)
      : null;
    const distances = periodRecords
      .map((r) => r.distanceFromCenterMeters)
      .filter((d): d is number => typeof d === 'number' && Number.isFinite(d));
    const avgDistance = distances.length > 0
      ? Math.round(distances.reduce((a, b) => a + b, 0) / distances.length)
      : null;
    const uniqueStaff = new Set(periodRecords.map((r) => r.staffUid).filter(Boolean)).size;

    return { present, late, absent, onTimeRate, avgDistance, uniqueStaff };
  }, [periodRecords]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
            Official Attendance Reports & Audits
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Department of Information Technology • Academic & Administrative Summaries
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }} className="no-print">
          <button onClick={handlePrint} className="btn btn-secondary">
            <Printer size={16} /> Print
          </button>
          <button onClick={() => exportAttendanceToPDF(periodRecords)} className="btn btn-secondary" disabled={periodRecords.length === 0}>
            <FileText size={16} /> PDF
          </button>
          <button onClick={() => exportAttendanceToExcel(periodRecords)} className="btn btn-secondary" disabled={periodRecords.length === 0}>
            <Sheet size={16} /> Excel
          </button>
          <button onClick={() => exportAttendanceToCSV(periodRecords)} className="btn btn-primary" disabled={periodRecords.length === 0}>
            <Download size={16} /> CSV
          </button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="glass-card no-print">
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>Select Report Period</h4>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`btn ${reportType === type ? 'btn-primary' : 'btn-secondary'}`}
              style={{ textTransform: 'capitalize' }}
            >
              <Calendar size={15} /> {type} Attendance Report
            </button>
          ))}
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.75rem 0 0' }}>
          Showing {periodRecords.length} of {records.length} stored record{records.length === 1 ? '' : 's'} •{' '}
          {PERIOD_RANGES[reportType]}
        </p>
      </div>

      {/* Printable Report View */}
      <div className="glass-card" style={{ background: '#ffffff', color: '#0f172a', padding: '2rem' }}>
        {/* Department Letterhead Header */}
        <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>
            DEPARTMENT OF INFORMATION TECHNOLOGY
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#475569', margin: '0.2rem 0' }}>
            Smart QR Code Staff Attendance Management System
          </p>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
            Report Period: <strong>{PERIOD_RANGES[reportType].toUpperCase()}</strong> | Generated:{' '}
            {new Date().toLocaleString()}
          </p>
        </div>

        {/* Summary Statistics — all computed from periodRecords */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Registered Staff</span>
            <strong style={{ fontSize: '1.25rem', color: '#0f172a' }}>{staffList.length}</strong>
          </div>
          <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Staff Who Signed In</span>
            <strong style={{ fontSize: '1.25rem', color: '#0f172a' }}>{stats.uniqueStaff}</strong>
          </div>
          <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Total Verified Scans</span>
            <strong style={{ fontSize: '1.25rem', color: '#16a34a' }}>{periodRecords.length}</strong>
          </div>
          <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>On-time Rate</span>
            <strong style={{ fontSize: '1.25rem', color: '#2563eb' }}>
              {stats.onTimeRate === null ? '—' : `${stats.onTimeRate}%`}
            </strong>
          </div>
          <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Late Scans</span>
            <strong style={{ fontSize: '1.25rem', color: '#d97706' }}>{stats.late}</strong>
          </div>
          <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Avg Distance From QR</span>
            <strong style={{ fontSize: '1.25rem', color: '#0f172a' }}>
              {stats.avgDistance === null ? '—' : `${stats.avgDistance}m`}
            </strong>
          </div>
        </div>

        {/* Detailed Attendance List */}
        {periodRecords.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.9rem', padding: '2rem 0' }}>
            No attendance records fall within {PERIOD_RANGES[reportType].toLowerCase()}.
          </p>
        ) : (
          <table className="custom-table" style={{ fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th>Staff ID</th>
                <th>Staff Name</th>
                <th>Department</th>
                <th>Date</th>
                <th>Time</th>
                <th>GPS Distance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {periodRecords
                .slice()
                .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))
                .map((r) => (
                  <tr key={r.id}>
                    <td>{r.staffId}</td>
                    <td style={{ fontWeight: 600 }}>{r.staffName}</td>
                    <td>{r.department}</td>
                    <td>{formatDate(r.date)}</td>
                    <td>{r.time}</td>
                    <td>{r.distanceFromCenterMeters ?? 0}m</td>
                    <td style={{ fontWeight: 700, color: r.status === 'present' ? '#16a34a' : '#d97706' }}>
                      {r.status.toUpperCase()}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {/* Signatures */}
        <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>Prepared By:</p>
            <div style={{ marginTop: '2.5rem', borderTop: '1px solid #94a3b8', width: '180px', paddingTop: '0.25rem', fontSize: '0.8rem' }}>
              System Administrator
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>Approved By:</p>
            <div style={{ marginTop: '2.5rem', borderTop: '1px solid #94a3b8', width: '220px', paddingTop: '0.25rem', fontSize: '0.8rem' }}>
              Head of Department (HOD)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
