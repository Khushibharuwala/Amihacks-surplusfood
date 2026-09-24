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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const database_1 = __importStar(require("../db/database"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticate);
// Generate Secure Food Package QR Token(s) for Donation (Requirement 2 & 7)
router.post('/generate', (req, res) => {
    try {
        const { donationId, numPackages } = req.body;
        const userId = req.user.id;
        const role = req.user.role;
        if (!donationId) {
            return res.status(400).json({ error: 'donationId is required' });
        }
        const donation = database_1.default.prepare('SELECT * FROM donations WHERE id = ?').get(donationId);
        if (!donation) {
            return res.status(404).json({ error: 'Donation not found' });
        }
        const count = numPackages && numPackages > 0 ? Number(numPackages) : 1;
        const pkgWeight = Math.round((donation.quantity_kg / count) * 100) / 100;
        // Check if packages already exist
        let packages = database_1.default.prepare('SELECT * FROM food_packages WHERE donation_id = ?').all(donationId);
        if (packages.length === 0) {
            for (let i = 1; i <= count; i++) {
                const pkgIndexStr = String(i).padStart(2, '0');
                const pkgId = `PKG-${donationId.replace('don_', '')}-${pkgIndexStr}`;
                const qrToken = `sec_tok_${crypto_1.default.randomBytes(16).toString('hex')}`;
                database_1.default.prepare(`
          INSERT INTO food_packages (package_id, donation_id, qr_token, expected_quantity_kg, status, created_at)
          VALUES (?, ?, ?, ?, 'CREATED', CURRENT_TIMESTAMP)
        `).run(pkgId, donationId, qrToken, pkgWeight);
                (0, database_1.recordVerificationEvent)(donationId, pkgId, 'QR_GENERATED', userId, role, 'SUCCESS', {
                    expected_quantity_kg: pkgWeight,
                    food_type: donation.food_type,
                });
            }
            packages = database_1.default.prepare('SELECT * FROM food_packages WHERE donation_id = ?').all(donationId);
        }
        // Return package QR token payload representation (non-sensitive server token reference)
        const packagePayloads = packages.map((pkg) => ({
            ...pkg,
            qr_data: JSON.stringify({
                p: pkg.package_id,
                d: donationId,
                t: pkg.qr_token,
                v: 1,
            }),
        }));
        res.json({ message: 'Secure QR Code(s) generated', packages: packagePayloads });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Get Packages & Chain of Custody for Donation
router.get('/donation/:donationId', (req, res) => {
    try {
        const donationId = req.params.donationId;
        const packages = database_1.default.prepare('SELECT * FROM food_packages WHERE donation_id = ?').all(donationId);
        const packagePayloads = packages.map((pkg) => ({
            ...pkg,
            qr_data: JSON.stringify({
                p: pkg.package_id,
                d: donationId,
                t: pkg.qr_token,
                v: 1,
            }),
        }));
        const events = database_1.default.prepare('SELECT * FROM verification_events WHERE donation_id = ? ORDER BY created_at ASC').all(donationId);
        res.json({ packages: packagePayloads, custodyTimeline: events });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Driver Pickup QR Verification Endpoint (Requirement 2 & 6)
router.post('/verify-pickup', (req, res) => {
    try {
        const { qrData, donationId } = req.body;
        const userId = req.user.id;
        const role = req.user.role;
        let parsed;
        try {
            parsed = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
        }
        catch (e) {
            (0, database_1.recordVerificationEvent)(donationId || 'UNKNOWN', null, 'PICKUP_SCAN_FAILED', userId, role, 'FAILED', {
                reason: 'Malformed or invalid QR code format',
            });
            return res.status(400).json({
                valid: false,
                error: 'Verification failed — invalid or unreadable QR code format.',
            });
        }
        const { p: packageId, d: qrDonationId, t: qrToken } = parsed;
        // Security Check: Match donation ID
        if (donationId && qrDonationId !== donationId) {
            (0, database_1.recordVerificationEvent)(donationId, packageId, 'PICKUP_SCAN_FAILED', userId, role, 'FAILED', {
                reason: `Package QR ${packageId} belongs to another donation (${qrDonationId})`,
            });
            (0, database_1.addNotification)('ALL', 'RESCUE_ALERT', '⚠ Security Scan Warning', `Driver scanned wrong package QR code for donation ${donationId}.`, donationId);
            return res.status(400).json({
                valid: false,
                error: 'Verification failed — this package does not match the assigned donation.',
            });
        }
        const pkg = database_1.default.prepare('SELECT * FROM food_packages WHERE package_id = ? AND qr_token = ?').get(packageId, qrToken);
        if (!pkg) {
            (0, database_1.recordVerificationEvent)(qrDonationId || donationId, packageId, 'PICKUP_SCAN_FAILED', userId, role, 'FAILED', {
                reason: 'Token or package record not found in database',
            });
            return res.status(400).json({
                valid: false,
                error: 'Invalid package — this QR token does not exist or has been tampered with.',
            });
        }
        if (pkg.verified_at_pickup === 1) {
            return res.json({
                valid: true,
                alreadyVerified: true,
                message: 'This food package has already been verified at pickup.',
                package: pkg,
            });
        }
        // Verify driver assignment & donation status
        const delivery = database_1.default.prepare(`
      SELECT del.*, drv.user_id as driver_user_id 
      FROM deliveries del 
      JOIN driver_profiles drv ON del.driver_id = drv.id 
      WHERE del.donation_id = ?
    `).get(pkg.donation_id);
        if (!delivery || delivery.driver_user_id !== userId) {
            (0, database_1.recordVerificationEvent)(pkg.donation_id, packageId, 'PICKUP_SCAN_FAILED', userId, role, 'FAILED', {
                reason: 'Driver scanning is not the driver assigned to this donation',
            });
            return res.status(403).json({
                valid: false,
                error: 'Verification failed — you are not the assigned volunteer driver for this pickup.',
            });
        }
        // Mark Package Verified at Pickup
        database_1.default.prepare(`
      UPDATE food_packages 
      SET verified_at_pickup = 1, status = 'VERIFIED_PICKUP' 
      WHERE package_id = ?
    `).run(packageId);
        // Record Anti-Tamper Audit Event
        (0, database_1.recordVerificationEvent)(pkg.donation_id, packageId, 'PICKUP_SCAN_SUCCESS', userId, role, 'SUCCESS', {
            package_id: packageId,
            expected_quantity_kg: pkg.expected_quantity_kg,
            pickup_time: new Date().toISOString(),
        });
        const updatedPkg = database_1.default.prepare('SELECT * FROM food_packages WHERE package_id = ?').get(packageId);
        res.json({
            valid: true,
            message: '✓ Food Package Verified at Pickup!',
            package: updatedPkg,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// NGO Delivery QR Verification Endpoint (Requirement 3 & 6)
router.post('/verify-delivery', (req, res) => {
    try {
        const { qrData, donationId } = req.body;
        const userId = req.user.id;
        const role = req.user.role;
        let parsed;
        try {
            parsed = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
        }
        catch (e) {
            (0, database_1.recordVerificationEvent)(donationId || 'UNKNOWN', null, 'DELIVERY_SCAN_FAILED', userId, role, 'FAILED', {
                reason: 'Malformed or unreadable QR code format',
            });
            return res.status(400).json({
                valid: false,
                error: 'Verification failed — unreadable QR code format.',
            });
        }
        const { p: packageId, d: qrDonationId, t: qrToken } = parsed;
        if (donationId && qrDonationId !== donationId) {
            (0, database_1.recordVerificationEvent)(donationId, packageId, 'DELIVERY_SCAN_FAILED', userId, role, 'FAILED', {
                reason: `Package QR ${packageId} belongs to another donation (${qrDonationId})`,
            });
            return res.status(400).json({
                valid: false,
                error: 'Verification failed — QR code belongs to a different food donation.',
            });
        }
        const pkg = database_1.default.prepare('SELECT * FROM food_packages WHERE package_id = ? AND qr_token = ?').get(packageId, qrToken);
        if (!pkg) {
            (0, database_1.recordVerificationEvent)(qrDonationId || donationId, packageId, 'DELIVERY_SCAN_FAILED', userId, role, 'FAILED', {
                reason: 'Token or package record invalid',
            });
            return res.status(400).json({
                valid: false,
                error: 'Invalid package — QR token does not exist in database.',
            });
        }
        if (pkg.verified_at_pickup !== 1) {
            (0, database_1.recordVerificationEvent)(pkg.donation_id, packageId, 'DELIVERY_SCAN_FAILED', userId, role, 'FAILED', {
                reason: 'Package was never verified at pickup!',
            });
            return res.status(400).json({
                valid: false,
                error: 'Verification failed — this package was never scanned/verified at restaurant pickup!',
            });
        }
        if (pkg.verified_at_delivery === 1) {
            return res.json({
                valid: true,
                alreadyVerified: true,
                message: '✓ This package has already been verified at delivery.',
                package: pkg,
            });
        }
        // Verify NGO shelter recipient assignment
        const ngoProfile = database_1.default.prepare('SELECT id FROM ngo_profiles WHERE user_id = ?').get(userId);
        const delivery = database_1.default.prepare('SELECT * FROM deliveries WHERE donation_id = ?').get(pkg.donation_id);
        if (!ngoProfile || !delivery || delivery.ngo_id !== ngoProfile.id) {
            (0, database_1.recordVerificationEvent)(pkg.donation_id, packageId, 'DELIVERY_SCAN_FAILED', userId, role, 'FAILED', {
                reason: 'NGO scanning is not the assigned recipient shelter',
            });
            return res.status(403).json({
                valid: false,
                error: 'Verification failed — your shelter is not the assigned recipient for this delivery.',
            });
        }
        const donation = database_1.default.prepare('SELECT d.*, dp.organization_name as donor_name FROM donations d JOIN donor_profiles dp ON d.donor_id = dp.id WHERE d.id = ?').get(pkg.donation_id);
        // Mark Package Verified at Delivery
        database_1.default.prepare(`
      UPDATE food_packages 
      SET verified_at_delivery = 1, status = 'VERIFIED_DELIVERY' 
      WHERE package_id = ?
    `).run(packageId);
        // Record Verification Event
        (0, database_1.recordVerificationEvent)(pkg.donation_id, packageId, 'DELIVERY_SCAN_SUCCESS', userId, role, 'SUCCESS', {
            verified_quantity_kg: pkg.expected_quantity_kg,
            food_type: donation.food_type,
            donor_name: donation.donor_name,
        });
        const updatedPkg = database_1.default.prepare('SELECT * FROM food_packages WHERE package_id = ?').get(packageId);
        res.json({
            valid: true,
            message: '✓ Food Package Verified — Chain of Custody Confirmed!',
            package: updatedPkg,
            donationDetails: {
                donation_id: donation.id,
                donor_name: donation.donor_name,
                food_type: donation.food_type,
                expected_quantity_kg: pkg.expected_quantity_kg,
                pickup_time: delivery.pickup_time,
            },
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
