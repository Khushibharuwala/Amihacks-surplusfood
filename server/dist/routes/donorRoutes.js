"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const user_1 = __importDefault(require("../models/user"));
const donation_1 = __importDefault(require("../models/donation"));
const package_1 = __importDefault(require("../models/package"));
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticate);
router.use((0, authMiddleware_1.authorizeRoles)('DONOR'));
router.get('/dashboard', async (req, res) => {
    try {
        const user = await user_1.default.findOne({ id: req.user.id }).lean();
        const profileData = user?.profileData || {};
        const donations = await donation_1.default.find({ donor_id: req.user.id })
            .sort({ createdAt: -1 })
            .lean();
        res.json({
            profile: {
                id: req.user.id,
                organization_name: profileData.organization_name || req.user.name,
                address: profileData.address || 'Address not provided',
                latitude: Number(profileData.latitude ?? 28.6139),
                longitude: Number(profileData.longitude ?? 77.209),
                phone: profileData.phone || 'Not provided',
            },
            donations,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Could not load donor dashboard' });
    }
});
router.post('/donations', async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await user_1.default.findOne({ id: userId }).lean();
        if (!user) {
            return res.status(404).json({ error: 'Donor account not found' });
        }
        const { food_type, description, quantity_kg, pickup_address, pickup_latitude, pickup_longitude, available_from, safe_until, image_url, } = req.body;
        if (!food_type || !description || !quantity_kg || !safe_until) {
            return res.status(400).json({ error: 'Missing required donation fields' });
        }
        const profileData = user.profileData || {};
        const donationId = `don_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const pkgId = `PKG-${Date.now()}-${crypto_1.default.randomBytes(3).toString('hex').toUpperCase()}-01`;
        const sealCode = `SEAL-${Math.floor(10000 + Math.random() * 90000)}`;
        const qrToken = `sec_tok_${crypto_1.default.randomBytes(16).toString('hex')}`;
        const donation = await donation_1.default.create({
            id: donationId,
            donor_id: userId,
            donor_name: profileData.organization_name || user.name,
            food_type,
            description,
            quantity_kg: Number(quantity_kg),
            pickup_address: pickup_address || profileData.address || 'Address not provided',
            pickup_latitude: Number(pickup_latitude ?? profileData.latitude ?? 28.6139),
            pickup_longitude: Number(pickup_longitude ?? profileData.longitude ?? 77.209),
            available_from: available_from || new Date().toISOString(),
            safe_until,
            image_url: image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
            status: 'POSTED',
        });
        await package_1.default.create({
            package_id: pkgId,
            donation_id: donationId,
            qr_token: qrToken,
            seal_code: sealCode,
            expected_quantity_kg: Number(quantity_kg),
            status: 'CREATED',
        });
        res.status(201).json({
            message: 'Donation posted to the rescue network.',
            donation,
            matchResult: null,
            package: {
                package_id: pkgId,
                seal_code: sealCode,
                qr_token: qrToken,
            },
        });
    }
    catch (err) {
        res.status(500).json({
            error: err.message || 'Could not post donation to MongoDB Atlas',
        });
    }
});
exports.default = router;
