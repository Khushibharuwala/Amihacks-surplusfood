"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../db/database"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const haversine_1 = require("../utils/haversine");
const stateMachine_1 = require("../utils/stateMachine");
const matchingService_1 = require("../services/matchingService");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticate);
router.use((0, authMiddleware_1.authorizeRoles)('DRIVER'));
// Driver Dashboard
router.get('/dashboard', (req, res) => {
    try {
        const userId = req.user.id;
        const profile = database_1.default.prepare('SELECT * FROM driver_profiles WHERE user_id = ?').get(userId);
        if (!profile) {
            return res.status(404).json({ error: 'Driver profile not found' });
        }
        const assignedDeliveries = database_1.default.prepare(`
      SELECT del.*,
        d.id as donation_id, d.food_type, d.description, d.quantity_kg, d.safe_until,
        d.pickup_address, d.pickup_latitude, d.pickup_longitude, d.status as donation_status,
        dp.organization_name as donor_name, dp.phone as donor_phone,
        np.organization_name as ngo_name, np.address as ngo_address, np.phone as ngo_phone,
        np.latitude as ngo_latitude, np.longitude as ngo_longitude
      FROM deliveries del
      JOIN donations d ON del.donation_id = d.id
      JOIN donor_profiles dp ON d.donor_id = dp.id
      JOIN ngo_profiles np ON del.ngo_id = np.id
      WHERE del.driver_id = ? AND del.status IN ('ASSIGNED', 'ACCEPTED', 'PICKUP_STARTED', 'PICKED_UP')
      ORDER BY del.updated_at DESC
    `).all(profile.id);
        // Calculate distance and estimated travel times for each active delivery
        const enrichedDeliveries = assignedDeliveries.map((del) => {
            const distToPickup = (0, haversine_1.calculateDistanceKm)(profile.latitude, profile.longitude, del.pickup_latitude, del.pickup_longitude);
            const distPickupToNgo = (0, haversine_1.calculateDistanceKm)(del.pickup_latitude, del.pickup_longitude, del.ngo_latitude, del.ngo_longitude);
            const totalDistanceKm = Math.round((distToPickup + distPickupToNgo) * 100) / 100;
            const estimatedMinutes = (0, haversine_1.estimateTravelTimeMinutes)(totalDistanceKm);
            return {
                ...del,
                driver_to_pickup_km: distToPickup,
                pickup_to_ngo_km: distPickupToNgo,
                total_distance_km: totalDistanceKm,
                estimated_minutes: estimatedMinutes,
            };
        });
        const completedDeliveries = database_1.default.prepare(`
      SELECT del.*, d.food_type, d.quantity_kg, dp.organization_name as donor_name, np.organization_name as ngo_name
      FROM deliveries del
      JOIN donations d ON del.donation_id = d.id
      JOIN donor_profiles dp ON d.donor_id = dp.id
      JOIN ngo_profiles np ON del.ngo_id = np.id
      WHERE del.driver_id = ? AND del.status = 'DELIVERED'
      ORDER BY del.delivery_time DESC
    `).all(profile.id);
        res.json({
            profile,
            assignedDeliveries: enrichedDeliveries,
            completedDeliveries,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET Available Dispatch Orders for Driver Browsing
router.get('/available-orders', (req, res) => {
    try {
        const userId = req.user.id;
        const profile = database_1.default.prepare('SELECT * FROM driver_profiles WHERE user_id = ?').get(userId);
        if (!profile) {
            return res.status(404).json({ error: 'Driver profile not found' });
        }
        // Get unassigned deliveries or donations that are available for driver pickup
        const availableOrders = database_1.default.prepare(`
      SELECT d.id as donation_id, d.food_type, d.description, d.quantity_kg, d.safe_until, d.image_url,
        d.pickup_address, d.pickup_latitude, d.pickup_longitude, d.status as donation_status,
        dp.organization_name as donor_name, dp.phone as donor_phone,
        COALESCE(np.organization_name, 'Shelter Recipient') as ngo_name,
        COALESCE(np.address, d.pickup_address) as ngo_address,
        COALESCE(np.latitude, d.pickup_latitude) as ngo_latitude,
        COALESCE(np.longitude, d.pickup_longitude) as ngo_longitude,
        COALESCE(del.id, 'del_unassigned') as delivery_id
      FROM donations d
      JOIN donor_profiles dp ON d.donor_id = dp.id
      LEFT JOIN matches m ON m.donation_id = d.id AND m.status != 'REJECTED'
      LEFT JOIN ngo_profiles np ON m.ngo_id = np.id
      LEFT JOIN deliveries del ON del.donation_id = d.id
      WHERE d.status NOT IN ('DELIVERED', 'EXPIRED', 'CANCELLED')
        AND (del.id IS NULL OR del.driver_id IS NULL OR del.driver_id = ? OR del.status IN ('ASSIGNED', 'ACCEPTED'))
      ORDER BY d.created_at DESC
    `).all(profile.id);
        const enrichedOrders = availableOrders.map((ord) => {
            const distToPickup = (0, haversine_1.calculateDistanceKm)(profile.latitude, profile.longitude, ord.pickup_latitude, ord.pickup_longitude);
            const distPickupToNgo = (0, haversine_1.calculateDistanceKm)(ord.pickup_latitude, ord.pickup_longitude, ord.ngo_latitude, ord.ngo_longitude);
            const totalKm = Math.round((distToPickup + distPickupToNgo) * 100) / 100;
            return {
                ...ord,
                driver_to_pickup_km: distToPickup,
                pickup_to_ngo_km: distPickupToNgo,
                total_distance_km: totalKm,
                estimated_minutes: (0, haversine_1.estimateTravelTimeMinutes)(totalKm),
            };
        });
        res.json({ availableOrders: enrichedOrders });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST Driver Accepts an Available Delivery Order
router.post('/accept-order/:donationId', (req, res) => {
    try {
        const userId = req.user.id;
        const donationId = req.params.donationId;
        const profile = database_1.default.prepare('SELECT * FROM driver_profiles WHERE user_id = ?').get(userId);
        if (!profile)
            return res.status(404).json({ error: 'Driver profile not found' });
        let match = database_1.default.prepare('SELECT * FROM matches WHERE donation_id = ? AND status != "REJECTED" ORDER BY created_at DESC').get(donationId);
        let ngoId = match ? match.ngo_id : null;
        if (!ngoId) {
            const activeNgo = database_1.default.prepare('SELECT id FROM ngo_profiles WHERE is_active = 1 LIMIT 1').get();
            ngoId = activeNgo ? activeNgo.id : 'ngo_default';
            const newMatchId = 'match_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
            database_1.default.prepare(`
        INSERT INTO matches (id, donation_id, ngo_id, driver_id, match_score, distance_km, estimated_minutes, status, created_at)
        VALUES (?, ?, ?, ?, 95.0, 3.5, 15, 'ACCEPTED', CURRENT_TIMESTAMP)
      `).run(newMatchId, donationId, ngoId, profile.id);
        }
        else {
            database_1.default.prepare(`UPDATE matches SET driver_id = ?, status = 'ACCEPTED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(profile.id, match.id);
        }
        // Check if delivery record already exists
        let delivery = database_1.default.prepare('SELECT * FROM deliveries WHERE donation_id = ?').get(donationId);
        if (!delivery) {
            const delId = 'del_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
            database_1.default.prepare(`
        INSERT INTO deliveries (id, donation_id, driver_id, ngo_id, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'ACCEPTED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(delId, donationId, profile.id, ngoId);
        }
        else {
            database_1.default.prepare(`
        UPDATE deliveries
        SET driver_id = ?, status = 'ACCEPTED', updated_at = CURRENT_TIMESTAMP
        WHERE donation_id = ?
      `).run(profile.id, donationId);
        }
        // Update donation status to DRIVER_ASSIGNED
        database_1.default.prepare(`UPDATE donations SET status = 'DRIVER_ASSIGNED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(donationId);
        // Sync to MongoDB Atlas
        const { syncDonationToMongo, syncDeliveryToMongo } = require('../services/mongoSyncService');
        syncDonationToMongo(donationId).catch(() => { });
        if (delivery)
            syncDeliveryToMongo(delivery.id).catch(() => { });
        res.json({ message: 'Delivery job successfully accepted by driver!', donationId });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Update Availability & Location
router.put('/status', (req, res) => {
    try {
        const userId = req.user.id;
        const { is_available, latitude, longitude } = req.body;
        const profile = database_1.default.prepare('SELECT id FROM driver_profiles WHERE user_id = ?').get(userId);
        if (!profile)
            return res.status(404).json({ error: 'Driver profile not found' });
        database_1.default.prepare(`
      UPDATE driver_profiles
      SET is_available = COALESCE(?, is_available),
          latitude = COALESCE(?, latitude),
          longitude = COALESCE(?, longitude)
      WHERE id = ?
    `).run(is_available !== undefined ? (is_available ? 1 : 0) : null, latitude !== undefined ? Number(latitude) : null, longitude !== undefined ? Number(longitude) : null, profile.id);
        const updated = database_1.default.prepare('SELECT * FROM driver_profiles WHERE id = ?').get(profile.id);
        res.json({ message: 'Driver status updated', profile: updated });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Driver Cancels Assignment / Reports Issue -> Triggers Automatic Reassignment
router.post('/deliveries/:deliveryId/cancel', (req, res) => {
    try {
        const userId = req.user.id;
        const deliveryId = req.params.deliveryId;
        const { reason } = req.body;
        const profile = database_1.default.prepare('SELECT id FROM driver_profiles WHERE user_id = ?').get(userId);
        if (!profile)
            return res.status(404).json({ error: 'Driver profile not found' });
        const delivery = database_1.default.prepare('SELECT * FROM deliveries WHERE id = ? AND driver_id = ?').get(deliveryId, profile.id);
        if (!delivery)
            return res.status(404).json({ error: 'Delivery record not found' });
        // Execute automatic driver reassignment
        const reassignmentResult = (0, matchingService_1.reassignDriver)(delivery.donation_id, reason || 'Driver unavailable / reported issue');
        res.json({
            message: 'Assignment cancelled. System initiated automatic driver reassignment.',
            reassignmentResult,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Update Delivery Operational Status (Accept, Start Pickup, Picked Up, Delivered)
router.post('/deliveries/:deliveryId/status', (req, res) => {
    try {
        const userId = req.user.id;
        const deliveryId = req.params.deliveryId;
        const { next_status } = req.body;
        const profile = database_1.default.prepare('SELECT id FROM driver_profiles WHERE user_id = ?').get(userId);
        if (!profile)
            return res.status(404).json({ error: 'Driver profile not found' });
        const delivery = database_1.default.prepare('SELECT * FROM deliveries WHERE id = ? AND driver_id = ?').get(deliveryId, profile.id);
        if (!delivery)
            return res.status(404).json({ error: 'Delivery record not found' });
        const donation = database_1.default.prepare('SELECT * FROM donations WHERE id = ?').get(delivery.donation_id);
        if (!donation)
            return res.status(404).json({ error: 'Associated donation not found' });
        let targetDonationStatus = donation.status;
        let pickupTime = delivery.pickup_time;
        let deliveryTime = delivery.delivery_time;
        if (next_status === 'ACCEPTED') {
            targetDonationStatus = 'MATCHED';
        }
        else if (next_status === 'PICKUP_STARTED') {
            (0, stateMachine_1.validateStateTransition)(donation.status, 'PICKUP_STARTED');
            targetDonationStatus = 'PICKUP_STARTED';
        }
        else if (next_status === 'PICKED_UP') {
            (0, stateMachine_1.validateStateTransition)(donation.status, 'PICKED_UP');
            targetDonationStatus = 'PICKED_UP';
            pickupTime = new Date().toISOString();
        }
        else if (next_status === 'DELIVERED') {
            (0, stateMachine_1.validateStateTransition)(donation.status, 'DELIVERED');
            targetDonationStatus = 'DELIVERED';
            deliveryTime = new Date().toISOString();
        }
        else {
            return res.status(400).json({ error: `Invalid status transition target: '${next_status}'` });
        }
        // Update Delivery record
        database_1.default.prepare(`
      UPDATE deliveries
      SET status = ?, pickup_time = COALESCE(?, pickup_time), delivery_time = COALESCE(?, delivery_time), updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(next_status, pickupTime, deliveryTime, deliveryId);
        // Update Donation record
        database_1.default.prepare(`
      UPDATE donations
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(targetDonationStatus, donation.id);
        const updatedDelivery = database_1.default.prepare('SELECT * FROM deliveries WHERE id = ?').get(deliveryId);
        res.json({
            message: `Delivery updated to ${next_status}`,
            delivery: updatedDelivery,
            donationStatus: targetDonationStatus,
        });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;
