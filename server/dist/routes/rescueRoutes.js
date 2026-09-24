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
// Get Live Rescues list with risk level, route details, and timeline
router.get('/live', (req, res) => {
    try {
        const now = new Date();
        const donations = database_1.default.prepare(`
      SELECT d.*,
        dp.organization_name as donor_name, dp.phone as donor_phone,
        m.id as match_id, m.match_score, m.distance_km, m.estimated_minutes, m.match_reasons, m.status as match_status,
        np.organization_name as ngo_name, np.phone as ngo_phone, np.address as ngo_address,
        drv_user.name as driver_name, drv.phone as driver_phone, drv.vehicle_type, drv.vehicle_capacity_kg,
        del.status as delivery_status, del.pickup_time, del.delivery_time
      FROM donations d
      JOIN donor_profiles dp ON d.donor_id = dp.id
      LEFT JOIN matches m ON d.id = m.donation_id AND m.status != 'REJECTED'
      LEFT JOIN ngo_profiles np ON m.ngo_id = np.id
      LEFT JOIN driver_profiles drv ON m.driver_id = drv.id
      LEFT JOIN users drv_user ON drv.user_id = drv_user.id
      LEFT JOIN deliveries del ON d.id = del.donation_id
      ORDER BY 
        CASE 
          WHEN d.status IN ('POSTED', 'MATCHED', 'DRIVER_ASSIGNED', 'PICKUP_STARTED') THEN 1
          WHEN d.status = 'PICKED_UP' THEN 2
          WHEN d.status = 'DELIVERED' THEN 3
          ELSE 4
        END,
        d.safe_until ASC
    `).all();
        const enriched = donations.map((don) => {
            const safeUntil = new Date(don.safe_until);
            const diffMinutes = Math.max(0, Math.floor((safeUntil.getTime() - now.getTime()) / 60000));
            const hasDriver = Boolean(don.driver_name);
            const riskInfo = (0, matchingService_1.calculateRescueRisk)(diffMinutes, hasDriver, don.distance_km);
            let parsedReasons = [];
            if (don.match_reasons) {
                try {
                    parsedReasons = JSON.parse(don.match_reasons);
                }
                catch {
                    parsedReasons = [don.match_reasons];
                }
            }
            const timelineLogs = database_1.default.prepare(`
        SELECT * FROM rescue_logs WHERE donation_id = ? ORDER BY created_at ASC
      `).all(don.id);
            return {
                ...don,
                time_remaining_minutes: diffMinutes,
                risk_level: riskInfo.riskLevel,
                risk_reason: riskInfo.riskReason,
                match_reasons: parsedReasons,
                timeline: timelineLogs,
            };
        });
        res.json({ rescues: enriched });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Get Audit Log Timeline for a single donation
router.get('/:id/timeline', (req, res) => {
    try {
        const id = req.params.id;
        const logs = database_1.default.prepare(`SELECT * FROM rescue_logs WHERE donation_id = ? ORDER BY created_at ASC`).all(id);
        res.json({ donation_id: id, timeline: logs });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
