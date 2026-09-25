import { Router } from 'express';
import crypto from 'crypto';
import { authenticate, authorizeRoles, AuthRequest } from '../middleware/authMiddleware';
import User from '../models/user';
import DonationModel from '../models/donation';
import FoodPackageModel from '../models/package';

const router = Router();

router.use(authenticate);
router.use(authorizeRoles('DONOR'));

router.get('/dashboard', async (req: AuthRequest, res) => {
  try {
    const user = await User.findOne({ id: req.user!.id }).lean() as any;
    const profileData = user?.profileData || {};

    const donations = await DonationModel.find({ donor_id: req.user!.id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      profile: {
        id: req.user!.id,
        organization_name: profileData.organization_name || req.user!.name,
        address: profileData.address || 'Address not provided',
        latitude: Number(profileData.latitude ?? 28.6139),
        longitude: Number(profileData.longitude ?? 77.209),
        phone: profileData.phone || 'Not provided',
      },
      donations,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Could not load donor dashboard' });
  }
});

router.post('/donations', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const user = await User.findOne({ id: userId }).lean() as any;

    if (!user) {
      return res.status(404).json({ error: 'Donor account not found' });
    }

    const {
      food_type,
      description,
      quantity_kg,
      pickup_address,
      pickup_latitude,
      pickup_longitude,
      available_from,
      safe_until,
      image_url,
    } = req.body;

    if (!food_type || !description || !quantity_kg || !safe_until) {
      return res.status(400).json({ error: 'Missing required donation fields' });
    }

    const profileData = user.profileData || {};
    const donationId = `don_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const pkgId = `PKG-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}-01`;
    const sealCode = `SEAL-${Math.floor(10000 + Math.random() * 90000)}`;
    const qrToken = `sec_tok_${crypto.randomBytes(16).toString('hex')}`;

    const pickupLat = Number(pickup_latitude ?? profileData.latitude ?? 28.6139);
    const pickupLng = Number(pickup_longitude ?? profileData.longitude ?? 77.209);
    const pickupAddr = pickup_address || profileData.address || 'Address not provided';
    const defaultImg = image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';

    // 1. Insert into SQLite Primary Storage
    try {
      const db = require('../db/database').default;
      const donorProfile = db.prepare('SELECT id FROM donor_profiles WHERE user_id = ?').get(userId) as any;
      const donorId = donorProfile ? donorProfile.id : 'dnr_1';

      db.prepare(`
        INSERT OR REPLACE INTO donations (
          id, donor_id, food_type, description, quantity_kg,
          pickup_address, pickup_latitude, pickup_longitude,
          available_from, safe_until, image_url, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'POSTED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(
        donationId, donorId, food_type, description, Number(quantity_kg),
        pickupAddr, pickupLat, pickupLng,
        available_from || new Date().toISOString(), safe_until, defaultImg
      );

      db.prepare(`
        INSERT OR REPLACE INTO food_packages (package_id, donation_id, qr_token, seal_code, expected_quantity_kg, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'SEALED', CURRENT_TIMESTAMP)
      `).run(pkgId, donationId, qrToken, sealCode, Number(quantity_kg));

      db.prepare(`
        INSERT OR REPLACE INTO package_seals (id, package_id, donation_id, seal_code, qr_token, applied_by, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'SEALED', CURRENT_TIMESTAMP)
      `).run('seal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6), pkgId, donationId, sealCode, qrToken, userId);
    } catch (sqlErr) {
      console.warn('SQLite insertion fallback warning:', sqlErr);
    }

    // 2. Insert into MongoDB Atlas Cloud Storage
    const donation = await DonationModel.create({
      id: donationId,
      donor_id: userId,
      donor_name: profileData.organization_name || user.name,
      food_type,
      description,
      quantity_kg: Number(quantity_kg),
      pickup_address: pickupAddr,
      pickup_latitude: pickupLat,
      pickup_longitude: pickupLng,
      available_from: available_from || new Date().toISOString(),
      safe_until,
      image_url: defaultImg,
      status: 'POSTED',
    });

    await FoodPackageModel.create({
      package_id: pkgId,
      donation_id: donationId,
      qr_token: qrToken,
      seal_code: sealCode,
      expected_quantity_kg: Number(quantity_kg),
      status: 'SEALED',
    });

    res.status(201).json({
      message: 'Donation created & package QR code generated!',
      donation,
      matchResult: null,
      package: {
        package_id: pkgId,
        seal_code: sealCode,
        qr_token: qrToken,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      error: err.message || 'Could not post donation',
    });
  }
});

export default router;
