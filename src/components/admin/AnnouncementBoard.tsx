import React, { useState } from 'react';
import { SystemNotification } from '../../types';
import { createNotification } from '../../firebase/services';
import { Bell, Send, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface Props {
  notifications: SystemNotification[];
  adminName: string;
}

export const AnnouncementBoard: React.FC<Props> = ({ notifications, adminName }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'warning' | 'alert'>('info');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;
    setLoading(true);

    try {
      await createNotification({
        title,
        message,
        type,
        targetDepartment: 'Department of Information Technology',
        createdBy: adminName
      });
      setTitle('');
      setMessage('');
    } catch (err) {
      console.error('Failed sending announcement:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
      {/* Create Announcement */}
      <div className="glass-card">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bell size={18} className="text-primary" /> Post Staff Announcement
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Send department-wide notice to all IT staff members
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Notice Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Mandatory Staff Meeting Notice"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notice Category</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="form-select"
            >
              <option value="info">General Information</option>
              <option value="warning">Important Alert</option>
              <option value="alert">Urgent Deadline</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Message Content</label>
            <textarea
              required
              rows={3}
              placeholder="Write notice details..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="form-textarea"
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
            <Send size={16} /> {loading ? 'Broadcasting...' : 'Broadcast Notice'}
          </button>
        </form>
      </div>

      {/* Announcements List */}
      <div className="glass-card">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Active Announcements</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Recent department broadcasts
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
              No announcements posted yet.
            </p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-primary)',
                  borderLeft: `4px solid ${
                    n.type === 'alert' ? 'var(--danger-color)' : n.type === 'warning' ? 'var(--warning-color)' : 'var(--accent-primary)'
                  }`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>{n.title}</h4>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>{n.message}</p>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Posted by: {n.createdBy}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
