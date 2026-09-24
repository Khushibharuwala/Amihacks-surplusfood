import { Router } from 'express';
import db from '../db/database';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);
router.use(authorizeRoles('ADMIN'));

const MEALS_PER_KG_FACTOR = 2.5; // Configurable approximation

router.get('/dashboard', (req, res) => {
  try {
    // Check & auto-update expired donations first
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE donations
      SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
      WHERE safe_until <= ? AND status NOT IN ('DELIVERED', 'EXPIRED', 'CANCELLED')
    `).run(now);

    const activeDonationsCount = (db.prepare(`SELECT COUNT(*) as count FROM donations WHERE status NOT IN ('DELIVERED', 'EXPIRED', 'CANCELLED')`).get() as any).count;

    const foodRescuedKg = (db.prepare(`SELECT COALESCE(SUM(quantity_kg), 0) as total FROM donations WHERE status = 'DELIVERED'`).get() as any).total;

    const activeNgosCount = (db.prepare(`SELECT COUNT(*) as count FROM ngo_profiles WHERE is_active = 1`).get() as any).count;

    const availableDriversCount = (db.prepare(`SELECT COUNT(*) as count FROM driver_profiles WHERE is_available = 1`).get() as any).count;

    const successfulDeliveriesCount = (db.prepare(`SELECT COUNT(*) as count FROM deliveries WHERE status = 'DELIVERED'`).get() as any).count;

    const expiredDonationsCount = (db.prepare(`SELECT COUNT(*) as count FROM donations WHERE status = 'EXPIRED'`).get() as any).count;

    const activeDonorsCount = (db.prepare(`SELECT COUNT(*) as count FROM donor_profiles`).get() as any).count;

    const estimatedMeals = Math.round(foodRescuedKg * MEALS_PER_KG_FACTOR);

    // List all active donations
    const activeDonations = db.prepare(`
      SELECT d.*,
        dp.organization_name as donor_name,
        np.organization_name as ngo_name,
        drv_user.name as driver_name,
        m.match_score, m.distance_km, m.estimated_minutes
      FROM donations d
      JOIN donor_profiles dp ON d.donor_id = dp.id
      LEFT JOIN matches m ON d.id = m.donation_id AND m.status != 'REJECTED'
      LEFT JOIN ngo_profiles np ON m.ngo_id = np.id
      LEFT JOIN driver_profiles drv ON m.driver_id = drv.id
      LEFT JOIN users drv_user ON drv.user_id = drv_user.id
      ORDER BY d.created_at DESC
    `).all();

    res.json({
      metrics: {
        activeDonations: activeDonationsCount,
        foodRescuedKg,
        activeNgos: activeNgosCount,
        availableDrivers: availableDriversCount,
        successfulDeliveries: successfulDeliveriesCount,
        expiredDonations: expiredDonationsCount,
        activeDonors: activeDonorsCount,
        estimatedMeals,
        mealsPerKgFactor: MEALS_PER_KG_FACTOR,
      },
      activeDonations,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
