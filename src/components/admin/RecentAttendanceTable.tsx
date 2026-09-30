import React, { useState } from 'react';
import { AttendanceRecord } from '../../types';
import { exportAttendanceToPDF, exportAttendanceToExcel, exportAttendanceToCSV } from '../../utils/exportUtils';
import { Download, Search, Filter, CheckCircle, Clock, MapPin, Smartphone } from 'lucide-react';

interface TableProps {
  records: AttendanceRecord[];
}

export const RecentAttendanceTable: React.FC<TableProps> = ({ records }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredRecords = records.filter((rec) => {
    const term = searchTerm.trim().toLowerCase();
    // Every field is optional on a record, so none of these may be dereferenced
    // unguarded: a record written by an import or a manual edit would throw here.
    const matchesSearch =
      !term ||
      (rec.staffName ?? '').toLowerCase().includes(term) ||
      (rec.staffId ?? '').toLowerCase().includes(term) ||
      (rec.sessionTitle ?? '').toLowerCase().includes(term);

    const matchesStatus = statusFilter === 'all' || rec.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="glass-card" style={{ marginTop: '1.5rem' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.25rem'
        }}
      >
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
            Live Attendance Activity Stream
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
            Real-time verified GPS & QR scans for Department of IT staff
          </p>
        </div>

        {/* Filters and Exports */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="Search staff or session..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.25rem', width: '200px', fontSize: '0.85rem' }}
            />
          </div>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-select"
            style={{ width: '120px', fontSize: '0.85rem' }}
          >
            <option value="all">All Status</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
          </select>

          {/* Export Actions */}
          <button
            onClick={() => exportAttendanceToPDF(filteredRecords)}
            className="btn btn-secondary btn-sm"
            title="Export as PDF"
            disabled={filteredRecords.length === 0}
          >
            <Download size={14} /> PDF
          </button>
          <button
            onClick={() => exportAttendanceToExcel(filteredRecords)}
            className="btn btn-secondary btn-sm"
            title="Export as Excel"
            disabled={filteredRecords.length === 0}
          >
            <Download size={14} /> Excel
          </button>
          <button
            onClick={() => exportAttendanceToCSV(filteredRecords)}
            className="btn btn-secondary btn-sm"
            title="Export as CSV"
            disabled={filteredRecords.length === 0}
          >
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      {/* Table Display */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Staff ID</th>
              <th>Staff Name</th>
              <th>Session</th>
              <th>Date & Time</th>
              <th>GPS Distance</th>
              <th>Status</th>
              <th>Device</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  No attendance records found matching your current filter.
                </td>
              </tr>
            ) : (
              filteredRecords.map((rec) => (
                <tr key={rec.id}>
                  <td style={{ fontWeight: 600 }}>{rec.staffId || 'IT/2026/001'}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{rec.staffName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{rec.department}</div>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{rec.sessionTitle}</td>
                  <td style={{ fontSize: '0.85rem' }}>
                    <div>{rec.date}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rec.time}</div>
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
                      <MapPin size={14} className="text-primary" />
                      {rec.distanceFromCenterMeters ?? 0}m
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        rec.status === 'present'
                          ? 'badge-present'
                          : rec.status === 'late'
                          ? 'badge-late'
                          : 'badge-absent'
                      }`}
                    >
                      {rec.status === 'present' && <CheckCircle size={12} />}
                      {rec.status === 'late' && <Clock size={12} />}
                      {rec.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Smartphone size={13} />
                      {rec.deviceInfo || 'Browser'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
