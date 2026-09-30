import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserCheck, Mail, Lock, Chrome, ArrowRight, GraduationCap } from 'lucide-react';
import { FutoCrestLogo } from '../../components/common/FutoCrestLogo';

export const StaffLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { login, continueWithGoogle, role, userProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (role === 'staff' && userProfile) {
      navigate('/staff/dashboard');
    }
  }, [role, userProfile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/staff/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate staff account. Please verify email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');

    try {
      await continueWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google sign-in could not be completed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <FutoCrestLogo size={64} />
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0.75rem 0 0.25rem 0', color: '#ffffff' }}>
          FUTO Staff Attendance Portal
        </h2>
        <p style={{ fontSize: '0.8rem', color: '#f59e0b', margin: 0, fontWeight: 600 }}>
          Federal University of Technology, Owerri &mdash; Staff Login
        </p>
        <div style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: '#94a3b8' }}>
          <GraduationCap size={13} color="#f59e0b" />
          <span>Directorate of ICT &mdash; Academic & Non-Academic Staff</span>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            color: '#ef4444',
            fontSize: '0.85rem',
            marginBottom: '1rem'
          }}
        >
          {error}
        </div>
      )}

      {/* Official Sign In Form */}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" style={{ color: '#cbd5e1' }}>Staff Email Address</label>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="email"
              required
              placeholder="staff@dept.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.25rem', background: '#0f172a', borderColor: '#334155', color: '#ffffff' }}
            />
          </div>
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label" style={{ color: '#cbd5e1' }}>Password</label>
            <Link to="/forgot-password" style={{ fontSize: '0.75rem', color: '#60a5fa' }}>Forgot Password?</Link>
          </div>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.25rem', background: '#0f172a', borderColor: '#334155', color: '#ffffff' }}
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn btn-success" style={{ width: '100%', marginTop: '0.5rem' }}>
          {loading ? 'Authenticating...' : 'Sign In as Staff'} <ArrowRight size={16} />
        </button>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading || googleLoading}
          className="btn btn-secondary"
          style={{ width: '100%', marginTop: '0.75rem', justifyContent: 'center' }}
        >
          <Chrome size={16} /> {googleLoading ? 'Opening Google Sign-In...' : 'Continue with Google'}
        </button>

        <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#f59e0b', textAlign: 'center' }}>
          Staff must create an account first before they can sign in using email/password or Google.
        </div>
      </form>

      <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>
        New IT Staff Member? <Link to="/staff/register" style={{ color: '#10b981', fontWeight: 600 }}>Create Staff Account</Link>
        <div style={{ marginTop: '0.5rem' }}>
          Are you an Administrator? <Link to="/admin/login" style={{ color: '#60a5fa', fontWeight: 600 }}>Admin Login Here</Link>
        </div>
      </div>
    </div>
  );
};
