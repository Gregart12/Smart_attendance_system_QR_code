import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FutoCrestLogo } from './FutoCrestLogo';
import {
  LayoutDashboard,
  QrCode,
  Users,
  ClipboardList,
  BarChart3,
  Bell,
  Settings,
  ScanLine,
  History,
  User,
  LogOut,
  ShieldCheck,
  Building2,
  GraduationCap,
  Award
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  closeSidebar: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, closeSidebar }) => {
  const { role, logout, userProfile } = useAuth();

  const adminLinks = [
    { path: '/admin/dashboard', label: 'HOD Overview', icon: LayoutDashboard },
    { path: '/admin/qr-sessions', label: 'QR Attendance Sessions', icon: QrCode },
    { path: '/admin/staff-management', label: 'Academic/Staff Directory', icon: Users },
    { path: '/admin/attendance-records', label: 'Attendance Master Logs', icon: ClipboardList },
    { path: '/admin/reports', label: 'FUTO Attendance Reports', icon: BarChart3 },
    { path: '/admin/notifications', label: 'ICT Circulars & Alerts', icon: Bell },
    { path: '/admin/settings', label: 'Geofence & ICT Config', icon: Settings }
  ];

  const staffLinks = [
    { path: '/staff/dashboard', label: 'Staff Portal Overview', icon: LayoutDashboard },
    { path: '/staff/scan-qr', label: 'Scan Attendance QR', icon: ScanLine },
    { path: '/staff/history', label: 'My Attendance Logs', icon: History },
    { path: '/staff/profile', label: 'Staff Record Profile', icon: User },
    { path: '/staff/notifications', label: 'ICT Notices', icon: Bell }
  ];

  const links = role === 'admin' ? adminLinks : staffLinks;

  return (
    <aside className={`app-sidebar ${isOpen ? 'open' : ''}`} style={{ borderRight: '1px solid var(--futo-green-emerald)' }}>
      {/* Brand Header */}
      <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.12)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <FutoCrestLogo size={42} showTitle />
      </div>

      {/* Role Badge Indicator */}
      <div style={{ padding: '0.75rem 1rem', background: 'rgba(0, 0, 0, 0.25)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#e2e8f0' }}>
          <ShieldCheck size={16} color="#f59e0b" />
          <span>
            Account:{' '}
            <strong style={{ color: '#ffffff' }}>
              {role === 'admin'
                ? userProfile?.accountTitle || 'HOD / Director'
                : userProfile && 'staffCategory' in userProfile && userProfile.staffCategory === 'non-academic'
                  ? 'Non-Academic Staff'
                  : 'Academic Staff'}
            </strong>
          </span>
        </div>
      </div>

      {/* Navigation Items */}
      <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeSidebar}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.875rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#ffffff' : '#94a3b8',
                background: isActive ? 'var(--accent-primary)' : 'transparent',
                borderLeft: isActive ? '3px solid #f59e0b' : '3px solid transparent',
                transition: 'all 0.2s ease'
              })}
            >
              <Icon size={18} color={undefined} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Institutional Motto Footer */}
      <div style={{ padding: '0.75rem 1rem', textAlign: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(0,0,0,0.2)' }}>
        <p style={{ fontSize: '0.68rem', color: '#f59e0b', fontStyle: 'italic', margin: 0, fontWeight: 600 }}>
          &ldquo;Technology for Service&rdquo; &mdash; FUTO
        </p>
      </div>

      {/* Sidebar Footer Logout */}
      <div style={{ padding: '0.85rem 1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <button
          onClick={logout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.65rem',
            padding: '0.65rem 1rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#f87171',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <LogOut size={16} /> Sign Out Portal
        </button>
      </div>
    </aside>
  );
};

