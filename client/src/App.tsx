import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthPage } from './pages/AuthPage';
import { Navbar } from './components/Navbar';
import { DonorDashboard } from './pages/DonorDashboard';
import { NgoDashboard } from './pages/NgoDashboard';
import { DriverDashboard } from './pages/DriverDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { LiveRescuesPage } from './pages/LiveRescuesPage';
import { ImpactCenterPage } from './pages/ImpactCenterPage';
import { DemoWalkthroughModal } from './components/DemoWalkthroughModal';
import { RefreshCw } from 'lucide-react';

const MainContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'live-rescues' | 'impact'>('dashboard');
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

  const renderContent = () => {
    if (activeTab === 'live-rescues') {
      return <LiveRescuesPage key={refreshKey} />;
    }

    if (activeTab === 'impact') {
      return <ImpactCenterPage key={refreshKey} />;
    }

    switch (user.role) {
      case 'DONOR':
        return <DonorDashboard key={refreshKey} />;
      case 'NGO':
        return <NgoDashboard key={refreshKey} />;
      case 'DRIVER':
        return <DriverDashboard key={refreshKey} />;
      case 'ADMIN':
        return (
          <AdminDashboard
            key={refreshKey}
            onNavigateToRescues={() => setActiveTab('live-rescues')}
            onNavigateToImpact={() => setActiveTab('impact')}
          />
        );
      default:
        return <DonorDashboard key={refreshKey} />;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 font-sans text-slate-100">
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenWalkthrough={() => setIsWalkthroughOpen(true)}
      />

      <main className="flex-1">{renderContent()}</main>

      <DemoWalkthroughModal
        isOpen={isWalkthroughOpen}
        onClose={() => setIsWalkthroughOpen(false)}
        onRefresh={() => setRefreshKey((previous) => previous + 1)}
      />

      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        Surplus-to-Shelter Hackathon MVP • Intelligent Real-Time Food Rescue Logistics Control Center
      </footer>
    </div>
  );
};

export const App: React.FC = () => (
  <ThemeProvider>
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  </ThemeProvider>
);

export default App;