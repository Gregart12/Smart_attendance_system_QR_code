import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { MIN_ADMIN_PASSCODE_LENGTH } from '../../firebase/adminPasscode';
import { User, Mail, Lock, Building, KeyRound, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { FutoCrestLogo } from '../../components/common/FutoCrestLogo';

const fieldStyle = {
  width: '100%',
  paddingLeft: '2.25rem',
  background: '#0f172a',
  borderColor: '#334155',
  color: '#ffffff'
};

export const AdminRegister: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('Directorate of Information Technology');
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { registerAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await registerAdmin(name, email, password, department, passcode);
      // The passcode is not needed again, so drop it from component state.
      setPasscode('');
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Failed to create admin account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
        <FutoCrestLogo size={54} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.5rem 0 0.2rem 0', color: '#ffffff' }}>
          HOD / Admin Account Registration
        </h2>
        <p style={{ fontSize: '0.78rem', color: '#f59e0b', margin: 0, fontWeight: 600 }}>
          Restricted Portal Access for FUTO Directorate Leaders
        </p>
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

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" style={{ color: '#cbd5e1' }}>Full Name &amp; Academic Title</label>
          <div style={{ position: 'relative' }}>
            <User size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              required
              autoComplete="name"
              placeholder="Prof. / Dr. Gregory Okpala (HOD)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              style={fieldStyle}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ color: '#cbd5e1' }}>Official FUTO Admin Email</label>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="hod.ict@futo.edu.ng"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              style={fieldStyle}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ color: '#cbd5e1' }}>Directorate / Department</label>
          <div style={{ position: 'relative' }}>
            <Building size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              required
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="form-input"
              style={fieldStyle}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ color: '#cbd5e1' }}>Create Password</label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              style={fieldStyle}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ color: '#cbd5e1' }}>Administrator Passcode</label>
          <div style={{ position: 'relative' }}>
            <KeyRound size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type={showPasscode ? 'text' : 'password'}
              required
              minLength={MIN_ADMIN_PASSCODE_LENGTH}
              autoComplete="off"
              spellCheck={false}
              placeholder={`Issued by the HOD, at least ${MIN_ADMIN_PASSCODE_LENGTH} characters`}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="form-input"
              style={{ ...fieldStyle, paddingRight: '2.5rem' }}
            />
            <button
              type="button"
              onClick={() => setShowPasscode((v) => !v)}
              aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
              style={{
                position: 'absolute',
                right: '0.65rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '0.2rem',
                display: 'flex',
                color: '#64748b'
              }}
            >
              {showPasscode ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
          {loading ? 'Registering...' : 'Register HOD / Administrator'} <ArrowRight size={16} />
        </button>
      </form>

      <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>
        Already registered? <Link to="/admin/login" style={{ color: '#60a5fa', fontWeight: 600 }}>Admin Sign In</Link>
      </div>
    </div>
  );
};
