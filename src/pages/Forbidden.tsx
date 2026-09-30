import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const Forbidden: React.FC = () => {
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
        <ShieldAlert size={56} color="var(--danger-color)" style={{ marginBottom: '1rem' }} />
        <h1 style={{ fontSize: '3rem', fontWeight: 900, margin: 0, color: 'var(--danger-color)' }}>403</h1>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.5rem 0' }}>Access Denied</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          You do not have permission to access administrator resources. Please sign in with an Admin account.
        </p>

        <Link to="/admin/login" className="btn btn-primary" style={{ width: '100%' }}>
          <ArrowLeft size={16} /> Admin Login
        </Link>
      </div>
    </div>
  );
};
