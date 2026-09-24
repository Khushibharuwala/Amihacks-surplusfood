"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../db/database"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticate);
router.use((0, authMiddleware_1.authorizeRoles)('ADMIN'));
const MEALS_PER_KG_FACTOR = 2.5; // Configurable approximation
router.get('/dashboard', (req, res) => {
    try {
        // Check & auto-update expired donations first
        const now = new Date().toISOString();
        database_1.default.prepare(`
      UPDATE donations
      SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
      WHERE safe_until <= ? AND status NOT IN ('DELIVERED', 'EXPIRED', 'CANCELLED')
    `).run(now);
        const activeDonationsCount = database_1.default.prepare(`SELECT COUNT(*) as count FROM donations WHERE status NOT IN ('DELIVERED', 'EXPIRED', 'CANCELLED')`).get().count;
        const foodRescuedKg = database_1.default.prepare(`SELECT COALESCE(SUM(quantity_kg), 0) as total FROM donations WHERE status = 'DELIVERED'`).get().total;
        const activeNgosCount = database_1.default.prepare(`SELECT COUNT(*) as count FROM ngo_profiles WHERE is_active = 1`).get().count;
        const availableDriversCount = database_1.default.prepare(`SELECT COUNT(*) as count FROM driver_profiles WHERE is_available = 1`).get().count;
        const successfulDeliveriesCount = database_1.default.prepare(`SELECT COUNT(*) as count FROM deliveries WHERE status = 'DELIVERED'`).get().count;
        const expiredDonationsCount = database_1.default.prepare(`SELECT COUNT(*) as count FROM donations WHERE status = 'EXPIRED'`).get().count;
        const activeDonorsCount = database_1.default.prepare(`SELECT COUNT(*) as count FROM donor_profiles`).get().count;
        const estimatedMeals = Math.round(foodRescuedKg * MEALS_PER_KG_FACTOR);
        // List all active donations
        const activeDonations = database_1.default.prepare(`
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
