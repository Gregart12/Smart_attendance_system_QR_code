import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { GeoStatusBadge } from './GeoStatusBadge';
import { Sun, Moon, Menu, LogOut, User } from 'lucide-react';
import { FutoCrestLogo } from './FutoCrestLogo';

interface NavbarProps {
  toggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ toggleSidebar }) => {
  const { userProfile, role, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="app-header" style={{ borderBottom: '2px solid var(--futo-gold-primary)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <button
          onClick={toggleSidebar}
          className="btn btn-secondary btn-sm"
          style={{ padding: '0.45rem 0.65rem', borderColor: 'var(--border-color)' }}
          title="Toggle Navigation Menu"
        >
          <Menu size={18} />
        </button>

        {/* FUTO Crest Emblem Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <FutoCrestLogo size={38} />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, lineHeight: 1.2, letterSpacing: '0.02em', color: 'var(--text-primary)' }}>
                FEDERAL UNIVERSITY OF TECHNOLOGY, OWERRI
              </h2>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '0.1rem 0.4rem',
                  borderRadius: '4px',
                  background: 'var(--futo-gold-light)',
                  color: 'var(--futo-gold-primary)',
                  border: '1px solid var(--futo-gold-border)',
                  fontStyle: 'italic'
                }}
              >
                Technology for Service
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 500 }}>
              Directorate of ICT &mdash; Smart QR Staff Attendance Portal
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {/* Geofence Status Badge - Restricted to Admin/HOD View */}
        {role === 'admin' && pathname !== '/admin/dashboard' && (
          <div className="no-print">
            <GeoStatusBadge />
          </div>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="btn btn-secondary btn-sm"
          style={{ padding: '0.4rem 0.6rem', borderRadius: '50%' }}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* User Dropdown Profile */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.2rem'
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'var(--accent-light)',
                border: '2px solid var(--futo-gold-primary)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.9rem'
              }}
            >
              {userProfile && 'photoUrl' in userProfile && userProfile.photoUrl ? (
                <img
                  src={userProfile.photoUrl}
                  alt=""
                  style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    objectPosition: 'center'
                  }}
                />
              ) : userProfile?.name ? (
                userProfile.name.charAt(0).toUpperCase()
              ) : (
                <User size={18} />
              )}
            </div>
            {/* No inline display: an inline style beats the md:block class, which
                hid the name and role badge at every screen size. */}
            <div style={{ textAlign: 'left' }} className="hidden md:block">
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {userProfile?.name || 'User'}
              </p>
              <span className={`badge ${role === 'admin' ? 'badge-present' : 'badge-late'}`} style={{ fontSize: '0.65rem' }}>
                {role === 'admin'
                  ? userProfile?.accountTitle || 'HOD / Director'
                  : userProfile && 'staffCategory' in userProfile && userProfile.staffCategory === 'non-academic'
                    ? 'Non-Academic Staff'
                    : 'Academic Staff'}
              </span>
            </div>
          </button>

          {showUserMenu && (
            <div
              className="glass-card animate-fade-in"
              style={{
                position: 'absolute',
                top: '120%',
                right: 0,
                width: '230px',
                padding: '0.85rem',
                zIndex: 200,
                background: 'var(--bg-surface)',
                borderTop: '3px solid var(--futo-gold-primary)'
              }}
            >
              <div style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
                <p style={{ fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>{userProfile?.name}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>{userProfile?.email}</p>
                <span style={{ fontSize: '0.7rem', color: 'var(--futo-gold-primary)', fontWeight: 600 }}>
                  {userProfile?.department || 'Directorate of ICT'}
                </span>
              </div>

              <button
                onClick={logout}
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--danger-color)' }}
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

