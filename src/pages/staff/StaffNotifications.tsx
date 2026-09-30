import React, { useState, useEffect } from 'react';
import { subscribeToNotifications } from '../../firebase/services';
import { SystemNotification } from '../../types';
import { Bell, AlertCircle, Info, CheckCircle2 } from 'lucide-react';

export const StaffNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  useEffect(() => {
    const unsub = subscribeToNotifications((data) => setNotifications(data));
    return () => unsub();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '750px' }}>
      <div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
          Department Announcements & Notices
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
          Official broadcasts from the Head of Department and System Administrators
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {notifications.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <Bell size={36} color="var(--accent-primary)" style={{ marginBottom: '0.75rem' }} />
            <h3 style={{ fontSize: '1.1rem' }}>No Active Announcements</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Check back later for department updates and attendance notices.
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className="glass-card animate-fade-in"
              style={{
                borderLeft: `4px solid ${
                  n.type === 'alert' ? 'var(--danger-color)' : n.type === 'warning' ? 'var(--warning-color)' : 'var(--accent-primary)'
                }`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {n.type === 'alert' ? <AlertCircle size={18} color="var(--danger-color)" /> : <Info size={18} color="var(--accent-primary)" />}
                  {n.title}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(n.createdAt).toLocaleDateString()}
                </span>
              </div>

              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', margin: '0.5rem 0' }}>{n.message}</p>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Broadcast by: <strong>{n.createdBy}</strong>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
