import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserCheck, User, Mail, Lock, Building, CreditCard, ArrowRight, Chrome } from 'lucide-react';

export const StaffRegister: React.FC = () => {
  const [name, setName] = useState('');
  const [staffId, setStaffId] = useState(`IT/2026/${Math.floor(100 + Math.random() * 900)}`);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('Department of Information Technology');
  const [designation, setDesignation] = useState('IT Lecturer / Systems Officer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { registerStaff, continueWithGoogle, role, userProfile } = useAuth();
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
      await registerStaff(name, staffId, email, password, department, designation);
      navigate('/staff/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to register staff account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setGoogleLoading(true);
    setError('');

    try {
      await continueWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google account creation could not be completed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <UserCheck size={22} color="#10b981" />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
          Staff Account Registration
        </h2>
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
          <label className="form-label" style={{ color: '#cbd5e1' }}>Full Name</label>
          <div style={{ position: 'relative' }}>
            <User size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              required
              placeholder="Engr. Sarah Jenkins"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.25rem', background: '#0f172a', borderColor: '#334155', color: '#ffffff' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="form-group">
            <label className="form-label" style={{ color: '#cbd5e1' }}>Staff ID</label>
            <div style={{ position: 'relative' }}>
              <CreditCard size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                required
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '2.25rem', background: '#0f172a', borderColor: '#334155', color: '#ffffff' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ color: '#cbd5e1' }}>Designation</label>
            <input
              type="text"
              required
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              className="form-input"
              style={{ background: '#0f172a', borderColor: '#334155', color: '#ffffff' }}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ color: '#cbd5e1' }}>Official Staff Email</label>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="email"
              required
              placeholder="s.jenkins@dept.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.25rem', background: '#0f172a', borderColor: '#334155', color: '#ffffff' }}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ color: '#cbd5e1' }}>Department</label>
          <div style={{ position: 'relative' }}>
            <Building size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              required
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.25rem', background: '#0f172a', borderColor: '#334155', color: '#ffffff' }}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ color: '#cbd5e1' }}>Password</label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="password"
              required
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.25rem', background: '#0f172a', borderColor: '#334155', color: '#ffffff' }}
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn btn-success" style={{ width: '100%', marginTop: '0.5rem' }}>
          {loading ? 'Registering...' : 'Register Staff Account'} <ArrowRight size={16} />
        </button>

        <button
          type="button"
          onClick={handleGoogleRegister}
          disabled={loading || googleLoading}
          className="btn btn-secondary"
          style={{ width: '100%', marginTop: '0.75rem', justifyContent: 'center' }}
        >
          <Chrome size={16} /> {googleLoading ? 'Opening Google Sign-In...' : 'Continue with Google'}
        </button>
      </form>

      <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>
        Already registered? <Link to="/staff/login" style={{ color: '#10b981', fontWeight: 600 }}>Sign In Here</Link>
      </div>
    </div>
  );
};
