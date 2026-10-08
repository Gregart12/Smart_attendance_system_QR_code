import React from 'react';
import { AttendanceRecord } from '../../types';
import { exportAttendanceToPDF } from '../../utils/exportUtils';
import { Download, CheckCircle, Clock } from 'lucide-react';

interface Props {
  records: AttendanceRecord[];
}

export const ScanHistoryTable: React.FC<Props> = ({ records }) => {
  return (
    <div className="glass-card" style={{ marginTop: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Personal Scan Logs</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
            Your history of QR scans with geofence validation
          </p>
        </div>

        <button
          onClick={() => exportAttendanceToPDF(records, 'Personal Attendance Log', {
            includeDistance: false,
            includeDeviceId: false
          })}
          className="btn btn-secondary btn-sm"
        >
          <Download size={14} /> Download PDF Report
        </button>
      </div>

      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Session</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                  No QR scans recorded yet. Use the Scan Attendance button to mark your attendance!
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.sessionTitle}</td>
                  <td>{r.date}</td>
                  <td>{r.time}</td>
                  <td>
                    <span className={`badge ${r.status === 'present' ? 'badge-present' : r.status === 'late' ? 'badge-late' : 'badge-absent'}`}>
                      {r.status === 'present' ? <CheckCircle size={12} /> : <Clock size={12} />}
                      {r.status}
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
