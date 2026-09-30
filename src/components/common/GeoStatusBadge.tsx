import React, { useState } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import { MapPin, RefreshCw, Sliders, CheckCircle2, AlertTriangle } from 'lucide-react';

const ALLOW_GPS_SIMULATION = import.meta.env.DEV;

export const GeoStatusBadge: React.FC = () => {
  const { center } = useSystemSettings();
  const {
    latitude,
    longitude,
    loading,
    error,
    refreshLocation,
    distanceFromDept,
    simulatedLocation,
    simulateInsideDept,
    simulateOutsideDept,
    resetSimulation
  } = useGeolocation(center);

  const [showSimModal, setShowSimModal] = useState(false);

  const hasFix = distanceFromDept !== null;
  const isInside = hasFix && distanceFromDept <= center.radiusMeters;

  return (
    <>
      <div className="geo-badge-wrapper" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          onClick={() => setShowSimModal(true)}
          className={`badge ${isInside ? 'badge-present' : 'badge-absent'}`}
          title="Click to view Geofence details"
          style={{ cursor: 'pointer', padding: '0.4rem 0.75rem', fontSize: '0.8rem', border: '1px solid currentColor' }}
        >
          <MapPin size={14} />
          {loading && !hasFix ? (
            <span>Locating GPS...</span>
          ) : error || !hasFix ? (
            <span>GPS Unavailable</span>
          ) : isInside ? (
            <span>In Dept Range ({Math.round(distanceFromDept)}m)</span>
          ) : (
            <span>Out of Range ({Math.round(distanceFromDept)}m away)</span>
          )}
          {simulatedLocation && ALLOW_GPS_SIMULATION && (
            <span style={{ opacity: 0.85, fontSize: '0.7rem' }}>(Simulated)</span>
          )}
        </button>

        <button
          onClick={refreshLocation}
          className="btn btn-secondary btn-sm"
          style={{ padding: '0.35rem 0.5rem' }}
          title="Refresh GPS location"
        >
          <RefreshCw size={13} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* Geofence details */}
      {showSimModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem'
        }}>
          <div className="glass-card animate-fade-in" style={{ maxWidth: '520px', width: '100%', background: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin className="text-primary" size={20} />
                Department Geofence Status
              </h3>
              <button onClick={() => setShowSimModal(false)} className="btn btn-secondary btn-sm">✕</button>
            </div>

            <div style={{ padding: '1rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
              <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                🏢 Building: {center.buildingName}
              </p>
              <p style={{ fontSize: '0.85rem' }}>
                <strong>Allowed Radius:</strong> {center.radiusMeters} meters
              </p>
              <p style={{ fontSize: '0.85rem' }}>
                <strong>Target Coords:</strong> {center.latitude}, {center.longitude}
              </p>
              <hr style={{ margin: '0.75rem 0', borderColor: 'var(--border-color)' }} />
              <p style={{ fontSize: '0.85rem' }}>
                <strong>Current Detected Location:</strong>{' '}
                {latitude !== null && longitude !== null
                  ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
                  : 'Not available'}
              </p>
              <p style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                <strong>Distance from Center:</strong>{' '}
                {hasFix ? `${Math.round(distanceFromDept)} meters` : 'Unavailable'}
              </p>
              {error && (
                <p style={{ fontSize: '0.8rem', color: 'var(--danger-color)', marginTop: '0.4rem' }}>{error}</p>
              )}

              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isInside ? (
                  <span className="badge badge-present" style={{ fontSize: '0.85rem' }}>
                    <CheckCircle2 size={16} /> GPS Validation Passed (Inside Geofence)
                  </span>
                ) : (
                  <span className="badge badge-absent" style={{ fontSize: '0.85rem' }}>
                    <AlertTriangle size={16} /> {hasFix ? 'GPS Validation Failed (Outside Geofence)' : 'GPS Validation Unavailable'}
                  </span>
                )}
              </div>
            </div>

            {ALLOW_GPS_SIMULATION && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Sliders size={16} /> GPS Simulation Mode (Development Only)
                </p>
                <p style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                  For testing on a device without GPS. Hidden in production builds.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <button onClick={simulateInsideDept} className="btn btn-success btn-sm">
                    Simulate INSIDE (0m)
                  </button>
                  <button onClick={simulateOutsideDept} className="btn btn-danger btn-sm">
                    Simulate OUTSIDE (~390m)
                  </button>
                </div>

                {simulatedLocation && (
                  <button onClick={resetSimulation} className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                    Reset to Actual Device GPS
                  </button>
                )}
              </div>
            )}

            <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
              <button onClick={() => setShowSimModal(false)} className="btn btn-primary btn-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
