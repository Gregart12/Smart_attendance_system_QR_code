import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Modal } from '../common/Modal';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import { parseAndValidateQRPayload, QRPayload } from '../../utils/qrCodeGenerator';
import { isWithinGeofence } from '../../utils/haversine';
import { getDeviceInfo } from '../../utils/deviceDetector';
import { getCurrentDateFormatted, getCurrentTimeFormatted } from '../../utils/dateUtils';
import { recordAttendance, checkExistingAttendance, getAttendanceSessionForScan } from '../../firebase/services';
import { MapPin, Camera, Upload, CheckCircle2, AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';

interface ScannerProps {
  isOpen: boolean;
  onClose: () => void;
  staffProfile: any;
  onSuccess?: () => void;
}

// GPS accuracy is the uncertainty of the fix, not a distance from the
// building. It needs its own tolerance: indoor cellular fixes routinely report
// 100-3000m of accuracy even while standing under the QR code.
const MAX_ACCURACY_METERS = 50;

const ALLOW_TEST_TOOLS = import.meta.env.DEV;

export const QRScannerModal: React.FC<ScannerProps> = ({
  isOpen,
  onClose,
  staffProfile,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'simulate'>('camera');
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    details?: {
      sessionTitle: string;
      distance: number;
      status: string;
    };
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanNonce, setScanNonce] = useState(0);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileScannerRef = useRef<Html5Qrcode | null>(null);

  const { center } = useSystemSettings();

  const {
    latitude,
    longitude,
    accuracy,
    loading: geoLoading,
    error: geoError,
    distanceFromDept,
    refreshLocation
  // Location is only requested while the scanner is open: prompting for GPS on
  // page load is treated as a poor-practice signal and is often auto-denied.
  } = useGeolocation(center, isOpen);

  const stopCamera = useCallback(() => {
    const instance = html5QrCodeRef.current;
    html5QrCodeRef.current = null;
    if (!instance) return;
    // Do not gate on isScanning: a pending start() has isScanning === false
    // while its decode loop is already live, which would leak the camera.
    try {
      const stopping = instance.stop();
      if (stopping && typeof stopping.catch === 'function') {
        stopping.catch(() => {});
      }
    } catch {
      // Instance was never started.
    }
    try {
      instance.clear();
    } catch {
      // Element already removed.
    }
  }, []);

  const handleQRScanned = useCallback(async (qrText: string) => {
    setLoading(true);
    setScanResult(null);

    const fail = (message: string) => {
      setScanResult({ success: false, message });
    };

    try {
      // 1. Validate QR JSON structure, geofence fields and expiry
      const parsed = parseAndValidateQRPayload(qrText);
      if (!parsed.valid || !parsed.payload) {
        fail(parsed.error || 'Invalid or Expired QR Code.');
        return;
      }

      const payload: QRPayload = parsed.payload;

      // 2. The payload must reference a real, still-open session. Without this
      // a hand-written payload pointing at a non-existent session would be
      // accepted. The session document is authoritative for the geofence.
      const session = await getAttendanceSessionForScan(payload.sessionId);
      if (!session) {
        fail('This QR code does not match any attendance session. Please ask the admin for an active session.');
        return;
      }
      if (session.status !== 'active') {
        fail(`This session was ${session.status}. Please ask the admin to start a new session.`);
        return;
      }
      if (typeof session.expiresAt !== 'number' || Date.now() > session.expiresAt) {
        fail('This QR Code session has expired. Please ask the admin for a new session.');
        return;
      }

      // 3. Verify live GPS proximity before accepting the QR scan
      if (geoLoading) {
        fail('Waiting for your location to be verified before accepting the QR scan.');
        return;
      }

      if (geoError || latitude === null || longitude === null || accuracy === null) {
        fail('Location access is required to verify that you are within the attendance geofence before scanning.');
        return;
      }

      if (accuracy > MAX_ACCURACY_METERS) {
        fail(
          `Your GPS fix is not precise enough to verify proximity (accuracy ±${Math.round(accuracy)}m, needs ±${MAX_ACCURACY_METERS}m). Move near a window or outdoors and scan again.`
        );
        return;
      }

      // The session document wins over the payload for the geofence.
      const sessionLat = Number.isFinite(session.latitude) ? session.latitude : payload.latitude;
      const sessionLng = Number.isFinite(session.longitude) ? session.longitude : payload.longitude;
      const allowedRadiusMeters = Number.isFinite(session.radiusMeters)
        ? session.radiusMeters
        : payload.radiusMeters;

      if (allowedRadiusMeters < 1 || allowedRadiusMeters > 250) {
        fail('This QR session has an invalid geofence. Please ask the admin to generate a new QR code.');
        return;
      }

      const geoCheck = isWithinGeofence(latitude, longitude, sessionLat, sessionLng, allowedRadiusMeters);

      if (!geoCheck.isInside) {
        fail(
          `You are outside the attendance geofence. You are ${geoCheck.distanceMeters}m from the QR session center and the allowed radius is ${allowedRadiusMeters}m.`
        );
        return;
      }

      // 4. Check if staff already marked attendance for this session today
      const alreadyMarked = await checkExistingAttendance(payload.sessionId, staffProfile.uid);
      if (alreadyMarked) {
        fail('You have ALREADY marked attendance for this session today!');
        return;
      }

      // 5. Record attendance in the database
      const sessionStart = Number.isFinite(payload.timestamp) ? payload.timestamp : payload.expiresAt;
      const windowMs = Math.max(0, payload.expiresAt - sessionStart);
      const isLate = Date.now() > sessionStart + windowMs * 0.75;
      const recordStatus = isLate ? 'late' : 'present';

      const sessionTitle = session.title || payload.title || 'Department Staff Check-in';

      await recordAttendance({
        sessionId: session.id,
        sessionTitle,
        staffUid: staffProfile.uid,
        staffId: staffProfile.staffId || 'IT/2026/STAFF',
        staffName: staffProfile.name,
        department: session.department || staffProfile.department || 'Department of Information Technology',
        date: getCurrentDateFormatted(),
        time: getCurrentTimeFormatted(),
        latitude,
        longitude,
        distanceFromCenterMeters: geoCheck.distanceMeters,
        status: recordStatus,
        deviceInfo: getDeviceInfo()
      });

      setScanResult({
        success: true,
        message: `Attendance marked successfully as ${recordStatus.toUpperCase()}!`,
        details: {
          sessionTitle,
          distance: geoCheck.distanceMeters,
          status: recordStatus
        }
      });

      stopCamera();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Attendance recording error:', err);
      fail('Failed recording attendance. Please try again or notify admin.');
    } finally {
      setLoading(false);
    }
  }, [geoLoading, geoError, latitude, longitude, accuracy, staffProfile, onSuccess, stopCamera]);

  // Initialize HTML5 QR Code Scanner
  useEffect(() => {
    let cancelled = false;

    if (isOpen && activeTab === 'camera') {
      setCameraError(null);
      const startCamera = async () => {
        if (!document.getElementById('qr-reader')) return;
        try {
          const instance = new Html5Qrcode('qr-reader');
          html5QrCodeRef.current = instance;
          await instance.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 220, height: 220 } },
            (decodedText) => {
              if (cancelled) return;
              stopCamera();
              void handleQRScanned(decodedText);
            },
            () => {}
          );
        } catch (err) {
          if (!cancelled) {
            console.warn('Camera access warning:', err);
            setCameraError('Unable to access camera. Allow camera permission, or use the Upload Image tab instead.');
          }
        }
      };

      void startCamera();
    }

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [isOpen, activeTab, scanNonce, handleQRScanned, stopCamera]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    const instance = new Html5Qrcode('qr-reader-file');
    fileScannerRef.current = instance;

    instance
      .scanFile(file, true)
      .then((decodedText) => {
        void handleQRScanned(decodedText);
      })
      .catch(() => {
        setScanResult({
          success: false,
          message: 'No valid QR Code image found in uploaded file.'
        });
      })
      .finally(() => {
        try {
          instance.clear();
        } catch {
          // Element already removed.
        }
        if (fileScannerRef.current === instance) fileScannerRef.current = null;
        // Reset so re-selecting the same file fires a change event.
        input.value = '';
      });
  };

  const restartCamera = () => {
    setScanResult(null);
    setScanNonce((n) => n + 1);
  };

  const locationUnavailable = geoError !== null || latitude === null || longitude === null;
  const withinDepartmentBoundary =
    !locationUnavailable && distanceFromDept !== null && distanceFromDept <= center.radiusMeters;

  let bannerStyle: React.CSSProperties;
  let bannerText: string;
  if (geoLoading && !locationUnavailable) {
    bannerStyle = { background: 'var(--info-bg, rgba(59,130,246,0.1))', border: '1px solid var(--info-color, #3b82f6)' };
    bannerText = 'Locating you...';
  } else if (locationUnavailable) {
    // Never fall back to the department centre here: a user whose location was
    // denied would otherwise be told they are 0m away and inside the fence.
    bannerStyle = { background: 'var(--danger-bg)', border: '1px solid var(--danger-color)' };
    bannerText = 'Location unavailable — cannot verify attendance proximity';
  } else if (withinDepartmentBoundary) {
    bannerStyle = { background: 'var(--success-bg)', border: '1px solid var(--success-color)' };
    bannerText = `✅ Inside the ${center.radiusMeters}m department boundary`;
  } else {
    bannerStyle = { background: 'var(--danger-bg)', border: '1px solid var(--danger-color)' };
    bannerText = `❌ Outside the ${center.radiusMeters}m department boundary`;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scan Attendance QR Code" maxWidth="580px">
      {/* Geofence GPS Banner */}
      <div
        style={{
          padding: '0.75rem',
          borderRadius: 'var(--radius-sm)',
          background: bannerStyle.background as string,
          border: bannerStyle.border as string,
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          fontSize: '0.85rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapPin
            size={18}
            color={
              locationUnavailable
                ? 'var(--danger-color)'
                : withinDepartmentBoundary
                  ? 'var(--success-color)'
                  : 'var(--danger-color)'
            }
          />
          <div>
            <strong>{locationUnavailable ? 'GPS:' : `GPS Distance: ${Math.round(distanceFromDept ?? 0)}m`}</strong>{' '}
            from {center.buildingName || 'Department Center'}
            <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.85 }}>{bannerText}</span>
            {accuracy !== null && (
              <span style={{ display: 'block', fontSize: '0.7rem', opacity: 0.7 }}>
                Accuracy ±{Math.round(accuracy)}m
                {accuracy > MAX_ACCURACY_METERS ? ' (too imprecise to check in)' : ''}
              </span>
            )}
          </div>
        </div>

        {ALLOW_TEST_TOOLS ? (
          <button onClick={refreshLocation} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem' }}>
            <RefreshCw size={12} /> Refresh GPS
          </button>
        ) : null}
      </div>

      {/* Mode Selector Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('camera')}
          className={`btn btn-sm ${activeTab === 'camera' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Camera size={15} /> Live Camera
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`btn btn-sm ${activeTab === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Upload size={15} /> Upload Image
        </button>
        {ALLOW_TEST_TOOLS && (
          <button
            onClick={() => setActiveTab('simulate')}
            className={`btn btn-sm ${activeTab === 'simulate' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Sparkles size={15} /> Quick Test Scanner
          </button>
        )}
      </div>

      {/* Tab 1: Live Webcam */}
      {activeTab === 'camera' && (
        <div style={{ textAlign: 'center' }}>
          <div
            id="qr-reader"
            style={{
              width: '100%',
              maxWidth: '320px',
              margin: '0 auto',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              background: '#000',
              minHeight: '220px'
            }}
          />
          {cameraError && (
            <p style={{ fontSize: '0.8rem', color: 'var(--danger-color)', marginTop: '0.5rem' }}>
              {cameraError}
            </p>
          )}
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
            Point your phone camera at the active QR code generated by the Admin.
          </p>
        </div>
      )}

      {/* Tab 2: File Upload */}
      {activeTab === 'upload' && (
        <div style={{ textAlign: 'center', padding: '1.5rem', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
          <div id="qr-reader-file" style={{ display: 'none' }} />
          <Upload size={32} color="var(--accent-primary)" style={{ marginBottom: '0.5rem' }} />
          <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Upload QR Code Image</p>
          <input type="file" accept="image/*" onChange={handleFileUpload} className="form-input" style={{ width: 'auto' }} />
        </div>
      )}

      {/* Tab 3: Quick Test Scanner (development builds only) */}
      {ALLOW_TEST_TOOLS && activeTab === 'simulate' && (
        <div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Development only. Paste the QR JSON payload copied from the Admin session modal:
          </p>

          <textarea
            rows={4}
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder='Paste QR payload string e.g. {"sessionId":"...","token":"..."}'
            className="form-textarea"
            style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}
          />

          <button
            onClick={() => void handleQRScanned(manualCode)}
            disabled={!manualCode || loading}
            className="btn btn-primary btn-sm"
            style={{ width: '100%', marginTop: '0.75rem' }}
          >
            {loading ? 'Validating...' : 'Validate & Submit Scan'}
          </button>
        </div>
      )}

      {/* Scan Result Feedback */}
      {scanResult && (
        <div
          className="animate-fade-in"
          style={{
            marginTop: '1.25rem',
            padding: '1rem',
            borderRadius: 'var(--radius-sm)',
            background: scanResult.success ? 'var(--success-bg)' : 'var(--danger-bg)',
            border: `1px solid ${scanResult.success ? 'var(--success-color)' : 'var(--danger-color)'}`,
            textAlign: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            {scanResult.success ? (
              <CheckCircle2 size={24} color="var(--success-color)" />
            ) : (
              <AlertTriangle size={24} color="var(--danger-color)" />
            )}
            <h4 style={{ margin: 0, fontSize: '1rem', color: scanResult.success ? 'var(--success-color)' : 'var(--danger-color)' }}>
              {scanResult.success ? 'Attendance Verified!' : 'Verification Failed'}
            </h4>
          </div>

          <p style={{ fontSize: '0.875rem', margin: 0 }}>{scanResult.message}</p>

          {scanResult.success && scanResult.details ? (
            <div
              style={{
                marginTop: '0.75rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--border-color)',
                fontSize: '0.8rem',
                textAlign: 'left',
                display: 'inline-block'
              }}
            >
              <div><strong>Session:</strong> {scanResult.details.sessionTitle}</div>
              <div><strong>Distance from QR center:</strong> {scanResult.details.distance}m</div>
              <div><strong>Status:</strong> {scanResult.details.status.toUpperCase()}</div>
            </div>
          ) : null}

          {scanResult.success ? (
            <button
              onClick={() => {
                setScanResult(null);
                onClose();
              }}
              className="btn btn-success btn-sm"
              style={{ marginTop: '1rem' }}
            >
              Done / Return to Dashboard
            </button>
          ) : (
            <button
              onClick={restartCamera}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '1rem' }}
            >
              <RefreshCw size={13} /> Scan Again
            </button>
          )}
        </div>
      )}
    </Modal>
  );
};
