import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
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
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-slate-100">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  const renderRoleDashboard = () => {
    switch (user?.role) {
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar onOpenWalkthrough={() => setIsWalkthroughOpen(true)} />
      
      <main className="flex-1">
        {renderRoleDashboard()}
      </main>

      <DemoWalkthroughModal
        isOpen={isWalkthroughOpen}
        onClose={() => setIsWalkthroughOpen(false)}
        onRefresh={() => setRefreshKey((prev) => prev + 1)}
      />

      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        Surplus-to-Shelter Hackathon MVP • Real-Time Food Rescue Logistics & Verification System
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
};

export default App;
