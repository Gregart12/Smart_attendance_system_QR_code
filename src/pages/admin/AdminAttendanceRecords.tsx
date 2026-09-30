import React, { useState, useEffect } from 'react';
import { subscribeToAttendanceRecords } from '../../firebase/services';
import { AttendanceRecord } from '../../types';
import { RecentAttendanceTable } from '../../components/admin/RecentAttendanceTable';
import { exportAttendanceToPDF, exportAttendanceToExcel, exportAttendanceToCSV } from '../../utils/exportUtils';
import { ClipboardList, Download, Calendar } from 'lucide-react';

export const AdminAttendanceRecords: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    const unsub = subscribeToAttendanceRecords((data) => setRecords(data));
    return () => unsub();
  }, []);

  const filteredRecords = selectedDate
    ? records.filter((r) => r.date === selectedDate)
    : records;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
            Master Attendance Logs
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Comprehensive records of all verified staff QR check-ins
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={16} className="text-primary" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="form-input"
              style={{ width: '160px', fontSize: '0.85rem' }}
            />
          </div>

          {selectedDate && (
            <button onClick={() => setSelectedDate('')} className="btn btn-secondary btn-sm">
              Clear Date Filter
            </button>
          )}

          <button onClick={() => exportAttendanceToPDF(filteredRecords)} className="btn btn-primary btn-sm" disabled={filteredRecords.length === 0}>
            <Download size={14} /> PDF
          </button>
          <button onClick={() => exportAttendanceToExcel(filteredRecords)} className="btn btn-secondary btn-sm" disabled={filteredRecords.length === 0}>
            <Download size={14} /> Excel
          </button>
          <button onClick={() => exportAttendanceToCSV(filteredRecords)} className="btn btn-secondary btn-sm" disabled={filteredRecords.length === 0}>
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
        {selectedDate
          ? `Showing ${filteredRecords.length} record(s) for ${selectedDate}`
          : `Showing all ${records.length} record(s)`}
      </p>

      <RecentAttendanceTable records={filteredRecords} />
    </div>
  );
};
