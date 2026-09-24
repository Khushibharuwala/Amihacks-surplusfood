import React from 'react';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';
import { Utensils, RefreshCw, PlayCircle, ShieldCheck, Truck, Heart, Store, Activity, BarChart3 } from 'lucide-react';

interface Props {
  activeTab: 'dashboard' | 'live-rescues' | 'impact';
  onSelectTab: (tab: 'dashboard' | 'live-rescues' | 'impact') => void;
  onOpenWalkthrough: () => void;
}

export const Navbar: React.FC<Props> = ({ activeTab, onSelectTab, onOpenWalkthrough }) => {
  const { user, demoAccounts, switchDemoAccount, resetDatabase } = useAuth();

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
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
              <Utensils className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-100 leading-none">Surplus-to-Shelter</h1>
              <span className="text-xs text-emerald-400 font-medium tracking-wide">
                Real-Time Rescue Logistics
              </span>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Role Dashboard
            </button>

            <button
              onClick={() => onSelectTab('live-rescues')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'live-rescues' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-cyan-300" />
              <span>LIVE RESCUES</span>
            </button>

            <button
              onClick={() => onSelectTab('impact')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'impact' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-300" />
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
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
          >
            <PlayCircle className="w-4 h-4" />
            <span>Interactive Demo Scenarios</span>
          </button>

          {/* Quick Database Reset */}
          <button
            onClick={resetDatabase}
            title="Reset database to initial seed state"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
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
              className="bg-transparent text-xs text-emerald-300 font-medium focus:outline-none cursor-pointer pr-1"
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
