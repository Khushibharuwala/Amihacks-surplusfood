import { Router } from 'express';
import db from '../db/database';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';
import { evaluateAndMatchDonation } from '../services/matchingService';

const router = Router();

router.use(authenticate);

// Get donation details with matching & delivery status
router.get('/:id', (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const donation = db.prepare(`
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

    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    res.json({ donation });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger manual matching evaluation for a donation
router.post('/:id/match', (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const matchResult = evaluateAndMatchDonation(id);
    res.json({ matchResult });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
