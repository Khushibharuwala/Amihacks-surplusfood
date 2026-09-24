import { syncDonationToMongo, syncPackageToMongo } from '../services/mongoSyncService';
import { Router } from 'express';
import db from '../db/database';
import { authenticate, authorizeRoles, AuthRequest } from '../middleware/authMiddleware';
import { evaluateAndMatchDonation } from '../services/matchingService';

const router = Router();

router.use(authenticate);
router.use(authorizeRoles('DONOR'));

// Get donor's profile & posted donations
router.get('/dashboard', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const profile = db.prepare('SELECT * FROM donor_profiles WHERE user_id = ?').get(userId) as any;

    if (!profile) {
      return res.status(404).json({ error: 'Donor profile not found' });
    }

    const donations = db.prepare(`
      SELECT d.*,
        m.id as match_id, m.match_score, m.distance_km, m.estimated_minutes,
        np.organization_name as ngo_name, np.phone as ngo_phone,
        drv_user.name as driver_name, drv.phone as driver_phone, drv.vehicle_type,
        del.status as delivery_status
      FROM donations d
      LEFT JOIN matches m ON d.id = m.donation_id AND m.status != 'REJECTED'
      LEFT JOIN ngo_profiles np ON m.ngo_id = np.id
      LEFT JOIN driver_profiles drv ON m.driver_id = drv.id
      LEFT JOIN users drv_user ON drv.user_id = drv_user.id
      LEFT JOIN deliveries del ON d.id = del.donation_id
      WHERE d.donor_id = ?
      ORDER BY d.created_at DESC
    `).all(profile.id);

    res.json({ profile, donations });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST Surplus Food
router.post('/donations', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const profile = db.prepare('SELECT * FROM donor_profiles WHERE user_id = ?').get(userId) as any;

    if (!profile) {
      return res.status(404).json({ error: 'Donor profile not found' });
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

    const donationId = 'don_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const pickupLat = pickup_latitude || profile.latitude;
    const pickupLng = pickup_longitude || profile.longitude;
    const pickupAddr = pickup_address || profile.address;
    const availFrom = available_from || new Date().toISOString();
    const defaultImg = image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';

    db.prepare(`
      INSERT INTO donations (
        id, donor_id, food_type, description, quantity_kg,
        pickup_address, pickup_latitude, pickup_longitude,
        available_from, safe_until, image_url, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'POSTED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      donationId,
      profile.id,
      food_type,
      description,
      Number(quantity_kg),
      pickupAddr,
      Number(pickupLat),
      Number(pickupLng),
      availFrom,
      safe_until,
      defaultImg
    );

    // Auto-generate unique Food Package ID, Seal Code, & QR Token immediately upon posting
    const crypto = require('crypto');
    const uniqueRand = crypto.randomBytes(3).toString('hex').toUpperCase();
    const pkgId = `PKG-${Date.now()}-${uniqueRand}-01`;
    const sealCode = `SEAL-${Math.floor(10000 + Math.random() * 90000)}`;
    const qrToken = `sec_tok_${crypto.randomBytes(16).toString('hex')}`;

    db.prepare(`
      INSERT OR REPLACE INTO food_packages (package_id, donation_id, qr_token, seal_code, expected_quantity_kg, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'CREATED', CURRENT_TIMESTAMP)
    `).run(pkgId, donationId, qrToken, sealCode, Number(quantity_kg));

    db.prepare(`
      INSERT OR REPLACE INTO package_seals (id, package_id, donation_id, seal_code, qr_token, applied_by, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'SEALED', CURRENT_TIMESTAMP)
    `).run('seal_' + Date.now() + '_' + uniqueRand, pkgId, donationId, sealCode, qrToken, userId);

    // Run matching evaluation to calculate risk score & diagnostics, but preserve POSTED status for NGO claim
    let matchResult = null;
    try {
      matchResult = evaluateAndMatchDonation(donationId);
    } catch (mErr) {
      console.warn('Initial matching warning:', mErr);
    }

    // Explicitly set donation status to POSTED so all NGOs can browse & order it
    db.prepare(`UPDATE donations SET status = 'POSTED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(donationId);

    // Sync to MongoDB Atlas collections
   await Promise.all([
      syncDonationToMongo(donationId),
      syncPackageToMongo(pkgId),
    ]);

    const updatedDonation = db.prepare('SELECT * FROM donations WHERE id = ?').get(donationId);

    res.status(201).json({
      message: 'Donation created successfully! Package QR generated and posted to shelter network.',
      donation: updatedDonation,
      matchResult,
      package: {
        package_id: pkgId,
        seal_code: sealCode,
        qr_token: qrToken,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
