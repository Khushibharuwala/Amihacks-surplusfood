import { Router } from 'express';
import crypto from 'crypto';
import db, { recordVerificationEvent, addNotification } from '../db/database';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

// Generate Secure Food Package QR Token(s) for Donation (Requirement 2 & 7)
router.post('/generate', (req: AuthRequest, res) => {
  try {
    const { donationId, numPackages } = req.body;
    const userId = req.user!.id;
    const role = req.user!.role;

    if (!donationId) {
      return res.status(400).json({ error: 'donationId is required' });
    }

    const donation = db.prepare('SELECT * FROM donations WHERE id = ?').get(donationId) as any;
    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    const count = numPackages && numPackages > 0 ? Number(numPackages) : 1;
    const pkgWeight = Math.round((donation.quantity_kg / count) * 100) / 100;

    // Check if packages already exist
    let packages = db.prepare('SELECT * FROM food_packages WHERE donation_id = ?').all(donationId) as any[];

    if (packages.length === 0) {
      for (let i = 1; i <= count; i++) {
        const pkgIndexStr = String(i).padStart(2, '0');
        const pkgId = `PKG-${donationId.replace('don_', '')}-${pkgIndexStr}`;
        const qrToken = `sec_tok_${crypto.randomBytes(16).toString('hex')}`;

        db.prepare(`
          INSERT INTO food_packages (package_id, donation_id, qr_token, expected_quantity_kg, status, created_at)
          VALUES (?, ?, ?, ?, 'CREATED', CURRENT_TIMESTAMP)
        `).run(pkgId, donationId, qrToken, pkgWeight);

        recordVerificationEvent(donationId, pkgId, 'QR_GENERATED', userId, role, 'SUCCESS', {
          expected_quantity_kg: pkgWeight,
          food_type: donation.food_type,
        });
      }

      packages = db.prepare('SELECT * FROM food_packages WHERE donation_id = ?').all(donationId);
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Packages & Chain of Custody for Donation
router.get('/donation/:donationId', (req: AuthRequest, res) => {
  try {
    const donationId = req.params.donationId as string;
    const packages = db.prepare('SELECT * FROM food_packages WHERE donation_id = ?').all(donationId) as any[];

    const packagePayloads = packages.map((pkg) => ({
      ...pkg,
      qr_data: JSON.stringify({
        p: pkg.package_id,
        d: donationId,
        t: pkg.qr_token,
        v: 1,
      }),
    }));

    const events = db.prepare('SELECT * FROM verification_events WHERE donation_id = ? ORDER BY created_at ASC').all(donationId);

    res.json({ packages: packagePayloads, custodyTimeline: events });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Driver Pickup QR Verification Endpoint (Requirement 2 & 6)
router.post('/verify-pickup', (req: AuthRequest, res) => {
  try {
    const { qrData, donationId } = req.body;
    const userId = req.user!.id;
    const role = req.user!.role;

    let parsed: any;
    try {
      parsed = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
    } catch (e) {
      recordVerificationEvent(donationId || 'UNKNOWN', null, 'PICKUP_SCAN_FAILED', userId, role, 'FAILED', {
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
      recordVerificationEvent(donationId, packageId, 'PICKUP_SCAN_FAILED', userId, role, 'FAILED', {
        reason: `Package QR ${packageId} belongs to another donation (${qrDonationId})`,
      });
      addNotification('ALL', 'RESCUE_ALERT', '⚠ Security Scan Warning', `Driver scanned wrong package QR code for donation ${donationId}.`, donationId);

      return res.status(400).json({
        valid: false,
        error: 'Verification failed — this package does not match the assigned donation.',
      });
    }

    const pkg = db.prepare('SELECT * FROM food_packages WHERE package_id = ? AND qr_token = ?').get(packageId, qrToken) as any;

    if (!pkg) {
      recordVerificationEvent(qrDonationId || donationId, packageId, 'PICKUP_SCAN_FAILED', userId, role, 'FAILED', {
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
    const delivery = db.prepare(`
      SELECT del.*, drv.user_id as driver_user_id 
      FROM deliveries del 
      JOIN driver_profiles drv ON del.driver_id = drv.id 
      WHERE del.donation_id = ?
    `).get(pkg.donation_id) as any;

    if (!delivery || delivery.driver_user_id !== userId) {
      recordVerificationEvent(pkg.donation_id, packageId, 'PICKUP_SCAN_FAILED', userId, role, 'FAILED', {
        reason: 'Driver scanning is not the driver assigned to this donation',
      });
      return res.status(403).json({
        valid: false,
        error: 'Verification failed — you are not the assigned volunteer driver for this pickup.',
      });
    }

    // Mark Package Verified at Pickup
    db.prepare(`
      UPDATE food_packages 
      SET verified_at_pickup = 1, status = 'VERIFIED_PICKUP' 
      WHERE package_id = ?
    `).run(packageId);

    // Record Anti-Tamper Audit Event
    recordVerificationEvent(pkg.donation_id, packageId, 'PICKUP_SCAN_SUCCESS', userId, role, 'SUCCESS', {
      package_id: packageId,
      expected_quantity_kg: pkg.expected_quantity_kg,
      pickup_time: new Date().toISOString(),
    });

    const updatedPkg = db.prepare('SELECT * FROM food_packages WHERE package_id = ?').get(packageId);

    res.json({
      valid: true,
      message: '✓ Food Package Verified at Pickup!',
      package: updatedPkg,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// NGO Delivery QR Verification Endpoint (Requirement 3 & 6)
router.post('/verify-delivery', (req: AuthRequest, res) => {
  try {
    const { qrData, donationId } = req.body;
    const userId = req.user!.id;
    const role = req.user!.role;

    let parsed: any;
    try {
      parsed = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
    } catch (e) {
      recordVerificationEvent(donationId || 'UNKNOWN', null, 'DELIVERY_SCAN_FAILED', userId, role, 'FAILED', {
        reason: 'Malformed or unreadable QR code format',
      });
      return res.status(400).json({
        valid: false,
        error: 'Verification failed — unreadable QR code format.',
      });
    }

    const { p: packageId, d: qrDonationId, t: qrToken } = parsed;

    if (donationId && qrDonationId !== donationId) {
      recordVerificationEvent(donationId, packageId, 'DELIVERY_SCAN_FAILED', userId, role, 'FAILED', {
        reason: `Package QR ${packageId} belongs to another donation (${qrDonationId})`,
      });
      return res.status(400).json({
        valid: false,
        error: 'Verification failed — QR code belongs to a different food donation.',
      });
    }

    const pkg = db.prepare('SELECT * FROM food_packages WHERE package_id = ? AND qr_token = ?').get(packageId, qrToken) as any;

    if (!pkg) {
      recordVerificationEvent(qrDonationId || donationId, packageId, 'DELIVERY_SCAN_FAILED', userId, role, 'FAILED', {
        reason: 'Token or package record invalid',
      });
      return res.status(400).json({
        valid: false,
        error: 'Invalid package — QR token does not exist in database.',
      });
    }

    if (pkg.verified_at_pickup !== 1) {
      recordVerificationEvent(pkg.donation_id, packageId, 'DELIVERY_SCAN_FAILED', userId, role, 'FAILED', {
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
    const ngoProfile = db.prepare('SELECT id FROM ngo_profiles WHERE user_id = ?').get(userId) as any;
    const delivery = db.prepare('SELECT * FROM deliveries WHERE donation_id = ?').get(pkg.donation_id) as any;

    if (!ngoProfile || !delivery || delivery.ngo_id !== ngoProfile.id) {
      recordVerificationEvent(pkg.donation_id, packageId, 'DELIVERY_SCAN_FAILED', userId, role, 'FAILED', {
        reason: 'NGO scanning is not the assigned recipient shelter',
      });
      return res.status(403).json({
        valid: false,
        error: 'Verification failed — your shelter is not the assigned recipient for this delivery.',
      });
    }

    const donation = db.prepare('SELECT d.*, dp.organization_name as donor_name FROM donations d JOIN donor_profiles dp ON d.donor_id = dp.id WHERE d.id = ?').get(pkg.donation_id) as any;

    // Mark Package Verified at Delivery
    db.prepare(`
      UPDATE food_packages 
      SET verified_at_delivery = 1, status = 'VERIFIED_DELIVERY' 
      WHERE package_id = ?
    `).run(packageId);

    // Record Verification Event
    recordVerificationEvent(pkg.donation_id, packageId, 'DELIVERY_SCAN_SUCCESS', userId, role, 'SUCCESS', {
      verified_quantity_kg: pkg.expected_quantity_kg,
      food_type: donation.food_type,
      donor_name: donation.donor_name,
    });

    const updatedPkg = db.prepare('SELECT * FROM food_packages WHERE package_id = ?').get(packageId);

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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
