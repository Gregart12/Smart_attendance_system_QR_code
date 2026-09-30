import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { createAttendanceSession } from '../../firebase/services';
import { createQRPayload, generateQRDataUrl } from '../../utils/qrCodeGenerator';
import { getCurrentDateFormatted, getCurrentTimeFormatted } from '../../utils/dateUtils';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import { CountdownTimer } from '../common/CountdownTimer';
import { QrCode, Copy, Check, MapPin, Clock, Sparkles } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
  adminName: string;
}

export const CreateQRSessionModal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  adminName
}) => {
  // Geofence defaults come from Admin Settings, so the scanner enforces the
  // coordinates the department actually configured.
  const { settings, center } = useSystemSettings();

  const [title, setTitle] = useState('IT Staff Morning Attendance Check');
  const [department, setDepartment] = useState('Department of Information Technology');
  const [date, setDate] = useState(getCurrentDateFormatted());
  const [startTime, setStartTime] = useState(getCurrentTimeFormatted());
  const durationMinutes = 10;

  // Held as strings: Number('') is 0, so a number input bound directly to a
  // number collapses to 0 the moment the admin clears it to retype.
  const [latitude, setLatitude] = useState(String(center.latitude));
  const [longitude, setLongitude] = useState(String(center.longitude));
  const [radiusMeters, setRadiusMeters] = useState(String(center.radiusMeters));
  const [buildingName, setBuildingName] = useState(center.buildingName);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedQRUrl, setGeneratedQRUrl] = useState<string | null>(null);
  const [generatedPayload, setGeneratedPayload] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Reseed the geofence fields from the live settings each time the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setDepartment((prev) => prev || settings.departmentName);
    setLatitude(String(center.latitude));
    setLongitude(String(center.longitude));
    setRadiusMeters(String(center.radiusMeters));
    setBuildingName(center.buildingName);
  }, [isOpen, center.latitude, center.longitude, center.radiusMeters, center.buildingName, settings.departmentName]);

  const handleGenerateQR = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const lat = Number(latitude);
    const lng = Number(longitude);
    const radius = Number(radiusMeters);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setError('Enter a valid latitude between -90 and 90.');
      return;
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      setError('Enter a valid longitude between -180 and 180.');
      return;
    }
    if (!Number.isFinite(radius) || radius <= 0 || radius > 250) {
      setError('The geofence radius must be between 1 and 250 metres.');
      return;
    }

    // The QR must be valid for the selected window, not for "now": the previous
    // implementation ignored these fields and started counting immediately.
    const startTs = new Date(`${date}T${startTime.slice(0, 8)}`).getTime();
    if (!Number.isFinite(startTs)) {
      setError('Enter a valid start date and time.');
      return;
    }
    if (startTs < Date.now() - 5 * 60 * 1000) {
      setError('The selected start time is in the past. Choose a current or future time so the QR is not born expired.');
      return;
    }

    setLoading(true);
    try {
      const tempId = `SESSION_${Date.now()}`;
      const { rawPayload, qrString, expiresAt } = createQRPayload(
        tempId,
        title,
        department,
        lat,
        lng,
        radius,
        durationMinutes,
        startTs
      );

      const qrDataUrl = await generateQRDataUrl(qrString);

      const endTimeDate = new Date(expiresAt);
      const createdId = await createAttendanceSession({
        title,
        department,
        date,
        startTime: startTime.slice(0, 5),
        endTime: `${String(endTimeDate.getHours()).padStart(2, '0')}:${String(endTimeDate.getMinutes()).padStart(2, '0')}`,
        durationMinutes,
        latitude: lat,
        longitude: lng,
        radiusMeters: radius,
        buildingName,
        sessionToken: rawPayload.token,
        expiresAt,
        createdBy: adminName,
        status: 'active'
      });

      // Regenerate with the real session id so scans resolve to a real session.
      rawPayload.sessionId = createdId;
      const finalQRString = JSON.stringify(rawPayload);
      const finalQRUrl = await generateQRDataUrl(finalQRString);

      setGeneratedQRUrl(finalQRUrl);
      setGeneratedPayload(rawPayload);

      if (onCreated) onCreated();
    } catch (err) {
      console.error('Failed creating QR session:', err);
      setError('Error generating QR attendance session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedPayload) {
      navigator.clipboard.writeText(JSON.stringify(generatedPayload));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Smart QR Attendance Session" maxWidth="620px">
      {!generatedQRUrl ? (
        <form onSubmit={handleGenerateQR}>
          {error && (
            <div
              style={{
                padding: '0.75rem',
                marginBottom: '1rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--danger-bg)',
                border: '1px solid var(--danger-color)',
                color: 'var(--danger-color)',
                fontSize: '0.85rem'
              }}
            >
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Attendance Session Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
              placeholder="e.g. Department Staff Roll Call"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Department</label>
              <input
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Start Time</label>
              <input
                type="time"
                step="1"
                required
                value={startTime.slice(0, 5)}
                onChange={(e) => setStartTime(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">QR Expiry Duration</label>
              <input type="text" value="10 Minutes" readOnly className="form-input" />
            </div>
          </div>

          {/* Geofence Configuration */}
          <div
            style={{
              padding: '1rem',
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.25rem',
              border: '1px solid var(--border-color)'
            }}
          >
            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <MapPin size={16} className="text-primary" /> Geofence Location Boundary
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Radius (Meters)</label>
                <input
                  type="number"
                  min="1"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(e.target.value)}
                  max="250"
                  className="form-input"
                  style={{ fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '0.6rem 0 0' }}>
              Defaults come from Admin Settings. Staff are checked against this radius when they scan.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              <Sparkles size={16} /> {loading ? 'Generating QR...' : 'Generate Attendance QR'}
            </button>
          </div>
        </form>
      ) : (
        /* Generated Active QR View */
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div style={{ marginBottom: '1rem' }}>
            <CountdownTimer expiresAt={generatedPayload.expiresAt} />
          </div>

          <div
            style={{
              background: '#ffffff',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              display: 'inline-block',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              border: '2px solid var(--accent-primary)',
              marginBottom: '1rem'
            }}
          >
            <img src={generatedQRUrl} alt="Attendance QR Code" style={{ width: '240px', height: '240px', display: 'block' }} />
          </div>

          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>{generatedPayload.title}</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            📍 {generatedPayload.department} | Geofence Radius: {generatedPayload.radiusMeters}m
          </p>

          <div
            style={{
              background: 'var(--bg-primary)',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              marginBottom: '1.25rem',
              textAlign: 'left'
            }}
          >
            <p style={{ margin: 0, fontWeight: 600 }}>
              <Clock size={12} /> Raw QR Payload (display or copy if the QR will not scan)
            </p>
            <code style={{ fontSize: '0.7rem', wordBreak: 'break-all', color: 'var(--accent-primary)' }}>
              {JSON.stringify(generatedPayload)}
            </code>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={copyToClipboard} className="btn btn-secondary btn-sm">
              {copied ? <Check size={14} color="var(--success-color)" /> : <Copy size={14} />}
              {copied ? 'Copied QR Payload!' : 'Copy QR Payload'}
            </button>
            <button
              onClick={() => {
                setGeneratedQRUrl(null);
                onClose();
              }}
              className="btn btn-primary btn-sm"
            >
              <QrCode size={14} /> Done / Close Session
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
