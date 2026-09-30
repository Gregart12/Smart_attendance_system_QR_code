import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Layouts
import { AuthLayout } from './layouts/AuthLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { StaffLayout } from './layouts/StaffLayout';

// Auth Pages
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminRegister } from './pages/admin/AdminRegister';
import { StaffLogin } from './pages/staff/StaffLogin';
import { StaffRegister } from './pages/staff/StaffRegister';
import { ForgotPassword } from './pages/Auth/ForgotPassword';
import { ResetPassword } from './pages/Auth/ResetPassword';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminQRSessions } from './pages/admin/AdminQRSessions';
import { AdminStaffManagement } from './pages/admin/AdminStaffManagement';
import { AdminAttendanceRecords } from './pages/admin/AdminAttendanceRecords';
import { AdminReports } from './pages/admin/AdminReports';
import { AdminNotifications } from './pages/admin/AdminNotifications';
import { AdminSettings } from './pages/admin/AdminSettings';

// Staff Pages
import { StaffDashboard } from './pages/staff/StaffDashboard';
import { StaffScanQR } from './pages/staff/StaffScanQR';
import { StaffAttendanceHistory } from './pages/staff/StaffAttendanceHistory';
import { StaffProfile } from './pages/staff/StaffProfile';
import { StaffNotifications } from './pages/staff/StaffNotifications';

// Fallback Pages
import { NotFound } from './pages/NotFound';
import { Forbidden } from './pages/Forbidden';

// Global Styles
import './styles/global.css';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Root Redirect */}
            <Route path="/" element={<Navigate to="/staff/login" replace />} />

            {/* Public Auth Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/register" element={<AdminRegister />} />
              <Route path="/staff/login" element={<StaffLogin />} />
              <Route path="/staff/register" element={<StaffRegister />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            </Route>

            {/* Protected Admin Routes */}
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/qr-sessions" element={<AdminQRSessions />} />
              <Route path="/admin/staff-management" element={<AdminStaffManagement />} />
              <Route path="/admin/attendance-records" element={<AdminAttendanceRecords />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/notifications" element={<AdminNotifications />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
            </Route>

            {/* Protected Staff Routes */}
            <Route element={<StaffLayout />}>
              <Route path="/staff/dashboard" element={<StaffDashboard />} />
              <Route path="/staff/scan-qr" element={<StaffScanQR />} />
              <Route path="/staff/history" element={<StaffAttendanceHistory />} />
              <Route path="/staff/profile" element={<StaffProfile />} />
              <Route path="/staff/notifications" element={<StaffNotifications />} />
            </Route>

            {/* Fallback & Error Routes */}
            <Route path="/forbidden" element={<Forbidden />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
