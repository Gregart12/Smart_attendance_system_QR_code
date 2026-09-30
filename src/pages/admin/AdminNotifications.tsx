import React, { useState, useEffect } from 'react';
import { subscribeToNotifications } from '../../firebase/services';
import { SystemNotification } from '../../types';
import { AnnouncementBoard } from '../../components/admin/AnnouncementBoard';
import { useAuth } from '../../contexts/AuthContext';

export const AdminNotifications: React.FC = () => {
  const { userProfile } = useAuth();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  useEffect(() => {
    const unsub = subscribeToNotifications((data) => setNotifications(data));
    return () => unsub();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
          Department Announcements & Bulletins
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
          Broadcast notices and warnings to all IT department staff
        </p>
      </div>

      <AnnouncementBoard notifications={notifications} adminName={userProfile?.name || 'HOD / Admin'} />
    </div>
  );
};
