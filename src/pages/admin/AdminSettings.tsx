import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSystemSettings, saveSystemSettings, updateAdminProfile } from '../../firebase/services';
import { SystemSettings } from '../../types';
import { DEFAULT_IT_DEPT_GEO, MAX_GEOFENCE_RADIUS_METERS } from '../../utils/haversine';
import { useAuth } from '../../contexts/AuthContext';
import { GeofenceLocationPicker } from '../../components/admin/GeofenceLocationPicker';
import { MapPin, Save, Check, UserRound, ShieldCheck, BarChart3, Users, BellRing, Upload } from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const { userProfile, refreshProfile } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>({
    defaultLat: DEFAULT_IT_DEPT_GEO.latitude,
    defaultLng: DEFAULT_IT_DEPT_GEO.longitude,
    defaultRadius: DEFAULT_IT_DEPT_GEO.radiusMeters,
    departmentName: 'Department of Information Technology',
    buildingName: DEFAULT_IT_DEPT_GEO.buildingName
  });

  // The coordinate fields are held as raw strings. Binding a number input
  // directly to a number turns a cleared field into 0 (Number('') === 0) and
  // immediately writes "0" back into the box, so retyping a coordinate produces
  // garbage like 50321.
  const [latInput, setLatInput] = useState(String(DEFAULT_IT_DEPT_GEO.latitude));
  const [lngInput, setLngInput] = useState(String(DEFAULT_IT_DEPT_GEO.longitude));
  const [radiusInput, setRadiusInput] = useState(String(DEFAULT_IT_DEPT_GEO.radiusMeters));
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [profileName, setProfileName] = useState('');
  const [profileDepartment, setProfileDepartment] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [profileAccountTitle, setProfileAccountTitle] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    setProfileName(userProfile?.name || '');
    setProfileDepartment(userProfile?.department || '');
    setProfilePhone(userProfile?.phone || '');
    setProfilePhotoUrl(userProfile?.photoUrl || '');
    setProfileAccountTitle(userProfile?.accountTitle || 'HOD / Director');
  }, [userProfile]);

  useEffect(() => {
    getSystemSettings().then((res) => {
      setSettings(res);
      setLatInput(String(res.defaultLat));
      setLngInput(String(res.defaultLng));
      setRadiusInput(String(res.defaultRadius));
    });
  }, []);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileLoading(true);
    try {
      if (!userProfile?.uid) throw new Error('Your administrator session has expired. Please sign in again.');
      if (!profileName.trim() || !profileDepartment.trim()) {
        throw new Error('Name and department are required.');
      }
      await updateAdminProfile(userProfile.uid, {
        name: profileName,
        department: profileDepartment,
        phone: profilePhone,
        photoUrl: profilePhotoUrl,
        accountTitle: profileAccountTitle
      });
      await refreshProfile();
      setProfileSaved(true);
      window.setTimeout(() => setProfileSaved(false), 2500);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Could not save your profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleProfilePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfileError('Please choose an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setProfilePhotoUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaved(false);

    const lat = Number(latInput);
    const lng = Number(lngInput);
    const radius = Number(radiusInput);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setError('Latitude must be a number between -90 and 90.');
      return;
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      setError('Longitude must be a number between -180 and 180.');
      return;
    }
    if (!Number.isFinite(radius) || radius <= 0 || radius > MAX_GEOFENCE_RADIUS_METERS) {
      setError(`The allowed radius must be between 1 and ${MAX_GEOFENCE_RADIUS_METERS} metres.`);
      return;
    }

    setLoading(true);
    try {
      await saveSystemSettings({ ...settings, defaultLat: lat, defaultLng: lng, defaultRadius: radius });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Settings save error:', err);
      setError('Could not save settings. Check your connection and permissions, then try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '920px' }}>
      <div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
          Admin Settings & Control Center
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
          Manage your profile, geofence, and the most important operational tools for the attendance system.
        </p>
      </div>

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
          <Check size={18} /> Settings successfully saved and updated.
        </div>
      )}

      <form onSubmit={handleProfileSave} className="glass-card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem' }}>
          <div style={{ padding: '0.55rem', borderRadius: '10px', background: 'var(--accent-light)', color: 'var(--accent-primary)' }}>
            <UserRound size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Admin Profile Settings</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
              {userProfile?.name || 'Administrator'} • {userProfile?.email || 'admin@dept.edu'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', background: 'var(--accent-light)', border: '2px solid var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {profilePhotoUrl ? <img src={profilePhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : <UserRound size={28} color="var(--accent-primary)" />}
          </div>
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
            <Upload size={14} /> Upload Profile Image
            <input type="file" accept="image/*" onChange={handleProfilePhotoUpload} style={{ display: 'none' }} />
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" required value={profileName} onChange={(e) => setProfileName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Department</label>
            <input className="form-input" required value={profileDepartment} onChange={(e) => setProfileDepartment(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input className="form-input" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Account Role</label>
            <input className="form-input" required value={profileAccountTitle} onChange={(e) => setProfileAccountTitle(e.target.value)} />
          </div>
        </div>
        {profileError && <p style={{ color: 'var(--danger-color)', fontSize: '0.85rem', margin: '0.5rem 0' }}>{profileError}</p>}
        {profileSaved && <p style={{ color: 'var(--success-color)', fontSize: '0.85rem', margin: '0.5rem 0' }}>Admin profile updated.</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button type="submit" disabled={profileLoading} className="btn btn-primary"><Save size={16} /> {profileLoading ? 'Saving...' : 'Save Admin Profile'}</button>
        </div>
      </form>

      <div className="glass-card" style={{ borderLeft: '4px solid var(--futo-gold-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.9rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'var(--futo-gold-light)', color: 'var(--futo-gold-primary)' }}>
            <BellRing size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Priority Admin Tools</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>Use the most relevant operational modules from here.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.8rem' }}>
          <Link to="/admin/dashboard" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
            <BarChart3 size={16} /> Overview Dashboard
          </Link>
          <Link to="/admin/staff-management" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
            <Users size={16} /> Staff Directory
          </Link>
          <Link to="/admin/attendance-records" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
            <MapPin size={16} /> Attendance Logs
          </Link>
        </div>
      </div>

      <form onSubmit={handleSave} className="glass-card">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapPin size={18} className="text-primary" /> Geofence & Access Settings
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '-0.5rem' }}>
          QR sessions use this saved building location, not the admin device location. Set the pin at the attendance venue; the default boundary is 200 m and can be adjusted up to {MAX_GEOFENCE_RADIUS_METERS} m.
        </p>

        <div className="form-group">
          <label className="form-label">Department Name</label>
          <input
            type="text"
            required
            value={settings.departmentName}
            onChange={(e) => setSettings({ ...settings, departmentName: e.target.value })}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Building / Facility Name</label>
          <input
            type="text"
            required
            value={settings.buildingName}
            onChange={(e) => setSettings({ ...settings, buildingName: e.target.value })}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Attendance Venue Location</label>
          <GeofenceLocationPicker
            latitude={Number(latInput)}
            longitude={Number(lngInput)}
            onLocationSelect={(latitude, longitude) => {
              setLatInput(latitude.toFixed(6));
              setLngInput(longitude.toFixed(6));
            }}
          />
          <details style={{ marginTop: '0.6rem' }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Coordinates (advanced)
            </summary>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.6rem' }}>
              <input
                type="number"
                step="0.000001"
                aria-label="Latitude"
                value={latInput}
                onChange={(event) => setLatInput(event.target.value)}
                className="form-input"
              />
              <input
                type="number"
                step="0.000001"
                aria-label="Longitude"
                value={lngInput}
                onChange={(event) => setLngInput(event.target.value)}
                className="form-input"
              />
            </div>
          </details>
        </div>

        <div className="form-group" style={{ maxWidth: '240px' }}>
          <label className="form-label">Allowed Radius (Meters)</label>
          <input
            type="number"
            min="1"
            max={MAX_GEOFENCE_RADIUS_METERS}
            required
            value={radiusInput}
            onChange={(e) => setRadiusInput(e.target.value)}
            className="form-input"
          />
        </div>

        {error && (
          <p style={{ color: 'var(--danger-color)', fontSize: '0.85rem', margin: '0 0 0.75rem 0' }}>{error}</p>
        )}

        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => {
              const defaults = {
                defaultLat: DEFAULT_IT_DEPT_GEO.latitude,
                defaultLng: DEFAULT_IT_DEPT_GEO.longitude,
                defaultRadius: DEFAULT_IT_DEPT_GEO.radiusMeters,
                departmentName: 'Department of Information Technology',
                buildingName: DEFAULT_IT_DEPT_GEO.buildingName
              };
              setSettings(defaults);
              setLatInput(String(defaults.defaultLat));
              setLngInput(String(defaults.defaultLng));
              setRadiusInput(String(defaults.defaultRadius));
            }}
            className="btn btn-secondary"
          >
            Reset to Defaults
          </button>

          <button type="submit" disabled={loading} className="btn btn-primary">
            <Save size={16} /> {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};
