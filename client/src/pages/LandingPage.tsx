import React from 'react';
import { Utensils, Heart, Truck, ShieldCheck, Activity, MapPin } from 'lucide-react';

interface Props {
  onDonateClick: () => void;
  onViewLiveRescuesClick: () => void;
}

export const LandingPage: React.FC<Props> = ({ onDonateClick, onViewLiveRescuesClick }) => {
  const workflowSteps = [
    { title: '1. Donor Posts Surplus', desc: 'Restaurants & caterers register surplus edible food with safe donation time window.', icon: Utensils },
    { title: '2. Intelligent Matching', desc: 'Decision engine evaluates shelter capacity, food compatibility, distance & driver availability.', icon: ShieldCheck },
    { title: '3. Driver Dispatch', desc: 'Nearest volunteer driver is assigned with locked pickup-to-delivery navigation.', icon: Truck },
    { title: '4. Anti-Tamper Verification', desc: 'Secure QR tokens verify package chain of custody at pickup and delivery sites.', icon: MapPin },
    { title: '5. Delivery & Impact', desc: 'Food is delivered safely to shelter residents, measuring real social impact.', icon: Heart },
  ];

  return (
    <div className="space-y-12 py-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-emerald-800/40 rounded-3xl p-8 sm:p-12 shadow-2xl space-y-8">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold tracking-widest uppercase">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>24/7 Real-Time Food Rescue Operating System</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-slate-100 tracking-tight leading-tight">
            TURN SURPLUS INTO <span className="text-emerald-400">A MEAL.</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
            Connect surplus edible food from restaurants, cafeterias, and caterers with eligible shelters and available volunteer drivers before the safe rescue window closes.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <button
              onClick={onDonateClick}
              className="px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Utensils className="w-5 h-5" />
              <span>DONATE SURPLUS FOOD</span>
            </button>

            <button
              onClick={onViewLiveRescuesClick}
              className="px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-bold text-sm shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Activity className="w-5 h-5 text-cyan-400" />
              <span>VIEW LIVE RESCUES COMMAND CENTER</span>
            </button>
          </div>
        </div>

        {/* Section 28: Visual Architecture Flow Diagram */}
        <div className="pt-6 border-t border-slate-800/80">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-4">
            Surplus-to-Shelter Operational Control Flow Architecture:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2 text-xs">
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center font-bold text-emerald-400">
              FOOD SURPLUS
            </div>
            <div className="hidden lg:flex items-center justify-center text-slate-600">➔</div>
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center font-bold text-slate-200">
              DONOR POSTS
            </div>
            <div className="hidden lg:flex items-center justify-center text-slate-600">➔</div>
            <div className="bg-slate-950/80 p-3 rounded-xl border border-emerald-700 text-center font-bold text-cyan-400">
              MATCHING ENGINE
              <span className="block text-[10px] text-slate-400 font-normal mt-0.5">(Capacity + Distance + Time)</span>
            </div>
            <div className="hidden lg:flex items-center justify-center text-slate-600">➔</div>
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center font-bold text-emerald-400">
              DELIVERY & IMPACT
            </div>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS Section */}
      <div className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl font-bold text-slate-100">HOW IT WORKS</h2>
          <p className="text-xs text-slate-400">End-to-end time-constrained food rescue logistics in 5 simple steps</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {workflowSteps.map((st, i) => {
            const Icon = st.icon;
            return (
              <div key={i} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3 shadow-lg">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 w-fit">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-100">{st.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{st.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
