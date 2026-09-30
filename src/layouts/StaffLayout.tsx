import React, { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/common/Navbar';
import { Sidebar } from '../components/common/Sidebar';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const StaffLayout: React.FC = () => {
  const { currentUser, role, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return <LoadingSpinner fullPage message="Verifying Staff Credentials..." />;
  }

  if (!currentUser) {
    return <Navigate to="/staff/login" replace />;
  }

  if (role !== 'staff') {
    return <Navigate to="/forbidden" replace />;
  }

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />

      <div className="app-main">
        <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="app-content animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
