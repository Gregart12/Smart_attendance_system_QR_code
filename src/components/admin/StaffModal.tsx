import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { StaffProfile } from '../../types';
import { updateStaffProfile } from '../../firebase/services';
import { createStaffAuthAccount } from '../../firebase/accountCreation';
import { validatePassword } from '../../firebase/errors';
import { User, Mail, ShieldAlert, Upload, KeyRound } from 'lucide-react';

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffToEdit?: StaffProfile | null;
  onSaved?: () => void;
}

export const StaffModal: React.FC<StaffModalProps> = ({
  isOpen,
  onClose,
  staffToEdit,
  onSaved
}) => {
  const [name, setName] = useState('');
  const [staffId, setStaffId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('Department of Information Technology');
  const [designation, setDesignation] = useState('System Analyst');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'active' | 'suspended' | 'inactive'>('active');
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = Boolean(staffToEdit);

  useEffect(() => {
    setError('');
    if (staffToEdit) {
      setName(staffToEdit.name);
      setStaffId(staffToEdit.staffId);
      setEmail(staffToEdit.email);
      setPassword('');
      setDepartment(staffToEdit.department || 'Department of Information Technology');
      setDesignation(staffToEdit.designation || 'Lecturer / IT Officer');
      setPhone(staffToEdit.phone || '');
      setStatus(staffToEdit.status);
      setPhotoUrl(staffToEdit.photoUrl || '');
    } else {
      setName('');
      setStaffId(`IT/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`);
      setEmail('');
      setPassword('');
      setDepartment('Department of Information Technology');
      setDesignation('IT Officer');
      setPhone('');
      setStatus('active');
      setPhotoUrl('');
    }
  }, [staffToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isEditing) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }
    }

    setLoading(true);

    try {
      if (staffToEdit) {
        await updateStaffProfile(staffToEdit.uid, {
          name,
          staffId,
          email,
          department,
          designation,
          phone,
          status,
          photoUrl
        });
      } else {
        // Creates a real Firebase Auth sign-in account, not just a database row.
        await createStaffAuthAccount({
          name,
          staffId,
          email,
          password,
          department,
          designation,
          phone,
          photoUrl,
          status
        });
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save staff record. Please try again.');
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={staffToEdit ? 'Edit Staff Profile' : 'Register New Staff Member'}
    >
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
              color: 'var(--danger-color)',
              fontSize: '0.85rem',
              marginBottom: '1rem'
            }}
          >
            <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        {/* Photo Upload Preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--accent-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              border: '2px solid var(--accent-primary)'
            }}
          >
            {photoUrl ? (
              <img src={photoUrl} alt="Passport" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={32} color="var(--accent-primary)" />
            )}
          </div>

          <div>
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
              <Upload size={14} /> Upload Passport Image
              <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
            </label>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', margin: 0 }}>
              JPG or PNG passport photograph
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              placeholder="Engr. John Doe"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Staff ID Number</label>
            <input
              type="text"
              required
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="form-input"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Official Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="john.doe@dept.edu"
            />
          </div>

          {!isEditing && (
            <div className="form-group">
              <label className="form-label">
                <KeyRound size={12} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
                Initial Password
              </label>
              <input
                type="text"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="Min. 6 characters"
                autoComplete="new-password"
              />
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                Creates the staff sign-in account. Share it securely and ask them to change it after
                first login.
              </p>
            </div>
          )}

          {isEditing && (
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="form-input"
              />
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Designation / Role</label>
            <input
              type="text"
              required
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="form-select"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={loading}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading
              ? isEditing
                ? 'Saving...'
                : 'Creating sign-in account...'
              : isEditing
                ? 'Save Staff Profile'
                : 'Create Staff Account'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
