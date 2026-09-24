import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Utensils, RefreshCw, PlayCircle, ShieldCheck, Truck, Heart, Store } from 'lucide-react';

interface Props {
  onOpenWalkthrough: () => void;
}

export const Navbar: React.FC<Props> = ({ onOpenWalkthrough }) => {
 const { user, resetDatabase } = useAuth();

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
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
            <Utensils className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-100 leading-none">Surplus-to-Shelter</h1>
            <span className="text-xs text-emerald-400 font-medium tracking-wide">
              Real-Time Food Rescue Logistics
            </span>
          </div>
        </div>

        {/* Action Controls & Role Selector */}
        <div className="flex items-center gap-3">
          {/* Section 17 Demo Scenario Button */}
          <button
            onClick={onOpenWalkthrough}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
          >
            <PlayCircle className="w-4 h-4" />
            <span>Interactive Demo Workflow</span>
          </button>

          {/* Quick Database Reset */}
          <button
            onClick={resetDatabase}
            title="Reset database to initial seed state"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Logged-in user only */}
          <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-1.5">
            {getRoleIcon(user?.role)}
            <span className="text-xs font-semibold text-emerald-300">
              {user?.role || 'USER'} · {user?.name || 'Logged in'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
