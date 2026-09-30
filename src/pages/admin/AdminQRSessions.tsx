import React, { useState, useEffect } from 'react';
import { subscribeToActiveSessions, closeAttendanceSession, deleteAttendanceSession } from '../../firebase/services';
import { AttendanceSession } from '../../types';
import { CreateQRSessionModal } from '../../components/admin/CreateQRSessionModal';
import { CountdownTimer } from '../../components/common/CountdownTimer';
import { useAuth } from '../../contexts/AuthContext';
import { toFriendlyError } from '../../firebase/errors';
import { QrCode, Plus, Trash2, XCircle, MapPin, Clock, Calendar, AlertTriangle } from 'lucide-react';

export const AdminQRSessions: React.FC = () => {
  const { userProfile } = useAuth();
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  // Ticks once a second so expiry state is re-evaluated: the countdown lives in
  // a child component, so the parent previously never re-rendered and a dead
  // session kept its "Active Live" badge.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const unsub = subscribeToActiveSessions((data) => setSessions(data));
    return () => unsub();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // A session can also be scheduled for later; it is not yet scannable.
  const liveSessions = sessions.filter((s) => now < s.expiresAt);
  const upcoming = sessions.filter((s) => now >= s.expiresAt);

  const handleClose = async (id: string) => {
    if (!confirm('Are you sure you want to close this attendance session immediately?')) return;
    setError('');
    try {
      await closeAttendanceSession(id);
    } catch (err) {
      setError(toFriendlyError(err, 'Could not close the session. Please try again.'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this session record?')) return;
    setError('');
    try {
      await deleteAttendanceSession(id);
    } catch (err) {
      setError(toFriendlyError(err, 'Could not delete the session. Please try again.'));
    }
  };

  const renderSession = (sess: AttendanceSession, isExpired: boolean) => {
    const hasExpiry = typeof sess.expiresAt === 'number';

    return (
      <div key={sess.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{sess.title}</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
              {sess.department}
            </p>
          </div>
          <span className={`badge ${!isExpired ? 'badge-active' : 'badge-expired'}`}>
            {!isExpired ? 'Active Live' : 'Closed / Expired'}
          </span>
        </div>

        <div style={{ padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={14} className="text-primary" />
            <span>Date: {sess.date} ({sess.startTime} - {sess.endTime})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <MapPin size={14} className="text-primary" />
            <span>Radius: {sess.radiusMeters}m ({sess.buildingName})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Clock size={14} className="text-primary" />
            <span>Duration: {sess.durationMinutes} minutes</span>
          </div>
        </div>

        {!isExpired && hasExpiry ? (
          <div style={{ marginTop: '0.25rem' }}>
            <CountdownTimer expiresAt={sess.expiresAt} />
          </div>
        ) : (
          <p style={{ fontSize: '0.8rem', color: 'var(--danger-color)', margin: 0 }}>
            ⛔ Session concluded. QR token invalidated.
          </p>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
          {!isExpired && (
            <button onClick={() => handleClose(sess.id)} className="btn btn-secondary btn-sm" style={{ flex: 1, color: 'var(--danger-color)' }}>
              <XCircle size={14} /> Close Session
            </button>
          )}
          <button onClick={() => handleDelete(sess.id)} className="btn btn-secondary btn-sm" title="Delete record">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
            Attendance QR Sessions
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Generate, inspect, and manage active Smart QR attendance tokens
          </p>
        </div>

        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus size={18} /> Generate New Session QR
        </button>
      </div>

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-color)',
            color: 'var(--danger-color)',
            fontSize: '0.85rem'
          }}
        >
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {liveSessions.length === 0 && upcoming.length === 0 ? (
          <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
            <QrCode size={48} color="var(--accent-primary)" style={{ marginBottom: '1rem' }} />
            <h3>No Active QR Sessions</h3>
            <p>Click "Generate New Session QR" above to initiate a staff check-in session.</p>
          </div>
        ) : (
          <>
            {liveSessions.map((s) => renderSession(s, false))}
            {upcoming.map((s) => renderSession(s, true))}
          </>
        )}
      </div>

      <CreateQRSessionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        adminName={userProfile?.name || 'Admin'}
      />
    </div>
  );
};
