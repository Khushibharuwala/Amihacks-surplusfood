"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../db/database"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const matchingService_1 = require("../services/matchingService");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticate);
const mongoose_1 = __importDefault(require("mongoose"));
const donation_1 = __importDefault(require("../models/donation"));
// Get donation details with matching & delivery status
router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        let donation = database_1.default.prepare(`
      SELECT d.*,
        dp.organization_name as donor_name, dp.phone as donor_phone,
        m.id as match_id, m.match_score, m.distance_km, m.estimated_minutes, m.status as match_status,
        np.organization_name as ngo_name, np.phone as ngo_phone, np.address as ngo_address,
        drv_user.name as driver_name, drv.phone as driver_phone, drv.vehicle_type,
        del.status as delivery_status, del.pickup_time, del.delivery_time
      FROM donations d
      JOIN donor_profiles dp ON d.donor_id = dp.id
      LEFT JOIN matches m ON d.id = m.donation_id AND m.status != 'REJECTED'
      LEFT JOIN ngo_profiles np ON m.ngo_id = np.id
      LEFT JOIN driver_profiles drv ON m.driver_id = drv.id
      LEFT JOIN users drv_user ON drv.user_id = drv_user.id
      LEFT JOIN deliveries del ON d.id = del.donation_id
      WHERE d.id = ?
    `).get(id);
        if (!donation && mongoose_1.default.connection.readyState === 1) {
            try {
                const mongoDon = await donation_1.default.findOne({ id }).lean();
                if (mongoDon) {
                    database_1.default.prepare(`
            INSERT OR REPLACE INTO donations (
              id, donor_id, food_type, description, quantity_kg, pickup_address,
              pickup_latitude, pickup_longitude, available_from, safe_until, image_url, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `).run(mongoDon.id, mongoDon.donor_id || 'dnr_1', mongoDon.food_type || 'Cooked', mongoDon.description || '', mongoDon.quantity_kg || 10, mongoDon.pickup_address || '', mongoDon.pickup_latitude || 0, mongoDon.pickup_longitude || 0, mongoDon.available_from || new Date().toISOString(), mongoDon.safe_until || new Date(Date.now() + 18000000).toISOString(), mongoDon.image_url || '', mongoDon.status || 'POSTED');
                    donation = database_1.default.prepare(`
            SELECT d.*,
              dp.organization_name as donor_name, dp.phone as donor_phone,
              m.id as match_id, m.match_score, m.distance_km, m.estimated_minutes, m.status as match_status,
              np.organization_name as ngo_name, np.phone as ngo_phone, np.address as ngo_address,
              drv_user.name as driver_name, drv.phone as driver_phone, drv.vehicle_type,
              del.status as delivery_status, del.pickup_time, del.delivery_time
            FROM donations d
            LEFT JOIN donor_profiles dp ON d.donor_id = dp.id
            LEFT JOIN matches m ON d.id = m.donation_id AND m.status != 'REJECTED'
            LEFT JOIN ngo_profiles np ON m.ngo_id = np.id
            LEFT JOIN driver_profiles drv ON m.driver_id = drv.id
            LEFT JOIN users drv_user ON drv.user_id = drv_user.id
            LEFT JOIN deliveries del ON d.id = del.donation_id
            WHERE d.id = ?
          `).get(id);
                }
            }
            catch (mErr) {
                console.warn('Donation hydration fallback warning:', mErr);
            }
        }
        if (!donation) {
            return res.status(404).json({ error: 'Donation not found' });
        }
        res.json({ donation });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Trigger manual matching evaluation for a donation
router.post('/:id/match', (req, res) => {
    try {
        const id = req.params.id;
        const matchResult = (0, matchingService_1.evaluateAndMatchDonation)(id);
        res.json({ matchResult });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
