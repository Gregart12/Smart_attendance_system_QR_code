import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  KeyRound,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react';
import { FutoCrestLogo } from '../../components/common/FutoCrestLogo';

const MIN_LENGTH = 6;

function scorePassword(password: string) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= MIN_LENGTH) score++;
  if (password.length >= 10) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

const STRENGTH_LABELS = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['#ef4444', '#ef4444', '#f59e0b', '#10b981', '#10b981'];

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get('oobCode') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [resetEmail, setResetEmail] = useState('');

  const { verifyResetCode, confirmResetPassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const verifyCode = async () => {
      if (!oobCode) {
        setError(
          'This password reset link is missing its security code. Open the link straight from your email, or request a new one.'
        );
        setVerifying(false);
        return;
      }

      try {
        const email = await verifyResetCode(oobCode);
        if (active) setResetEmail(email);
      } catch (err: any) {
        if (active) setError(err?.message || 'This password reset link is invalid or has expired.');
      } finally {
        if (active) setVerifying(false);
      }
    };

    void verifyCode();
    return () => {
      active = false;
    };
  }, [oobCode, verifyResetCode]);

  const strength = useMemo(() => scorePassword(newPassword), [newPassword]);

  const requirements = useMemo(
    () => [
      { label: `At least ${MIN_LENGTH} characters`, met: newPassword.length >= MIN_LENGTH },
      { label: 'Contains a number', met: /\d/.test(newPassword) },
      { label: 'Contains a letter', met: /[A-Za-z]/.test(newPassword) }
    ],
    [newPassword]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters long.`);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please try again.');
      return;
    }

    setLoading(true);
    try {
      await confirmResetPassword(oobCode, newPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password. Please request a new link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <FutoCrestLogo size={56} />
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0.75rem 0 0.25rem 0', color: '#ffffff' }}>
          Create New Password
        </h2>
        <p style={{ fontSize: '0.8rem', color: '#f59e0b', margin: 0, fontWeight: 600 }}>
          Federal University of Technology, Owerri &mdash; Account Recovery
        </p>
      </div>

      {verifying ? (
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 1rem',
              borderRadius: '50%',
              border: '3px solid rgba(16, 185, 129, 0.2)',
              borderTopColor: '#10b981',
              animation: 'spin 1s linear infinite'
            }}
          />
          <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Verifying your reset link...</p>
        </div>
      ) : success ? (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: '0.75rem' }} />
          <h3 style={{ fontSize: '1.1rem', color: '#ffffff', marginBottom: '0.5rem' }}>Password Updated!</h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
            Your password has been changed. Sign in with your new password below.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <button type="button" onClick={() => navigate('/staff/login')} className="btn btn-success" style={{ width: '100%' }}>
              Staff Sign In <ArrowRight size={16} />
            </button>
            <button type="button" onClick={() => navigate('/admin/login')} className="btn btn-secondary" style={{ width: '100%' }}>
              Admin Sign In <ArrowRight size={16} />
            </button>
          </div>
        </div>
      ) : error && !resetEmail ? (
        <div>
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

          <Link to="/forgot-password" className="btn btn-success" style={{ width: '100%' }}>
            Request a New Reset Link <ArrowRight size={16} />
          </Link>
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

          {resetEmail && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10b981',
                fontSize: '0.85rem',
                marginBottom: '1rem'
              }}
            >
              <ShieldCheck size={16} style={{ flexShrink: 0 }} />
              <span>
                Verified account: <strong>{resetEmail}</strong>
              </span>
            </div>
          )}

          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
            Choose a new password you have not used before. It must be at least {MIN_LENGTH}{' '}
            characters long.
          </p>

          <div className="form-group">
            <label className="form-label" style={{ color: '#cbd5e1' }}>New Password</label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="form-input"
                placeholder="Enter new password"
                autoComplete="new-password"
                style={{ paddingLeft: '2.25rem', paddingRight: '2.5rem', background: '#0f172a', borderColor: '#334155', color: '#ffffff' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '0.6rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  display: 'flex',
                  padding: '0.25rem'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {newPassword && (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '3px', marginBottom: '0.35rem' }}>
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      style={{
                        height: '3px',
                        flex: 1,
                        borderRadius: '2px',
                        background: i < strength ? STRENGTH_COLORS[strength] : '#1e293b'
                      }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: '0.72rem', color: STRENGTH_COLORS[strength], fontWeight: 600 }}>
                  {STRENGTH_LABELS[strength]}
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" style={{ color: '#cbd5e1' }}>Confirm New Password</label>
            <div style={{ position: 'relative' }}>
              <KeyRound
                size={16}
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-input"
                placeholder="Re-enter new password"
                autoComplete="new-password"
                style={{ paddingLeft: '2.25rem', background: '#0f172a', borderColor: '#334155', color: '#ffffff' }}
              />
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <span style={{ fontSize: '0.75rem', color: '#ef4444', display: 'block', marginTop: '0.25rem' }}>
                Passwords do not match.
              </span>
            )}
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem 0', fontSize: '0.78rem' }}>
            {requirements.map((req) => (
              <li
                key={req.label}
                style={{ color: req.met ? '#10b981' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <span
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    border: `1px solid ${req.met ? '#10b981' : '#475569'}`,
                    background: req.met ? '#10b981' : 'transparent',
                    color: '#0f172a',
                    fontSize: '9px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700
                  }}
                >
                  {req.met ? '✓' : ''}
                </span>
                {req.label}
              </li>
            ))}
          </ul>

          <button type="submit" disabled={loading} className="btn btn-success" style={{ width: '100%' }}>
            {loading ? 'Updating Password...' : 'Create New Password'} <ArrowRight size={16} />
          </button>

          <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>
            Remembered it?{' '}
            <Link to="/staff/login" style={{ color: '#60a5fa', fontWeight: 600 }}>Back to Staff Login</Link>{' '}
            &bull;{' '}
            <Link to="/admin/login" style={{ color: '#60a5fa' }}>Admin Login</Link>
          </div>
        </form>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
