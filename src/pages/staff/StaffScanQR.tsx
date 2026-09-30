import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { QRScannerModal } from '../../components/staff/QRScannerModal';
import { ScanLine, Camera } from 'lucide-react';

export const StaffScanQR: React.FC = () => {
  const { userProfile } = useAuth();
  // Do not open the camera (and the GPS prompt) on page load: the user opts in
  // by tapping the button, which browsers treat far more favourably.
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '650px', margin: '0 auto' }}>
      <div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
          Smart QR Attendance Scanner
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
          Position your camera inside the IT Department building boundary to record attendance
        </p>
      </div>

      <div className="glass-card" style={{ textAlign: 'center', padding: '2.5rem' }}>
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'var(--accent-light)',
            color: 'var(--accent-primary)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.25rem'
          }}
        >
          <ScanLine size={42} />
        </div>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Ready to Scan QR Code
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
          Click the button below to launch your camera. Ensure you are inside the Department of Information Technology building.
        </p>

        <button onClick={() => setIsModalOpen(true)} className="btn btn-success btn-lg pulse-glow">
          <Camera size={20} /> Launch QR Camera Scanner
        </button>
      </div>

      <QRScannerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        staffProfile={userProfile}
      />
    </div>
  );
};
