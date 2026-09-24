import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { NotificationBell } from './NotificationBell';
import {
  Utensils,
  RefreshCw,
  PlayCircle,
  ShieldCheck,
  Truck,
  Heart,
  Store,
  Activity,
  BarChart3,
  Sun,
  Moon,
} from 'lucide-react';

interface Props {
  activeTab: 'landing' | 'dashboard' | 'live-rescues' | 'impact' | 'integrity';
  onSelectTab: (tab: 'landing' | 'dashboard' | 'live-rescues' | 'impact' | 'integrity') => void;
  onOpenWalkthrough: () => void;
}

export const Navbar: React.FC<Props> = ({ activeTab, onSelectTab, onOpenWalkthrough }) => {
 const { user, resetDatabase, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'DONOR':
        return <Store className="w-4 h-4 text-emerald-400" />;
      case 'NGO':
        return <Heart className="w-4 h-4 text-rose-400" />;
      case 'DRIVER':
        return <Truck className="w-4 h-4 text-amber-400" />;
      case 'ADMIN':
        return <ShieldCheck className="w-4 h-4 text-cyan-400" />;
      default:
        return <Utensils className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900 bg-opacity-90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo & Navigation Links */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectTab('landing')}>
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/30">
              <Utensils className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-black text-xl text-slate-100 leading-none">Surplus-to-Shelter</h1>
              <span className="text-xs text-orange-400 font-semibold tracking-wide">
                Real-Time Rescue Logistics
              </span>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => onSelectTab('landing')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'landing' ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Overview
            </button>

            <button
              onClick={() => onSelectTab('dashboard')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'dashboard' ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Role Dashboard
            </button>

            <button
              onClick={() => onSelectTab('live-rescues')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'live-rescues' ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>LIVE RESCUES</span>
            </button>

            <button
              onClick={() => onSelectTab('integrity')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'integrity' ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
              <span>Integrity Center</span>
            </button>

            <button
              onClick={() => onSelectTab('impact')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'impact' ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Impact Center</span>
            </button>
          </nav>
        </div>

        {/* Action Controls, Notification Bell & Role Selector */}
        <div className="flex items-center gap-3">
          <NotificationBell />

          <button
            onClick={onOpenWalkthrough}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <PlayCircle className="w-4 h-4" />
            <span>Demo Scenarios</span>
          </button>

          <button
            onClick={resetDatabase}
            title="Reset database to initial seed state"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden lg:inline text-[11px] text-slate-300">LIGHT</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-400" />
                <span className="hidden lg:inline text-[11px] text-slate-700 font-bold">DARK</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-1.5">
  {getRoleIcon(user?.role)}
  <span className="text-xs font-semibold text-orange-400">
    {user?.role || 'USER'} · {user?.name || 'Logged in'}
  </span>
</div>
          {logout && (
            <button
              onClick={logout}
              className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition-all hover:bg-rose-500/20 cursor-pointer"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
