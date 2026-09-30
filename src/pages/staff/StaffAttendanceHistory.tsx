import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToAttendanceRecords } from '../../firebase/services';
import { AttendanceRecord } from '../../types';
import { ScanHistoryTable } from '../../components/staff/ScanHistoryTable';
import { AttendanceHeatmap } from '../../components/staff/AttendanceHeatmap';

export const StaffAttendanceHistory: React.FC = () => {
  const { userProfile } = useAuth();
  const [myRecords, setMyRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    const unsub = subscribeToAttendanceRecords((records) => {
      // uid only: matching on name would expose another member's history
      const filtered = records.filter((r) => r.staffUid === userProfile?.uid);
      setMyRecords(filtered);
    });
    return () => unsub();
  }, [userProfile]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
          My Attendance Records & Logs
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
          Verified scan history for {userProfile?.name} ({(userProfile as any)?.staffId || 'IT Staff'})
        </p>
      </div>

      <AttendanceHeatmap records={myRecords} />
      <ScanHistoryTable records={myRecords} />
    </div>
  );
};
