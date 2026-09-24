import React, { useState, useEffect } from 'react';
import { fetchApi } from '../services/api';
import type { Donation } from '../types';
import { SmartRescueCard } from '../components/SmartRescueCard';
import { RescueDetailModal } from '../components/RescueDetailModal';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Utensils, Heart, Truck, ShieldCheck, Activity, MapPin, ArrowRight, Sparkles, RefreshCw } from 'lucide-react';

interface Props {
  onDonateClick: () => void;
  onViewLiveRescuesClick: () => void;
}

const DEMO_FALLBACK_RESCUES: Donation[] = [
  {
    id: 'don_demo_1',
    donor_id: 'usr_donor_1',
    food_type: 'Cooked Meals',
    quantity_kg: 35,
    description: 'Surplus artisanal sourdough, baguettes, and fresh meal boxes from lunch buffet.',
    status: 'PICKED_UP',
    risk_level: 'MEDIUM',
    risk_reason: '2h remaining on fresh shelf window',
    safe_until: new Date(Date.now() + 120 * 60000).toISOString(),
    pickup_address: '100 Baker St, San Francisco, CA',
    pickup_latitude: 37.7749,
    pickup_longitude: -122.4194,
    available_from: new Date().toISOString(),
    donor_name: 'Golden Grain Kitchen',
    ngo_name: 'St. Vincent Shelter',
    ngo_address: '450 Mission St, San Francisco, CA',
    driver_name: 'Alex Rivera',
    estimated_minutes: 14,
    distance_km: 2.8,
    match_score: 95,
    match_reasons: ['Short transit distance (2.8 km)', 'Capacity verified', 'High driver response rate'],
    image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'don_demo_2',
    donor_id: 'usr_donor_2',
    food_type: 'Prepared Dinners',
    quantity_kg: 60,
    description: 'Catered gourmet meals: grilled chicken breast, roasted vegetables, and rice pilaf.',
    status: 'DRIVER_ASSIGNED',
    risk_level: 'HIGH',
    risk_reason: 'Thermal temperature window closing in 45 mins',
    safe_until: new Date(Date.now() + 45 * 60000).toISOString(),
    pickup_address: '888 Howard St, San Francisco, CA',
    pickup_latitude: 37.7812,
    pickup_longitude: -122.4042,
    available_from: new Date().toISOString(),
    donor_name: 'Grand Plaza Catering',
    ngo_name: 'Tenderloin Community Center',
    ngo_address: '201 Eddy St, San Francisco, CA',
    driver_name: 'Sarah Chen',
    estimated_minutes: 9,
    distance_km: 1.5,
    match_score: 98,
    match_reasons: ['Thermal window priority', 'Nearest driver assigned', 'Recipient storage confirmed'],
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'don_demo_3',
    donor_id: 'usr_donor_3',
    food_type: 'Produce',
    quantity_kg: 120,
    description: 'Boxes of organic apples, spinach, carrots, and avocados from morning delivery surplus.',
    status: 'MATCHED',
    risk_level: 'LOW',
    risk_reason: 'Cold chain verified',
    safe_until: new Date(Date.now() + 240 * 60000).toISOString(),
    pickup_address: '500 Market St, San Francisco, CA',
    pickup_latitude: 37.7901,
    pickup_longitude: -122.4001,
    available_from: new Date().toISOString(),
    donor_name: 'Bay Fresh Produce Market',
    ngo_name: 'Harbor Light Pantry',
    ngo_address: '777 9th St, San Francisco, CA',
    driver_name: 'David Kim',
    estimated_minutes: 22,
    distance_km: 4.6,
    match_score: 91,
    match_reasons: ['Bulk load capacity matched', 'Cold chain compatible'],
    image_url: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const LandingPage: React.FC<Props> = ({ onDonateClick, onViewLiveRescuesClick }) => {
  const [activeRescues, setActiveRescues] = useState<Donation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);

  const loadRescues = async () => {
    try {
      setLoading(true);
      const data = await fetchApi<Donation[]>('/rescues/active');
      if (data && data.length > 0) {
        setActiveRescues(data.slice(0, 3));
      } else {
        setActiveRescues(DEMO_FALLBACK_RESCUES);
      }
    } catch (e) {
      console.error('Failed to load active rescues for landing page', e);
      setActiveRescues(DEMO_FALLBACK_RESCUES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRescues();
  }, []);

  const workflowSteps = [
    { title: '1. Donor Posts Surplus', desc: 'Restaurants & caterers register surplus edible food with safe donation time window & photos.', icon: Utensils },
    { title: '2. Decision Engine Matching', desc: 'Engine evaluates shelter capacity, food compatibility, transit distance & driver availability.', icon: ShieldCheck },
    { title: '3. Driver Dispatch & Lock', desc: 'Nearest volunteer driver is assigned with locked pickup-to-delivery interactive map routing.', icon: Truck },
    { title: '4. Secure Anti-Tamper Tokens', desc: 'QR code verification ensures end-to-end chain of custody at pickup and delivery sites.', icon: MapPin },
    { title: '5. Direct Impact Delivery', desc: 'Food arrives safely at shelter kitchens, feeding residents while measuring CO₂ & meal metrics.', icon: Heart },
  ];

  return (
    <div className="space-y-12 py-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-orange-950/70 via-slate-900 to-slate-900 border border-orange-500/30 rounded-3xl p-8 sm:p-12 shadow-2xl space-y-8">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold tracking-widest uppercase">
            <Activity className="w-4 h-4 text-orange-400" />
            <span>24/7 Real-Time Food Rescue Dispatch OS</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-slate-100 tracking-tight leading-tight">
            TURN SURPLUS INTO <span className="text-orange-500">A MEAL.</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
            Automated real-time dispatch connecting surplus edible food from restaurants, caterers, and wholesalers with eligible shelters and volunteer drivers before food safety windows expire.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <button
              onClick={onDonateClick}
              className="px-6 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-sm shadow-xl shadow-orange-500/25 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Utensils className="w-5 h-5" />
              <span>DONATE SURPLUS FOOD</span>
            </button>

            <button
              onClick={onViewLiveRescuesClick}
              className="px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-bold text-sm shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Activity className="w-5 h-5 text-cyan-400" />
              <span>LIVE RESCUES COMMAND CENTER</span>
            </button>
          </div>
        </div>

        {/* Control Flow Diagram */}
        <div className="pt-6 border-t border-slate-800/80">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-4">
            Surplus-to-Shelter Operational Control Architecture:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2 text-xs">
            <div className="bg-slate-950/80 p-3 rounded-xl border border-orange-500/40 text-center font-bold text-orange-400">
              FOOD SURPLUS
            </div>
            <div className="hidden lg:flex items-center justify-center text-slate-600">➔</div>
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center font-bold text-slate-200">
              DONOR POSTS
            </div>
            <div className="hidden lg:flex items-center justify-center text-slate-600">➔</div>
            <div className="bg-slate-950/80 p-3 rounded-xl border border-orange-500/40 text-center font-bold text-cyan-400">
              MATCHING ENGINE
              <span className="block text-[10px] text-slate-400 font-normal mt-0.5">(Capacity + Distance + Time)</span>
            </div>
            <div className="hidden lg:flex items-center justify-center text-slate-600">➔</div>
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center font-bold text-orange-400">
              DELIVERY & IMPACT
            </div>
          </div>
        </div>
      </div>

      {/* LIVE RESCUE NETWORK PREVIEW SECTION */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-400" />
              <h2 className="text-2xl font-black text-slate-100 tracking-tight">LIVE RESCUE NETWORK</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold">
                REAL-TIME
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Active time-constrained food dispatch missions currently underway in the field</p>
          </div>

          <button
            onClick={loadRescues}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold cursor-pointer self-start"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-orange-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Missions</span>
          </button>
        </div>

        {loading ? (
          <LoadingSkeleton type="card" count={3} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activeRescues.map((donation) => (
              <SmartRescueCard
                key={donation.id}
                donation={donation}
                onSelect={(don) => setSelectedDonation(don)}
              />
            ))}
          </div>
        )}

        <div className="flex justify-center pt-2">
          <button
            onClick={onViewLiveRescuesClick}
            className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-orange-400 border border-orange-500/40 font-bold text-xs shadow-lg flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
          >
            <span>VIEW ALL ACTIVE RESCUES IN COMMAND CENTER</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* HOW IT WORKS Section */}
      <div className="space-y-6 pt-4">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl font-bold text-slate-100">HOW IT WORKS</h2>
          <p className="text-xs text-slate-400">End-to-end time-constrained food rescue logistics in 5 simple steps</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {workflowSteps.map((st, i) => {
            const Icon = st.icon;
            return (
              <div key={i} className="bg-slate-900 border border-slate-800 hover:border-orange-500/50 p-5 rounded-2xl space-y-3 shadow-lg transition-all">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-orange-400 w-fit">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-100">{st.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{st.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Modal */}
      <RescueDetailModal
        donation={selectedDonation}
        onClose={() => setSelectedDonation(null)}
      />
    </div>
  );
};
