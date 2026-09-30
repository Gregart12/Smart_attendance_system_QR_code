import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { updateStaffProfile } from '../../firebase/services';
import { auth } from '../../firebase/config';
import { updateEmail } from 'firebase/auth';
import { normalizeEmail, toFriendlyError } from '../../firebase/errors';
import { User, Phone, Mail, Building, Upload, Save, Check, ShieldCheck } from 'lucide-react';

export const StaffProfile: React.FC = () => {
  const { userProfile, refreshProfile } = useAuth();
  const staff = userProfile as any;

  const [name, setName] = useState(staff?.name || '');
  const [staffId, setStaffId] = useState(staff?.staffId || '');
  const [email, setEmail] = useState(staff?.email || '');
  const [department, setDepartment] = useState(staff?.department || '');
  const [staffCategory, setStaffCategory] = useState<'academic' | 'non-academic'>(staff?.staffCategory || 'academic');
  const [phone, setPhone] = useState(staff?.phone || '');
  const [designation, setDesignation] = useState(staff?.designation || '');
  const [photoUrl, setPhotoUrl] = useState(staff?.photoUrl || '');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setName(staff?.name || '');
    setStaffId(staff?.staffId || '');
    setEmail(staff?.email || '');
    setDepartment(staff?.department || '');
    setStaffCategory(staff?.staffCategory || 'academic');
    setPhone(staff?.phone || '');
    setDesignation(staff?.designation || '');
    setPhotoUrl(staff?.photoUrl || '');
  }, [staff]);

  const needsCompletion = !phone || !photoUrl;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (staff?.uid) {
        const normalizedEmail = normalizeEmail(email);
        if (!normalizedEmail) throw new Error('Enter a valid email address.');

        if (auth.currentUser && normalizedEmail !== normalizeEmail(auth.currentUser.email || '')) {
          await updateEmail(auth.currentUser, normalizedEmail);
        }

        await updateStaffProfile(staff.uid, {
          name,
          staffId,
          email: normalizedEmail,
          department,
          staffCategory,
          phone,
          designation,
          photoUrl
        });
        await refreshProfile();
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch (err) {
      console.error('Failed updating profile:', err);
      setError(toFriendlyError(err, 'Failed to update your profile. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '760px' }}>
      <div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
          Staff Record Profile
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
          Complete your official profile details and update your passport image anytime.
        </p>
      </div>

      {needsCompletion && (
        <div
          className="glass-card"
          style={{
            borderColor: 'var(--futo-gold-primary)',
            background: 'var(--bg-surface)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 700, color: 'var(--futo-gold-primary)' }}>
            <ShieldCheck size={18} /> Complete your staff profile to continue using attendance features.
          </div>
        </div>
      )}

      {saved && (
        <div
          style={{
            padding: '0.85rem',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--success-bg)',
            border: '1px solid var(--success-color)',
            color: 'var(--success-color)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Check size={18} /> Profile successfully updated!
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{
            padding: '0.85rem',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid var(--danger-color)',
            color: 'var(--danger-color)',
            fontWeight: 600
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="glass-card" style={{ padding: '1.35rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '92px',
              height: '92px',
              borderRadius: '50%',
              background: 'var(--accent-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              border: '3px solid var(--accent-primary)',
              boxShadow: '0 10px 20px rgba(4, 120, 87, 0.16)'
            }}
          >
            {photoUrl ? (
              <img src={photoUrl} alt="Passport" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={40} color="var(--accent-primary)" />
            )}
          </div>

          <div>
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
              <Upload size={14} /> Upload Passport Image
              <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
            </label>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem', margin: 0 }}>
              Upload your official passport photograph for attendance verification.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="form-input" />
          </div>

          <div className="form-group">
            <label className="form-label">Staff ID</label>
            <input type="text" required value={staffId} onChange={(e) => setStaffId(e.target.value)} className="form-input" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="form-input"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Department</label>
            <input type="text" required value={department} onChange={(e) => setDepartment(e.target.value)} className="form-input" />
          </div>

          <div className="form-group">
            <label className="form-label">Staff Category</label>
            <select value={staffCategory} onChange={(e) => setStaffCategory(e.target.value as 'academic' | 'non-academic')} className="form-select">
              <option value="academic">Academic Staff</option>
              <option value="non-academic">Non-Academic Staff</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Designation</label>
            <input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} className="form-input" />
        </div>

        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={loading} className="btn btn-primary">
            <Save size={16} /> {loading ? 'Updating...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
