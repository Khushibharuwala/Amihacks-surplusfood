import React, { useState, useEffect } from 'react';
import { fetchApi } from '../services/api';
import type { Donation } from '../types';
import { SmartRescueCard } from '../components/SmartRescueCard';
import { RescueDetailModal } from '../components/RescueDetailModal';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Activity, MapPin, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export const LiveRescuesPage: React.FC = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);

  const loadLiveRescues = async () => {
    try {
      setLoading(true);
     const data = await fetchApi<{ rescues: Donation[] }>('/rescues/live');
      setDonations(data.rescues ?? []);
    } catch (e) {
      console.error('Failed to load active rescues', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLiveRescues();
    const interval = setInterval(loadLiveRescues, 10000);
    return () => clearInterval(interval);
  }, []);

  // Map Initialization & Rendering
  useEffect(() => {
    const container = document.getElementById('command-center-map');
    if (!container || donations.length === 0) return;

    (container as any)._leaflet_id = null;
    container.innerHTML = '';

    const map = L.map(container).setView([37.7749, -122.4194], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    const createIcon = (color: string, label: string) =>
      L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div style="background-color: ${color}; color: white; border: 2px solid white; font-weight: bold; font-size: 10px; padding: 4px 8px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); text-align: center;">${label}</div>`,
        iconSize: [100, 30],
        iconAnchor: [50, 15],
      });

    donations.forEach((don) => {
      const pLat = don.pickup_latitude || 37.7749;
      const pLng = don.pickup_longitude || -122.4194;

      // Donor Marker
      L.marker([pLat, pLng], { icon: createIcon('#f97316', '🔴 DONOR') })
        .addTo(map)
        .bindPopup(`<b>${don.food_type} (${don.quantity_kg} kg)</b><br>Donor: ${don.donor_name || 'Donor Site'}`);

      // NGO Marker if matched
      if (don.ngo_name) {
        const nLat = pLat + 0.02;
        const nLng = pLng + 0.02;
        L.marker([nLat, nLng], { icon: createIcon('#10b981', '🟢 NGO') })
          .addTo(map)
          .bindPopup(`<b>${don.ngo_name}</b><br>${don.ngo_address || 'Shelter'}`);

        L.polyline([[pLat, pLng], [nLat, nLng]], { color: '#f97316', weight: 3, dashArray: '6, 6' }).addTo(map);
      }
    });
  }, [donations]);

  // Derived Metrics Counters
  const criticalCount = donations.filter((d) => d.risk_level === 'CRITICAL').length;
  const highRiskCount = donations.filter((d) => d.risk_level === 'HIGH').length;
  const inTransitCount = donations.filter((d) => ['PICKUP_STARTED', 'PICKED_UP', 'IN_TRANSIT'].includes(d.status)).length;
  const completedTodayCount = donations.filter((d) => d.status === 'DELIVERED').length;

  // Filter Logic
  const filteredDonations = donations.filter((d) => {
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        d.food_type.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        (d.donor_name && d.donor_name.toLowerCase().includes(q)) ||
        (d.ngo_name && d.ngo_name.toLowerCase().includes(q));
      if (!matchSearch) return false;
    }

    if (activeFilter === 'CRITICAL') return d.risk_level === 'CRITICAL';
    if (activeFilter === 'HIGH_RISK') return d.risk_level === 'HIGH';
    if (activeFilter === 'MATCHED') return d.status === 'MATCHED' || d.status === 'DRIVER_ASSIGNED';
    if (activeFilter === 'IN_TRANSIT') return ['PICKUP_STARTED', 'PICKED_UP', 'IN_TRANSIT'].includes(d.status);
    if (activeFilter === 'COMPLETED') return d.status === 'DELIVERED';
    if (activeFilter === 'EXPIRED') return d.status === 'EXPIRED';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner & Status Summary Counters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-400" />
              <h2 className="text-2xl font-black text-slate-100 tracking-tight">LIVE RESCUE NETWORK</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">Real-time geographic command center monitoring active food rescue dispatch operations</p>
          </div>

          <button
            onClick={loadLiveRescues}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer self-start"
          >
            <RefreshCw className={`w-4 h-4 text-orange-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Live Network</span>
          </button>
        </div>

        {/* Counters Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-rose-950/50 border border-rose-800 p-3.5 rounded-xl space-y-1">
            <span className="text-rose-300 font-bold uppercase tracking-wider block text-[10px]">Critical Urgency</span>
            <div className="text-2xl font-black text-rose-400">{criticalCount}</div>
          </div>

          <div className="bg-amber-950/50 border border-amber-800 p-3.5 rounded-xl space-y-1">
            <span className="text-amber-300 font-bold uppercase tracking-wider block text-[10px]">At Risk</span>
            <div className="text-2xl font-black text-amber-400">{highRiskCount}</div>
          </div>

          <div className="bg-cyan-950/50 border border-cyan-800 p-3.5 rounded-xl space-y-1">
            <span className="text-cyan-300 font-bold uppercase tracking-wider block text-[10px]">In Transit</span>
            <div className="text-2xl font-black text-cyan-400">{inTransitCount}</div>
          </div>

          <div className="bg-emerald-950/50 border border-emerald-800 p-3.5 rounded-xl space-y-1">
            <span className="text-emerald-300 font-bold uppercase tracking-wider block text-[10px]">Completed Today</span>
            <div className="text-2xl font-black text-emerald-400">{completedTodayCount}</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 bg-slate-900 p-1.5 rounded-xl border border-slate-800 text-xs font-semibold w-full sm:w-auto">
          {['ALL', 'CRITICAL', 'HIGH_RISK', 'MATCHED', 'IN_TRANSIT', 'COMPLETED', 'EXPIRED'].map((flt) => (
            <button
              key={flt}
              onClick={() => setActiveFilter(flt)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeFilter === flt ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {flt.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search rescue by donor, food..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {/* Command Center Geographical Map */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-2">
        <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300 font-semibold">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-orange-400" /> Geographic Rescue Grid Map (🔴 Donor | 🔵 Driver | 🟢 NGO)
          </span>
          <span className="text-slate-500">Auto-refreshing every 10s</span>
        </div>
        <div id="command-center-map" className="w-full h-80 bg-slate-950" />
      </div>

      {/* Rescues List Grid */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-200 text-base">Active Food Rescue Cards ({filteredDonations.length})</h3>

        {loading ? (
          <LoadingSkeleton type="card" count={3} />
        ) : filteredDonations.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-sm space-y-2">
            <ShieldAlert className="w-8 h-8 text-orange-400 mx-auto" />
            <p className="font-bold text-slate-200">No active rescues match the selected filter criteria.</p>
            <p className="text-xs text-slate-500">Try changing the search filter or selecting "ALL" rescues.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDonations.map((don) => (
              <SmartRescueCard
                key={don.id}
                donation={don}
                onSelect={(d) => setSelectedDonation(d)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Rescue Detailed Inspector Modal */}
      <RescueDetailModal
        donation={selectedDonation}
        onClose={() => setSelectedDonation(null)}
      />
    </div>
  );
};
