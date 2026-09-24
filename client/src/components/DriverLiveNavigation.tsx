import React, { useState, useEffect } from 'react';
import { fetchApi } from '../services/api';
import { LiveCountdown } from './LiveCountdown';
import { Navigation, AlertTriangle, ShieldCheck, Play, RefreshCw, CheckCircle2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Props {
  donationId: string;
  onOpenPickupQrScanner: () => void;
  onOpenDeliveryQrScanner: () => void;
  onReportIssue: () => void;
}

export const DriverLiveNavigation: React.FC<Props> = ({
  donationId,
  onOpenPickupQrScanner,
  onOpenDeliveryQrScanner,
  onReportIssue,
}) => {
  const [routeData, setRouteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState(0);

  const loadRouteInfo = async () => {
    try {
      setLoading(true);
      const data = await fetchApi<any>(`/navigation/route/${donationId}`);
      setRouteData(data);
    } catch (e) {
      console.error('Failed to load navigation route', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRouteInfo();
    const interval = setInterval(loadRouteInfo, 6000);
    return () => clearInterval(interval);
  }, [donationId]);

  // Leaflet Map Rendering via DOM ref
  useEffect(() => {
    if (!routeData) return;

    const container = document.getElementById(`nav-map-${donationId}`);
    if (!container) return;

    // Clear existing map instance if any
    (container as any)._leaflet_id = null;
    container.innerHTML = '';

    const driverLat = routeData.driverLocation.lat;
    const driverLng = routeData.driverLocation.lng;
    const pickupLat = routeData.pickupLocation.lat;
    const pickupLng = routeData.pickupLocation.lng;
    const ngoLat = routeData.deliveryLocation?.lat || pickupLat;
    const ngoLng = routeData.deliveryLocation?.lng || pickupLng;

    const map = L.map(container).setView([driverLat, driverLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Custom Icon Helpers
    const createCustomIcon = (color: string, label: string) =>
      L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div style="background-color: ${color}; color: white; border: 2px solid white; font-weight: bold; font-size: 10px; padding: 4px 8px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); text-align: center;">${label}</div>`,
        iconSize: [100, 30],
        iconAnchor: [50, 15],
      });

    // Markers
    L.marker([driverLat, driverLng], { icon: createCustomIcon('#f59e0b', '🚚 DRIVER') })
      .addTo(map)
      .bindPopup(`<b>${routeData.driverName || 'Volunteer Driver'}</b><br>${routeData.vehicleType || 'Vehicle'}`);

    L.marker([pickupLat, pickupLng], { icon: createCustomIcon('#10b981', '📍 PICKUP SITE') })
      .addTo(map)
      .bindPopup(`<b>${routeData.donorName}</b><br>${routeData.pickupAddress}`);

    if (routeData.deliveryLocation?.lat) {
      L.marker([ngoLat, ngoLng], { icon: createCustomIcon('#f43f5e', '🏠 SHELTER') })
        .addTo(map)
        .bindPopup(`<b>${routeData.ngoName}</b><br>${routeData.ngoAddress}`);
    }

    // Route Polyline
    const polylineCoords: [number, number][] = [
      [driverLat, driverLng],
      [pickupLat, pickupLng],
      [ngoLat, ngoLng],
    ];

    const polyline = L.polyline(polylineCoords, {
      color: routeData.isOffRoute ? '#ef4444' : '#10b981',
      weight: 5,
      opacity: 0.8,
      dashArray: routeData.isOffRoute ? '10, 10' : undefined,
    }).addTo(map);

    map.fitBounds(polyline.getBounds(), { padding: [40, 40] });

    return () => {
      map.remove();
    };
  }, [routeData]);

  // Geolocation Movement Simulator (Toggle Requirement)
  const handleSimulateMovement = async () => {
    if (!routeData) return;
    setSimulating(true);

    const isPickupDone = ['PICKED_UP', 'IN_TRANSIT'].includes(routeData.status);
    const startLat = routeData.driverLocation.lat;
    const startLng = routeData.driverLocation.lng;
    const targetLat = isPickupDone ? routeData.deliveryLocation.lat : routeData.pickupLocation.lat;
    const targetLng = isPickupDone ? routeData.deliveryLocation.lng : routeData.pickupLocation.lng;

    // Step lerp 25% closer
    const nextProgress = Math.min(1, simProgress + 0.25);
    setSimProgress(nextProgress);

    const newLat = startLat + (targetLat - startLat) * 0.25;
    const newLng = startLng + (targetLng - startLng) * 0.25;

    try {
      await fetchApi('/navigation/location-update', {
        method: 'POST',
        body: JSON.stringify({ donationId, latitude: newLat, longitude: newLng }),
      });
      await loadRouteInfo();
    } catch (e) {
      console.error(e);
    } finally {
      setSimulating(false);
    }
  };

  // Off-Route Deviation Simulator (Toggle Requirement)
  const handleSimulateOffRouteDeviation = async () => {
    if (!routeData) return;
    setSimulating(true);
    try {
      // Move driver 0.03 deg off-route (~3.3 km detour)
      const devLat = routeData.driverLocation.lat + 0.03;
      const devLng = routeData.driverLocation.lng - 0.03;

      await fetchApi('/navigation/location-update', {
        method: 'POST',
        body: JSON.stringify({ donationId, latitude: devLat, longitude: devLng }),
      });
      await loadRouteInfo();
    } catch (e) {
      console.error(e);
    } finally {
      setSimulating(false);
    }
  };

  if (loading && !routeData) {
    return (
      <div className="flex items-center justify-center p-8 bg-slate-900 rounded-2xl border border-slate-800 text-cyan-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Loading Live Navigation Map...
      </div>
    );
  }

  const isPickupDone = ['PICKED_UP', 'IN_TRANSIT'].includes(routeData?.status);
  const isDelivered = routeData?.status === 'DELIVERED';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl space-y-4">
      {/* Navigation Top Lock Header */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
              <span>Driver Live Navigation System</span>
              <span className="text-xs bg-emerald-950 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-800">
                DESTINATION LOCKED
              </span>
            </h3>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mt-0.5">
              <span className={!isPickupDone ? 'text-amber-400 font-bold' : 'text-slate-500'}>1. PICKUP</span>
              <span>→</span>
              <span className={isPickupDone && !isDelivered ? 'text-purple-400 font-bold' : 'text-slate-500'}>2. IN TRANSIT</span>
              <span>→</span>
              <span className={isDelivered ? 'text-emerald-400 font-bold' : 'text-slate-500'}>3. DELIVERY</span>
            </div>
          </div>
        </div>

        {/* Live Safety Countdown */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Food Safety Deadline</span>
            <LiveCountdown safeUntil={routeData?.remainingTimeMinutes ? new Date(Date.now() + routeData.remainingTimeMinutes * 60000).toISOString() : new Date().toISOString()} />
          </div>
        </div>
      </div>

      {/* OFF-ROUTE DEVIATION WARNING ALERT (Requirement 1) */}
      {routeData?.isOffRoute && (
        <div className="mx-4 p-3 bg-rose-950/80 border border-rose-700 text-rose-200 text-xs font-bold rounded-xl flex items-center justify-between shadow-lg animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>⚠ ROUTE DEVIATION DETECTED: Driver is off assigned route! Recalculated ETA: {routeData.estimatedMinutes} mins</span>
          </div>
        </div>
      )}

      {/* INTERACTIVE LEAFLET OPENSTREETMAP DISPLAY */}
      <div className="px-4">
        <div
          id={`nav-map-${donationId}`}
          className="w-full h-80 rounded-2xl border border-slate-700 shadow-inner overflow-hidden z-10"
        />
      </div>

      {/* Route Estimates Bar */}
      <div className="mx-4 bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-300">
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-bold">Route Target:</span>
          <span className="font-bold text-slate-100">{isPickupDone ? routeData?.ngoName : routeData?.donorName}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-bold">Distance Remaining:</span>
          <span className="font-bold text-emerald-400">{routeData?.totalDistanceKm} km</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-bold">Estimated Transit ETA:</span>
          <span className="font-bold text-cyan-300">{routeData?.estimatedMinutes} minutes</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-bold">Driver Status:</span>
          <span className="font-bold text-amber-300">{routeData?.status?.replace('_', ' ')}</span>
        </div>
      </div>

      {/* DEMO LOCATION SIMULATION CONTROLS TOGGLE BAR (Requirement 1 Toggle) */}
      <div className="mx-4 p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
        <span className="font-bold text-slate-300 uppercase tracking-wider block text-[10px]">
          Demo Location Simulation Controls (Toggle Driver Movement):
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleSimulateMovement}
            disabled={simulating}
            className="py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
          >
            {simulating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>Simulate Route Movement (+25%)</span>
          </button>

          <button
            onClick={handleSimulateOffRouteDeviation}
            disabled={simulating}
            className="py-2 px-3 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-rose-200 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Simulate Off-Route Deviation</span>
          </button>
        </div>
      </div>

      {/* Driver Operational Action Buttons */}
      <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onReportIssue}
          className="px-4 py-2.5 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Report Emergency / Issue</span>
        </button>

        <div className="flex flex-wrap gap-3">
          {!isPickupDone && (
            <button
              onClick={onOpenPickupQrScanner}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Scan Package QR & Confirm Pickup</span>
            </button>
          )}

          {isPickupDone && !isDelivered && (
            <button
              onClick={onOpenDeliveryQrScanner}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Scan Package QR & Confirm Delivery</span>
            </button>
          )}

          {isDelivered && (
            <div className="px-4 py-2 rounded-xl bg-emerald-950 border border-emerald-700 text-emerald-300 font-bold text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Delivery Verified & Completed ✓</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
