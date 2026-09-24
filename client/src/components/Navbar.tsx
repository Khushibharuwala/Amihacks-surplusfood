import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { NotificationBell } from './NotificationBell';
import { Utensils, RefreshCw, PlayCircle, ShieldCheck, Truck, Heart, Store, Activity, BarChart3, Sun, Moon } from 'lucide-react';

interface Props {
  activeTab: 'landing' | 'dashboard' | 'live-rescues' | 'impact' | 'integrity';
  onSelectTab: (tab: 'landing' | 'dashboard' | 'live-rescues' | 'impact' | 'integrity') => void;
  onOpenWalkthrough: () => void;
}

export const Navbar: React.FC<Props> = ({ activeTab, onSelectTab, onOpenWalkthrough }) => {
  const { user, demoAccounts, switchDemoAccount, resetDatabase } = useAuth();
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
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md bg-opacity-90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
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
          {/* Notification Bell */}
          <NotificationBell />

          {/* Section 21 Demo Scenario Button */}
          <button
            onClick={onOpenWalkthrough}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <PlayCircle className="w-4 h-4" />
            <span>Demo Scenarios</span>
          </button>

          {/* Quick Database Reset */}
          <button
            onClick={resetDatabase}
            title="Reset database to initial seed state"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Theme Toggle Button (Dark / Light Mode) */}
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

          {/* Demo Account Role Switcher */}
          <div className="relative flex items-center bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1">
            <div className="flex items-center gap-1.5 mr-2">
              {getRoleIcon(user?.role)}
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {user?.role || 'Switch Role'}:
              </span>
            </div>
            <select
              value={user?.id || ''}
              onChange={(e) => switchDemoAccount(e.target.value)}
              className="bg-transparent text-xs text-orange-400 font-bold focus:outline-none cursor-pointer pr-1"
            >
              {demoAccounts.map((acc) => (
                <option key={acc.id} value={acc.id} className="bg-slate-900 text-slate-100">
                  {acc.role} - {acc.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
