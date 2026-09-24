"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importStar(require("../db/database"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const haversine_1 = require("../utils/haversine");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticate);
// Update Driver Live Geolocation Coordinates & Monitor Route Deviation / Deadline Breaches (Requirement 1)
router.post('/location-update', (req, res) => {
    try {
        const { donationId, latitude, longitude } = req.body;
        const userId = req.user.id;
        const role = req.user.role;
        if (!donationId || latitude === undefined || longitude === undefined) {
            return res.status(400).json({ error: 'donationId, latitude, longitude are required' });
        }
        const profile = database_1.default.prepare('SELECT id FROM driver_profiles WHERE user_id = ?').get(userId);
        if (!profile)
            return res.status(404).json({ error: 'Driver profile not found' });
        const driverLat = Number(latitude);
        const driverLng = Number(longitude);
        // Update driver profile current location
        database_1.default.prepare('UPDATE driver_profiles SET latitude = ?, longitude = ? WHERE id = ?').run(driverLat, driverLng, profile.id);
        const donation = database_1.default.prepare(`
      SELECT d.*, 
        dp.organization_name as donor_name, dp.latitude as pickup_lat, dp.longitude as pickup_lng,
        np.organization_name as ngo_name, np.latitude as ngo_lat, np.longitude as ngo_lng
      FROM donations d
      JOIN donor_profiles dp ON d.donor_id = dp.id
      LEFT JOIN matches m ON d.id = m.donation_id AND m.status != 'REJECTED'
      LEFT JOIN ngo_profiles np ON m.ngo_id = np.id
      WHERE d.id = ?
    `).get(donationId);
        if (!donation) {
            return res.status(404).json({ error: 'Donation not found' });
        }
        // Calculate planned route line distance
        // Driver -> Donor pickup dist (if POSTED/MATCHED/DRIVER_ASSIGNED)
        // Driver -> NGO delivery dist (if IN_TRANSIT / PICKED_UP)
        const isPickupDone = ['PICKED_UP', 'IN_TRANSIT'].includes(donation.status);
        const targetLat = isPickupDone ? donation.ngo_lat : donation.pickup_lat;
        const targetLng = isPickupDone ? donation.ngo_lng : donation.pickup_lng;
        const distanceToTargetKm = (0, haversine_1.calculateDistanceKm)(driverLat, driverLng, targetLat, targetLng);
        const estimatedMinutes = (0, haversine_1.estimateTravelTimeMinutes)(distanceToTargetKm);
        // DEVIATION MONITORING: Check if driver is significantly off-route (> 0.5 km perpendicular offset)
        const directLineDist = (0, haversine_1.calculateDistanceKm)(donation.pickup_lat, donation.pickup_lng, donation.ngo_lat, donation.ngo_lng);
        const driverToDonor = (0, haversine_1.calculateDistanceKm)(driverLat, driverLng, donation.pickup_lat, donation.pickup_lng);
        const driverToNgo = (0, haversine_1.calculateDistanceKm)(driverLat, driverLng, donation.ngo_lat, donation.ngo_lng);
        // Triangle inequality offset approximation
        const routeDeviationKm = Math.max(0, (driverToDonor + driverToNgo) - directLineDist);
        const isOffRoute = routeDeviationKm > 1.2; // Significant off-route threshold > 1.2 km detour
        // Insert driver location log
        const locId = 'loc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        database_1.default.prepare(`
      INSERT INTO driver_locations (id, driver_id, donation_id, latitude, longitude, is_off_route, created_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(locId, profile.id, donationId, driverLat, driverLng, isOffRoute ? 1 : 0);
        // If Off-Route Deviation Detected -> Flag warning, log event, notify admin!
        if (isOffRoute) {
            (0, database_1.recordVerificationEvent)(donationId, null, 'ROUTE_DEVIATION_DETECTED', userId, role, 'WARNING', {
                driver_lat: driverLat,
                driver_lng: driverLng,
                deviation_km: Math.round(routeDeviationKm * 100) / 100,
                recalculated_eta_mins: estimatedMinutes,
            });
            (0, database_1.addNotification)('ALL', 'ROUTE_DEVIATION', '⚠ Driver Route Deviation Warning', `Driver for donation ${donationId} is off-route by ${Math.round(routeDeviationKm * 100) / 100} km. Recalculated ETA: ${estimatedMinutes} mins.`, donationId);
        }
        // DEADLINE MONITORING: remaining safe time vs ETA
        const now = new Date();
        const safeUntil = new Date(donation.safe_until);
        const remainingTimeMinutes = Math.max(0, Math.floor((safeUntil.getTime() - now.getTime()) / 60000));
        const isDeadlineBreached = estimatedMinutes > remainingTimeMinutes;
        if (isDeadlineBreached) {
            (0, database_1.addRescueLog)(donationId, 'Deadline Monitor', 'SYSTEM', 'DEADLINE_BREACH_WARNING', 'CRITICAL', `Recalculated travel ETA (${estimatedMinutes} mins) exceeds safe donation window (${remainingTimeMinutes} mins)!`);
            (0, database_1.addNotification)('ALL', 'RESCUE_ALERT', '🚨 CRITICAL: Delivery Deadline Breach Warning!', `ETA (${estimatedMinutes}m) exceeds food safe time remaining (${remainingTimeMinutes}m) for donation ${donationId}. Immediate dispatch intervention required!`, donationId);
        }
        res.json({
            success: true,
            donationId,
            driverLocation: { latitude: driverLat, longitude: driverLng },
            destination: { latitude: targetLat, longitude: targetLng },
            distanceRemainingKm: distanceToTargetKm,
            estimatedMinutes,
            remainingTimeMinutes,
            isOffRoute,
            deviationKm: Math.round(routeDeviationKm * 100) / 100,
            isDeadlineBreached,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Get Navigation Route Details & Polyline Coordinates for Map Rendering
router.get('/route/:donationId', (req, res) => {
    try {
        const donationId = req.params.donationId;
        const donation = database_1.default.prepare(`
      SELECT d.*,
        dp.organization_name as donor_name, dp.address as pickup_address, dp.latitude as pickup_lat, dp.longitude as pickup_lng,
        np.organization_name as ngo_name, np.address as ngo_address, np.latitude as ngo_lat, np.longitude as ngo_lng,
        drv.id as driver_profile_id, drv.latitude as driver_lat, drv.longitude as driver_lng, drv.vehicle_type,
        drv_user.name as driver_name,
        del.status as delivery_status
      FROM donations d
      JOIN donor_profiles dp ON d.donor_id = dp.id
      LEFT JOIN matches m ON d.id = m.donation_id AND m.status != 'REJECTED'
      LEFT JOIN ngo_profiles np ON m.ngo_id = np.id
      LEFT JOIN driver_profiles drv ON m.driver_id = drv.id
      LEFT JOIN users drv_user ON drv.user_id = drv_user.id
      LEFT JOIN deliveries del ON d.id = del.donation_id
      WHERE d.id = ?
    `).get(donationId);
        if (!donation) {
            return res.status(404).json({ error: 'Donation not found' });
        }
        const driverLat = donation.driver_lat || donation.pickup_lat;
        const driverLng = donation.driver_lng || donation.pickup_lng;
        const isPickupDone = ['PICKED_UP', 'IN_TRANSIT'].includes(donation.status);
        const distDriverToPickup = (0, haversine_1.calculateDistanceKm)(driverLat, driverLng, donation.pickup_lat, donation.pickup_longitude);
        const distPickupToNgo = donation.ngo_lat ? (0, haversine_1.calculateDistanceKm)(donation.pickup_lat, donation.pickup_longitude, donation.ngo_lat, donation.ngo_lng) : 3.2;
        const totalDistKm = isPickupDone
            ? (0, haversine_1.calculateDistanceKm)(driverLat, driverLng, donation.ngo_lat || donation.pickup_lat, donation.ngo_lng || donation.pickup_longitude)
            : distDriverToPickup + distPickupToNgo;
        const estimatedMinutes = (0, haversine_1.estimateTravelTimeMinutes)(totalDistKm);
        const now = new Date();
        const safeUntil = new Date(donation.safe_until);
        const remainingTimeMinutes = Math.max(0, Math.floor((safeUntil.getTime() - now.getTime()) / 60000));
        // Get latest location logs
        const latestLoc = database_1.default.prepare('SELECT * FROM driver_locations WHERE donation_id = ? ORDER BY created_at DESC LIMIT 1').get(donationId);
        const isOffRoute = Boolean(latestLoc?.is_off_route);
        // Route Waypoint Coordinates Array (Driver -> Pickup -> NGO)
        const routeWaypoints = [
            { name: 'Driver Location', lat: driverLat, lng: driverLng, type: 'DRIVER' },
            { name: donation.donor_name, lat: donation.pickup_lat, lng: donation.pickup_longitude, type: 'PICKUP' },
        ];
        if (donation.ngo_lat) {
            routeWaypoints.push({ name: donation.ngo_name, lat: donation.ngo_lat, lng: donation.ngo_lng, type: 'DELIVERY' });
        }
        res.json({
            donationId,
            status: donation.status,
            driverName: donation.driver_name,
            vehicleType: donation.vehicle_type,
            donorName: donation.donor_name,
            pickupAddress: donation.pickup_address,
            ngoName: donation.ngo_name,
            ngoAddress: donation.ngo_address,
            driverLocation: { lat: driverLat, lng: driverLng },
            pickupLocation: { lat: donation.pickup_lat, lng: donation.pickup_longitude },
            deliveryLocation: { lat: donation.ngo_lat, lng: donation.ngo_lng },
            totalDistanceKm: Math.round(totalDistKm * 100) / 100,
            estimatedMinutes,
            remainingTimeMinutes,
            isOffRoute,
            isPickupDone,
            routeWaypoints,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
