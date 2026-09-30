import React from 'react';
import { Outlet } from 'react-router-dom';
import { ShieldCheck, GraduationCap, MapPin, Phone, Mail, AlertTriangle, RefreshCw } from 'lucide-react';
import { FutoCrestLogo } from '../components/common/FutoCrestLogo';
import { useFirebaseHealth } from '../hooks/useFirebaseHealth';

export const AuthLayout: React.FC = () => {
  const health = useFirebaseHealth();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #022c22 0%, #064e3b 40%, #0f172a 100%)',
        color: '#ffffff'
      }}
    >
      {health.problem && (
        <div
          role="alert"
          style={{
            background: 'rgba(127, 29, 29, 0.95)',
            borderBottom: '2px solid #f87171',
            padding: '0.75rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            fontSize: '0.8rem'
          }}
        >
          <AlertTriangle size={18} color="#fecaca" />
          <span style={{ fontWeight: 700, color: '#fecaca' }}>Setup required</span>
          <span style={{ color: '#fee2e2', maxWidth: '760px' }}>{health.problem}</span>
          <button
            type="button"
            onClick={health.retry}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.3rem 0.7rem',
              borderRadius: 'var(--radius-full)',
              border: '1px solid rgba(254, 202, 202, 0.5)',
              background: 'rgba(0,0,0,0.25)',
              color: '#fee2e2',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} />
            Check again
          </button>
        </div>
      )}

      {/* University Top Bar */}
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderBottom: '2px solid var(--futo-gold-primary)',
          padding: '0.5rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <FutoCrestLogo size={36} />
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.02em' }}>
              FEDERAL UNIVERSITY OF TECHNOLOGY, OWERRI
            </div>
            <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 600 }}>
              Directorate of ICT &mdash; Smart QR Staff Attendance Portal
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.72rem', color: '#cbd5e1' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <MapPin size={12} color="#f59e0b" /> Owerri, Imo State
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Phone size={12} color="#f59e0b" /> +234 (0) 803 000 0000
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Mail size={12} color="#f59e0b" /> ict@futo.edu.ng
          </span>
        </div>
      </div>

      {/* Main Auth Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1.5rem'
        }}
      >
        <div style={{ width: '100%', maxWidth: '480px' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem 1rem',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#f59e0b',
                fontSize: '0.75rem',
                fontWeight: 700,
                marginBottom: '0.85rem'
              }}
            >
              <ShieldCheck size={14} />
              <span>Official Staff & Admin Access</span>
            </div>

            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '0.01em' }}>
              FUTO Smart QR Attendance Portal
            </h1>
            <p style={{ fontSize: '0.82rem', color: '#f8fafc', marginTop: '0.4rem', fontWeight: 600 }}>
              Federal University of Technology, Owerri
            </p>
            {health.checking && !health.problem && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#94a3b8' }}>
                Checking Firebase connection&hellip;
              </div>
            )}
            <div style={{ marginTop: '0.45rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', color: '#f59e0b', fontSize: '0.76rem', fontWeight: 700 }}>
              <GraduationCap size={14} />
              <span>Technology for Service</span>
            </div>
          </div>

          <div
            className="glass-card animate-fade-in"
            style={{
              background: 'rgba(15, 23, 42, 0.9)',
              borderColor: 'var(--futo-gold-primary)',
              borderTop: '4px solid var(--futo-gold-primary)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)'
            }}
          >
            <Outlet />
          </div>
        </div>
      </div>

      {/* University Footer */}
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.35)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '0.75rem 1.5rem',
          textAlign: 'center',
          fontSize: '0.72rem',
          color: '#94a3b8'
        }}
      >
        &copy; {new Date().getFullYear()} Federal University of Technology, Owerri &mdash; Directorate of ICT. All rights reserved.
        <span style={{ color: '#f59e0b', fontWeight: 600 }}> &ldquo;Technology for Service&rdquo;</span>
      </div>
    </div>
  );
};