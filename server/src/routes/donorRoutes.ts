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
router.post('/donations', (req: AuthRequest, res) => {
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

    // Immediately trigger real-time matching
    const matchResult = evaluateAndMatchDonation(donationId);

    const updatedDonation = db.prepare('SELECT * FROM donations WHERE id = ?').get(donationId);

    res.status(201).json({
      message: 'Donation created successfully',
      donation: updatedDonation,
      matchResult,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
