import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { KeyRound, Mail, ArrowRight, CheckCircle2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { FutoCrestLogo } from '../../components/common/FutoCrestLogo';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await resetPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <FutoCrestLogo size={56} />
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0.75rem 0 0.25rem 0', color: '#ffffff' }}>
          Forgot Password
        </h2>
        <p style={{ fontSize: '0.8rem', color: '#f59e0b', margin: 0, fontWeight: 600 }}>
          Federal University of Technology, Owerri &mdash; Account Recovery
        </p>
      </div>

      {sent ? (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 1rem',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '2px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CheckCircle2 size={36} color="#10b981" />
          </div>
          <h3 style={{ fontSize: '1.1rem', color: '#ffffff', marginBottom: '0.5rem' }}>Reset Link Sent!</h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
            We have sent password recovery instructions to:
          </p>
          <p style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 700, marginBottom: '1rem' }}>
            {email}
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#f59e0b',
              fontSize: '0.8rem',
              marginBottom: '1.25rem',
              textAlign: 'left'
            }}
          >
            <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              Click the link in the email to be redirected back to the portal where you can create a new password. The link expires in 1 hour. If it has not arrived within a few minutes, check your spam/junk folder.
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <Link to="/staff/login" className="btn btn-success" style={{ width: '100%' }}>
              Staff Sign In <ArrowRight size={16} />
            </Link>
            <Link to="/admin/login" className="btn btn-secondary" style={{ width: '100%' }}>
              Admin Sign In <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#ef4444',
                fontSize: '0.85rem',
                marginBottom: '1rem'
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{error}</span>
            </div>
          )}

          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
            Enter the email address registered to your account — this works for both staff and administrator accounts. We will email you a link to set a new password.
          </p>

          <div className="form-group">
            <label className="form-label" style={{ color: '#cbd5e1' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="email"
                required
                placeholder="your.email@dept.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '2.25rem', background: '#0f172a', borderColor: '#334155', color: '#ffffff' }}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-success" style={{ width: '100%', marginTop: '0.5rem' }}>
            {loading ? 'Sending Request...' : 'Send Password Reset Email'} <ArrowRight size={16} />
          </button>

          <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.85rem' }}>
            <Link to="/staff/login" style={{ color: '#60a5fa' }}>Back to Staff Login</Link> •{' '}
            <Link to="/admin/login" style={{ color: '#60a5fa' }}>Admin Login</Link>
          </div>
        </form>
      )}
    </div>
  );
};