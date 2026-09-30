import React from 'react';

interface FutoCrestLogoProps {
  size?: number;
  className?: string;
  showTitle?: boolean;
}

export const FutoCrestLogo: React.FC<FutoCrestLogoProps> = ({
  size = 48,
  className = '',
  showTitle = false
}) => {
  return (
    <div className={`futo-logo-container ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem' }}>
      {/* White Container Background for FUTO Logo Image */}
      <div
        style={{
          width: `${size + 8}px`,
          height: `${size + 8}px`,
          borderRadius: '50%',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          border: '2px solid var(--futo-gold-primary)',
          flexShrink: 0,
          overflow: 'hidden'
        }}
      >
        <img
          src="/futo-logo.jpg"
          alt="FUTO Crest Logo"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            objectFit: 'contain',
            borderRadius: '50%'
          }}
        />
      </div>

      {showTitle && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.02em', lineHeight: 1.1 }}>
            FUTO ICT PORTAL
          </span>
          <span style={{ fontSize: '0.68rem', color: '#f59e0b', fontWeight: 600 }}>
            Fed. Univ. of Tech Owerri
          </span>
        </div>
      )}
    </div>
  );
};
