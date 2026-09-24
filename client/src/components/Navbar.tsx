import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Utensils,
  RefreshCw,
  PlayCircle,
  ShieldCheck,
  Truck,
  Heart,
  Store,
  Sun,
  Moon,
} from 'lucide-react';

interface Props {
  activeTab: 'dashboard' | 'live-rescues' | 'impact';
  onSelectTab: (tab: 'dashboard' | 'live-rescues' | 'impact') => void;
  onOpenWalkthrough: () => void;
}

export const Navbar: React.FC<Props> = ({ onOpenWalkthrough }) => {
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
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 p-2 text-white shadow-lg shadow-emerald-500/20">
            <Utensils className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none text-slate-100">
              Surplus-to-Shelter
            </h1>
            <span className="text-xs font-medium tracking-wide text-emerald-400">
              Real-Time Food Rescue Logistics
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenWalkthrough}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-emerald-500"
          >
            <PlayCircle className="h-4 w-4" />
            <span>Interactive Demo Workflow</span>
          </button>

          <button
            onClick={resetDatabase}
            title="Reset database to initial seed state"
            className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 p-2 text-xs font-medium text-slate-300 transition-all hover:bg-slate-700"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 p-2 text-xs font-semibold text-amber-400 transition-all hover:bg-slate-700"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-4 w-4" />
                <span className="hidden text-[11px] text-slate-300 lg:inline">LIGHT</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-indigo-400" />
                <span className="hidden text-[11px] font-bold text-slate-700 lg:inline">DARK</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-1.5">
            {getRoleIcon(user?.role)}
            <span className="text-xs font-semibold text-emerald-300">
              {user?.role || 'USER'} · {user?.name || 'Logged in'}
            </span>
          </div>

          <button
            onClick={logout}
            className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition-all hover:bg-rose-500/20"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};