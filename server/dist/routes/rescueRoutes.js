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
// Demo Scenario 1: Run Verified Rescue Demo (Requirement 29)
router.post('/demo/run-verification', (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const ts = Date.now();
        const donId = `don_demo_ver_${ts}`;
        const pkgId = `PKG-DEMO-${Math.floor(100 + Math.random() * 900)}`;
        const sealCode = `SEAL-58291`;
        const donorProf = database_1.default.prepare('SELECT * FROM donor_profiles LIMIT 1').get();
        const ngoProf = database_1.default.prepare('SELECT * FROM ngo_profiles LIMIT 1').get();
        const drvProf = database_1.default.prepare('SELECT * FROM driver_profiles LIMIT 1').get();
        const donorId = donorProf?.id || 'donor_demo_id';
        database_1.default.prepare(`
      INSERT INTO donations (id, donor_id, food_type, description, quantity_kg, pickup_address, pickup_latitude, pickup_longitude, available_from, safe_until, status, created_at)
      VALUES (?, ?, 'Prepared Gourmet Meals', 'Catered gourmet meals: grilled chicken, roasted veggies, rice pilaf.', 35, '100 Baker St, San Francisco, CA', 37.7749, -122.4194, CURRENT_TIMESTAMP, datetime('now', '+3 hours'), 'DELIVERED', CURRENT_TIMESTAMP)
    `).run(donId, donorId);
        if (ngoProf && drvProf) {
            const matchId = `match_${ts}`;
            database_1.default.prepare(`
        INSERT INTO matches (id, donation_id, ngo_id, driver_id, match_score, distance_km, estimated_minutes, status, match_reasons, created_at)
        VALUES (?, ?, ?, ?, 96, 2.8, 14, 'ACCEPTED', '["Short distance (2.8 km)", "Capacity verified", "Seal security enabled"]', CURRENT_TIMESTAMP)
      `).run(matchId, donId, ngoProf.id, drvProf.id);
            const delId = `del_${ts}`;
            database_1.default.prepare(`
        INSERT INTO deliveries (id, donation_id, driver_id, ngo_id, pickup_time, delivery_time, status, created_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'DELIVERED', CURRENT_TIMESTAMP)
      `).run(delId, donId, drvProf.id, ngoProf.id);
        }
        const qrTok = `sec_tok_demo_ver_${ts}`;
        database_1.default.prepare(`
      INSERT INTO food_packages (package_id, donation_id, qr_token, seal_code, expected_quantity_kg, verified_at_pickup, verified_at_delivery, donor_photo_url, pickup_photo_url, delivery_photo_url, status, created_at)
      VALUES (?, ?, ?, ?, 35, 1, 1, ?, ?, ?, 'VERIFIED_DELIVERY', CURRENT_TIMESTAMP)
    `).run(pkgId, donId, qrTok, sealCode, 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80');
        // Record verification events
        database_1.default.prepare(`INSERT INTO verification_events (id, donation_id, package_id, event_type, user_id, role, result, metadata, created_at) VALUES (?, ?, ?, 'PACKAGE_SEALED', ?, 'DONOR', 'SUCCESS', ?, CURRENT_TIMESTAMP)`).run(`v1_${ts}`, donId, pkgId, userId, JSON.stringify({ seal_code: sealCode }));
        database_1.default.prepare(`INSERT INTO verification_events (id, donation_id, package_id, event_type, user_id, role, result, metadata, created_at) VALUES (?, ?, ?, 'PICKUP_SCAN_SUCCESS', ?, 'DRIVER', 'SUCCESS', ?, CURRENT_TIMESTAMP)`).run(`v2_${ts}`, donId, pkgId, userId, JSON.stringify({ seal_code: sealCode }));
        database_1.default.prepare(`INSERT INTO verification_events (id, donation_id, package_id, event_type, user_id, role, result, metadata, created_at) VALUES (?, ?, ?, 'DELIVERY_CONFIRMED', ?, 'NGO', 'SUCCESS', ?, CURRENT_TIMESTAMP)`).run(`v3_${ts}`, donId, pkgId, userId, JSON.stringify({ seal_code: sealCode }));
        database_1.default.prepare(`
      INSERT INTO delivery_verifications (id, donation_id, verified_by, package_match, seal_match, quantity_match, photo_verified, verification_status, notes, created_at)
      VALUES (?, ?, ?, 1, 1, 1, 1, 'VERIFIED', 'Verified demo rescue: package intact, seal verified, 35 kg delivered.', CURRENT_TIMESTAMP)
    `).run(`dv_${ts}`, donId, userId);
        res.json({
            success: true,
            donationId: donId,
            packageId: pkgId,
            sealCode,
            message: '✓ Verified Rescue Demo Scenario Executed!',
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Demo Scenario 2: Run Discrepancy / Seal-Broken Demo (Requirement 30)
router.post('/demo/run-discrepancy', (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const ts = Date.now();
        const donId = `don_demo_disc_${ts}`;
        const pkgId = `PKG-DISC-${Math.floor(100 + Math.random() * 900)}`;
        const expectedSeal = `SEAL-58291`;
        const receivedSeal = `SEAL-99921`;
        const donorProf = database_1.default.prepare('SELECT * FROM donor_profiles LIMIT 1').get();
        const ngoProf = database_1.default.prepare('SELECT * FROM ngo_profiles LIMIT 1').get();
        const drvProf = database_1.default.prepare('SELECT * FROM driver_profiles LIMIT 1').get();
        const donorId = donorProf?.id || 'donor_demo_id';
        database_1.default.prepare(`
      INSERT INTO donations (id, donor_id, food_type, description, quantity_kg, pickup_address, pickup_latitude, pickup_longitude, available_from, safe_until, status, created_at)
      VALUES (?, ?, 'Fresh Farm Produce', 'Boxes of organic fruits and vegetables.', 45, '888 Howard St, San Francisco, CA', 37.7812, -122.4042, CURRENT_TIMESTAMP, datetime('now', '+2 hours'), 'IN_TRANSIT', CURRENT_TIMESTAMP)
    `).run(donId, donorId);
        if (ngoProf && drvProf) {
            const matchId = `match_${ts}`;
            database_1.default.prepare(`
        INSERT INTO matches (id, donation_id, ngo_id, driver_id, match_score, distance_km, estimated_minutes, status, match_reasons, created_at)
        VALUES (?, ?, ?, ?, 91, 3.5, 18, 'ACCEPTED', '["Capacity matched", "Route monitored"]', CURRENT_TIMESTAMP)
      `).run(matchId, donId, ngoProf.id, drvProf.id);
            const delId = `del_${ts}`;
            database_1.default.prepare(`
        INSERT INTO deliveries (id, donation_id, driver_id, ngo_id, status, created_at)
        VALUES (?, ?, ?, ?, 'IN_TRANSIT', CURRENT_TIMESTAMP)
      `).run(delId, donId, drvProf.id, ngoProf.id);
        }
        const qrTok = `sec_tok_demo_disc_${ts}`;
        database_1.default.prepare(`
      INSERT INTO food_packages (package_id, donation_id, qr_token, seal_code, expected_quantity_kg, verified_at_pickup, verified_at_delivery, donor_photo_url, pickup_photo_url, status, created_at)
      VALUES (?, ?, ?, ?, 45, 1, 0, ?, ?, 'DISPUTED', CURRENT_TIMESTAMP)
    `).run(pkgId, donId, qrTok, expectedSeal, 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80');
        // Record verification events
        database_1.default.prepare(`INSERT INTO verification_events (id, donation_id, package_id, event_type, user_id, role, result, metadata, created_at) VALUES (?, ?, ?, 'PACKAGE_SEALED', ?, 'DONOR', 'SUCCESS', ?, CURRENT_TIMESTAMP)`).run(`vd1_${ts}`, donId, pkgId, userId, JSON.stringify({ seal_code: expectedSeal }));
        database_1.default.prepare(`INSERT INTO verification_events (id, donation_id, package_id, event_type, user_id, role, result, metadata, created_at) VALUES (?, ?, ?, 'PICKUP_SCAN_SUCCESS', ?, 'DRIVER', 'SUCCESS', ?, CURRENT_TIMESTAMP)`).run(`vd2_${ts}`, donId, pkgId, userId, JSON.stringify({ seal_code: expectedSeal }));
        database_1.default.prepare(`INSERT INTO verification_events (id, donation_id, package_id, event_type, user_id, role, result, metadata, created_at) VALUES (?, ?, ?, 'SEAL_BROKEN', ?, 'NGO', 'FAILED', ?, CURRENT_TIMESTAMP)`).run(`vd3_${ts}`, donId, pkgId, userId, JSON.stringify({ expected_seal: expectedSeal, received_seal: receivedSeal }));
        // Insert Dispute Entry
        const disputeId = `disp_${ts}`;
        database_1.default.prepare(`
      INSERT INTO delivery_disputes (id, donation_id, reported_by, reported_role, dispute_type, description, expected_seal, received_seal, status, created_at)
      VALUES (?, ?, ?, 'NGO', 'SEAL_BROKEN', 'Package seal reported broken upon shelter receipt. Expected SEAL-58291, received damaged SEAL-99921.', ?, ?, 'OPEN', CURRENT_TIMESTAMP)
    `).run(disputeId, donId, userId, expectedSeal, receivedSeal);
        // Insert Admin Notification
        database_1.default.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, donation_id, created_at)
      VALUES (?, 'ALL', 'SEAL_BROKEN', '🚨 CRITICAL: Package Seal Broken / Discrepancy Alert!', ?, ?, CURRENT_TIMESTAMP)
    `).run(`notif_${ts}`, `Discrepancy Demo: Seal mismatch detected for rescue ${donId}. Expected ${expectedSeal}, received ${receivedSeal}.`, donId);
        res.json({
            success: true,
            donationId: donId,
            packageId: pkgId,
            expectedSeal,
            receivedSeal,
            disputeId,
            message: '🚨 Discrepancy / Seal-Broken Demo Scenario Executed!',
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
