import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { Navbar } from './components/Navbar';
import { DonorDashboard } from './pages/DonorDashboard';
import { NgoDashboard } from './pages/NgoDashboard';
import { DriverDashboard } from './pages/DriverDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { DemoWalkthroughModal } from './components/DemoWalkthroughModal';
import { RefreshCw } from 'lucide-react';

const MainContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-100">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const renderRoleDashboard = () => {
    switch (user.role) {
      case 'DONOR':
        return <DonorDashboard key={refreshKey} />;
      case 'NGO':
        return <NgoDashboard key={refreshKey} />;
      case 'DRIVER':
        return <DriverDashboard key={refreshKey} />;
      case 'ADMIN':
        return <AdminDashboard key={refreshKey} />;
      default:
        return <DonorDashboard key={refreshKey} />;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 font-sans text-slate-100">
      <Navbar onOpenWalkthrough={() => setIsWalkthroughOpen(true)} />

      <main className="flex-1">{renderRoleDashboard()}</main>

      <DemoWalkthroughModal
        isOpen={isWalkthroughOpen}
        onClose={() => setIsWalkthroughOpen(false)}
        onRefresh={() => setRefreshKey((previous) => previous + 1)}
      />

      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        Surplus-to-Shelter Hackathon MVP · Real-Time Food Rescue Logistics & Verification System
      </footer>
    </div>
  );
};

export const App: React.FC = () => (
  <AuthProvider>
    <MainContent />
  </AuthProvider>
);

export default App;