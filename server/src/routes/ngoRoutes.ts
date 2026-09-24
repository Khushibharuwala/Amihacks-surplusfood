import { Router } from 'express';
import db from '../db/database';
import { authenticate, authorizeRoles, AuthRequest } from '../middleware/authMiddleware';
import { evaluateAndMatchDonation } from '../services/matchingService';

const router = Router();

router.use(authenticate);
router.use(authorizeRoles('NGO'));

// Get NGO Dashboard
router.get('/dashboard', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const profile = db.prepare('SELECT * FROM ngo_profiles WHERE user_id = ?').get(userId) as any;

    if (!profile) {
      return res.status(404).json({ error: 'NGO profile not found' });
    }

    // Parsed accepted food types
    let acceptedTypes: string[] = [];
    try {
      acceptedTypes = JSON.parse(profile.accepted_food_types);
    } catch {
      acceptedTypes = [profile.accepted_food_types];
    }

    // Incoming matches
    const incomingMatches = db.prepare(`
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

    // Active deliveries
    const activeDeliveries = db.prepare(`
      SELECT del.*, d.food_type, d.quantity_kg, d.description, d.pickup_address, d.safe_until,
        dp.organization_name as donor_name,
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
    const completedDeliveries = db.prepare(`
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update NGO Profile Settings
router.put('/profile', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { maximum_capacity_kg, current_load_kg, accepted_food_types, requirements, is_active, latitude, longitude, address } = req.body;

    const profile = db.prepare('SELECT id FROM ngo_profiles WHERE user_id = ?').get(userId) as any;
    if (!profile) {
      return res.status(404).json({ error: 'NGO profile not found' });
    }

    const foodTypesStr = Array.isArray(accepted_food_types)
      ? JSON.stringify(accepted_food_types)
      : accepted_food_types;

    db.prepare(`
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
    `).run(
      maximum_capacity_kg !== undefined ? Number(maximum_capacity_kg) : null,
      current_load_kg !== undefined ? Number(current_load_kg) : null,
      foodTypesStr || null,
      requirements !== undefined ? requirements : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      latitude !== undefined ? Number(latitude) : null,
      longitude !== undefined ? Number(longitude) : null,
      address !== undefined ? address : null,
      profile.id
    );

    const updated = db.prepare('SELECT * FROM ngo_profiles WHERE id = ?').get(profile.id);
    res.json({ message: 'Profile updated successfully', profile: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Respond to Match (Accept / Reject)
router.post('/matches/:matchId/respond', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const matchId = req.params.matchId as string;
    const { action, rejection_reason } = req.body; // action: 'ACCEPT' or 'REJECT'

    const profile = db.prepare('SELECT id FROM ngo_profiles WHERE user_id = ?').get(userId) as any;
    if (!profile) return res.status(404).json({ error: 'NGO profile not found' });

    const match = db.prepare('SELECT * FROM matches WHERE id = ? AND ngo_id = ?').get(matchId, profile.id) as any;
    if (!match) return res.status(404).json({ error: 'Match record not found' });

    const donation = db.prepare('SELECT * FROM donations WHERE id = ?').get(match.donation_id) as any;

    if (action === 'ACCEPT') {
      db.prepare(`UPDATE matches SET status = 'ACCEPTED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(matchId);
      db.prepare(`UPDATE deliveries SET status = 'ACCEPTED', updated_at = CURRENT_TIMESTAMP WHERE donation_id = ?`).run(match.donation_id);

      // Increase current load of NGO
      db.prepare(`UPDATE ngo_profiles SET current_load_kg = current_load_kg + ? WHERE id = ?`).run(donation.quantity_kg, profile.id);

      return res.json({ message: 'Donation match accepted successfully', matchId });
    } else if (action === 'REJECT') {
      db.prepare(`
        UPDATE matches
        SET status = 'REJECTED', rejection_reason = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(rejection_reason || 'Rejected by NGO', matchId);

      // Cancel current delivery record for this match
      db.prepare(`DELETE FROM deliveries WHERE donation_id = ?`).run(match.donation_id);

      // Reset donation to POSTED & trigger re-matching to find another NGO!
      db.prepare(`UPDATE donations SET status = 'POSTED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(match.donation_id);
      const reMatchResult = evaluateAndMatchDonation(match.donation_id);

      return res.json({
        message: 'Match rejected. System attempted re-matching with alternative partners.',
        reMatchResult,
      });
    } else {
      return res.status(400).json({ error: 'Invalid action. Expected ACCEPT or REJECT' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
