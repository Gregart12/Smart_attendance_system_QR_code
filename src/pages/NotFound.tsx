import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        padding: '1.5rem',
        textAlign: 'center'
      }}
    >
      <div className="glass-card" style={{ maxWidth: '450px', width: '100%', padding: '2.5rem' }}>
        <Compass size={56} color="var(--accent-primary)" style={{ marginBottom: '1rem' }} />
        <h1 style={{ fontSize: '3rem', fontWeight: 900, margin: 0, color: 'var(--accent-primary)' }}>404</h1>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.5rem 0' }}>Page Not Found</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          The URL or system route you requested does not exist in the Smart QR Attendance portal.
        </p>

        <Link to="/staff/dashboard" className="btn btn-primary" style={{ width: '100%' }}>
          <Home size={16} /> Return to Home
        </Link>
      </div>
    </div>
  );
};
