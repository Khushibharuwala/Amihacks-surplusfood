"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const donation_1 = __importDefault(require("../models/donation"));
const express_1 = require("express");
const database_1 = __importDefault(require("../db/database"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const matchingService_1 = require("../services/matchingService");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticate);
router.use((0, authMiddleware_1.authorizeRoles)('NGO'));
// Get NGO Dashboard
router.get('/dashboard', (req, res) => {
    try {
        const userId = req.user.id;
        const profile = database_1.default.prepare('SELECT * FROM ngo_profiles WHERE user_id = ?').get(userId);
        if (!profile) {
            return res.status(404).json({ error: 'NGO profile not found' });
        }
        // Parsed accepted food types
        let acceptedTypes = [];
        try {
            acceptedTypes = JSON.parse(profile.accepted_food_types);
        }
        catch {
            acceptedTypes = [profile.accepted_food_types];
        }
        // Incoming matches
        const incomingMatches = database_1.default.prepare(`
      SELECT m.*, d.food_type, d.description, d.quantity_kg, d.safe_until, d.pickup_address,
        dp.organization_name as donor_name, dp.phone as donor_phone,
        drv_user.name as driver_name, drv.phone as driver_phone
      FROM matches m
      JOIN donations d ON m.donation_id = d.id
      JOIN donor_profiles dp ON d.donor_id = dp.id
      LEFT JOIN driver_profiles drv ON m.driver_id = drv.id
      LEFT JOIN users drv_user ON drv.user_id = drv_user.id
      WHERE m.ngo_id = ? AND m.status = 'PENDING' AND d.status NOT IN ('EXPIRED', 'CANCELLED', 'DELIVERED')
      ORDER BY m.created_at DESC
    `).all(profile.id);
        // Active deliveries with driver live GPS & route status
        const activeDeliveries = database_1.default.prepare(`
      SELECT del.*, d.food_type, d.quantity_kg, d.description, d.pickup_address, d.safe_until,
        d.pickup_latitude, d.pickup_longitude,
        dp.organization_name as donor_name, dp.phone as donor_phone,
        drv.latitude as driver_lat, drv.longitude as driver_lng, drv.vehicle_type, drv.is_available as driver_online,
        drv_user.name as driver_name, drv.phone as driver_phone
      FROM deliveries del
      JOIN donations d ON del.donation_id = d.id
      JOIN donor_profiles dp ON d.donor_id = dp.id
      JOIN driver_profiles drv ON del.driver_id = drv.id
      JOIN users drv_user ON drv.user_id = drv_user.id
      WHERE del.ngo_id = ? AND del.status IN ('ASSIGNED', 'ACCEPTED', 'PICKUP_STARTED', 'PICKED_UP')
      ORDER BY del.updated_at DESC
    `).all(profile.id);
        // Completed deliveries
        const completedDeliveries = database_1.default.prepare(`
      SELECT del.*, d.food_type, d.quantity_kg, d.description,
        dp.organization_name as donor_name,
        drv_user.name as driver_name
      FROM deliveries del
      JOIN donations d ON del.donation_id = d.id
      JOIN donor_profiles dp ON d.donor_id = dp.id
      JOIN driver_profiles drv ON del.driver_id = drv.id
      JOIN users drv_user ON drv.user_id = drv_user.id
      WHERE del.ngo_id = ? AND del.status = 'DELIVERED'
      ORDER BY del.delivery_time DESC
    `).all(profile.id);
        const availableCapacityKg = Math.max(0, profile.maximum_capacity_kg - profile.current_load_kg);
        res.json({
            profile: {
                ...profile,
                accepted_food_types: acceptedTypes,
                available_capacity_kg: availableCapacityKg,
            },
            incomingMatches,
            activeDeliveries,
            completedDeliveries,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET Available Posted Surplus Food Donations for NGO Browsing & Ordering
router.get('/available-donations', async (req, res) => {
    try {
        const donations = await donation_1.default.find({
            status: { $nin: ['DELIVERED', 'EXPIRED', 'CANCELLED'] },
        }).sort({ createdAt: -1 }).lean();
        const availableDonations = donations.map((donation) => ({
            ...donation,
            donor_name: donation.donor_name || 'Food Donor',
            donor_address: donation.pickup_address,
            donor_latitude: donation.pickup_latitude,
            donor_longitude: donation.pickup_longitude,
        }));
        res.json({ availableDonations });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST NGO Orders/Claims a Posted Surplus Food Donation
router.post('/order-donation/:donationId', (req, res) => {
    try {
        const userId = req.user.id;
        const donationId = req.params.donationId;
        const profile = database_1.default.prepare('SELECT * FROM ngo_profiles WHERE user_id = ?').get(userId);
        if (!profile)
            return res.status(404).json({ error: 'NGO profile not found' });
        const donation = database_1.default.prepare('SELECT * FROM donations WHERE id = ?').get(donationId);
        if (!donation)
            return res.status(404).json({ error: 'Donation not found' });
        if (donation.status === 'DELIVERED' || donation.status === 'EXPIRED' || donation.status === 'CANCELLED') {
            return res.status(400).json({ error: `Donation is no longer available (Current Status: ${donation.status})` });
        }
        // Evaluate & auto match / assign driver
        const matchResult = (0, matchingService_1.evaluateAndMatchDonation)(donationId);
        // Ensure a match record exists for this NGO
        const existingMatch = database_1.default.prepare('SELECT * FROM matches WHERE donation_id = ? AND ngo_id = ?').get(donationId, profile.id);
        if (!existingMatch) {
            const matchId = 'match_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
            database_1.default.prepare(`
        INSERT INTO matches (id, donation_id, ngo_id, match_score, distance_km, estimated_minutes, status, created_at)
        VALUES (?, ?, ?, 95.0, 3.5, 12, 'ACCEPTED', CURRENT_TIMESTAMP)
      `).run(matchId, donationId, profile.id);
        }
        else {
            database_1.default.prepare(`UPDATE matches SET status = 'ACCEPTED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(existingMatch.id);
        }
        // Update donation status to MATCHED
        database_1.default.prepare(`UPDATE donations SET status = 'MATCHED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(donationId);
        // Update current load of NGO
        database_1.default.prepare(`UPDATE ngo_profiles SET current_load_kg = current_load_kg + ? WHERE id = ?`).run(donation.quantity_kg, profile.id);
        // Sync to MongoDB Atlas
        const { syncDonationToMongo, syncMatchToMongo } = require('../services/mongoSyncService');
        syncDonationToMongo(donationId).catch(() => { });
        if (existingMatch)
            syncMatchToMongo(existingMatch.id).catch(() => { });
        res.json({
            message: 'Donation successfully ordered by NGO and assigned to delivery pipeline!',
            donationId,
            matchResult,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Update NGO Profile Settings
router.put('/profile', (req, res) => {
    try {
        const userId = req.user.id;
        const { maximum_capacity_kg, current_load_kg, accepted_food_types, requirements, is_active, latitude, longitude, address } = req.body;
        const profile = database_1.default.prepare('SELECT id FROM ngo_profiles WHERE user_id = ?').get(userId);
        if (!profile) {
            return res.status(404).json({ error: 'NGO profile not found' });
        }
        const foodTypesStr = Array.isArray(accepted_food_types)
            ? JSON.stringify(accepted_food_types)
            : accepted_food_types;
        database_1.default.prepare(`
      UPDATE ngo_profiles
      SET maximum_capacity_kg = COALESCE(?, maximum_capacity_kg),
          current_load_kg = COALESCE(?, current_load_kg),
          accepted_food_types = COALESCE(?, accepted_food_types),
          requirements = COALESCE(?, requirements),
          is_active = COALESCE(?, is_active),
          latitude = COALESCE(?, latitude),
          longitude = COALESCE(?, longitude),
          address = COALESCE(?, address)
      WHERE id = ?
    `).run(maximum_capacity_kg !== undefined ? Number(maximum_capacity_kg) : null, current_load_kg !== undefined ? Number(current_load_kg) : null, foodTypesStr || null, requirements !== undefined ? requirements : null, is_active !== undefined ? (is_active ? 1 : 0) : null, latitude !== undefined ? Number(latitude) : null, longitude !== undefined ? Number(longitude) : null, address !== undefined ? address : null, profile.id);
        const updated = database_1.default.prepare('SELECT * FROM ngo_profiles WHERE id = ?').get(profile.id);
        res.json({ message: 'Profile updated successfully', profile: updated });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Respond to Match (Accept / Reject)
router.post('/matches/:matchId/respond', (req, res) => {
    try {
        const userId = req.user.id;
        const matchId = req.params.matchId;
        const { action, rejection_reason } = req.body; // action: 'ACCEPT' or 'REJECT'
        const profile = database_1.default.prepare('SELECT id FROM ngo_profiles WHERE user_id = ?').get(userId);
        if (!profile)
            return res.status(404).json({ error: 'NGO profile not found' });
        const match = database_1.default.prepare('SELECT * FROM matches WHERE id = ? AND ngo_id = ?').get(matchId, profile.id);
        if (!match)
            return res.status(404).json({ error: 'Match record not found' });
        const donation = database_1.default.prepare('SELECT * FROM donations WHERE id = ?').get(match.donation_id);
        if (action === 'ACCEPT') {
            database_1.default.prepare(`UPDATE matches SET status = 'ACCEPTED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(matchId);
            database_1.default.prepare(`UPDATE deliveries SET status = 'ACCEPTED', updated_at = CURRENT_TIMESTAMP WHERE donation_id = ?`).run(match.donation_id);
            // Increase current load of NGO
            database_1.default.prepare(`UPDATE ngo_profiles SET current_load_kg = current_load_kg + ? WHERE id = ?`).run(donation.quantity_kg, profile.id);
            return res.json({ message: 'Donation match accepted successfully', matchId });
        }
        else if (action === 'REJECT') {
            database_1.default.prepare(`
        UPDATE matches
        SET status = 'REJECTED', rejection_reason = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(rejection_reason || 'Rejected by NGO', matchId);
            // Cancel current delivery record for this match
            database_1.default.prepare(`DELETE FROM deliveries WHERE donation_id = ?`).run(match.donation_id);
            // Reset donation to POSTED & trigger re-matching to find another NGO!
            database_1.default.prepare(`UPDATE donations SET status = 'POSTED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(match.donation_id);
            const reMatchResult = (0, matchingService_1.evaluateAndMatchDonation)(match.donation_id);
            return res.json({
                message: 'Match rejected. System attempted re-matching with alternative partners.',
                reMatchResult,
            });
        }
        else {
            return res.status(400).json({ error: 'Invalid action. Expected ACCEPT or REJECT' });
        }
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
