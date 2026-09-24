import { Router } from 'express';
import crypto from 'crypto';
import db, {
  recordVerificationEvent,
  recordDeliveryEvidence,
  addNotification,
  addRescueLog,
  calculateIntegrityScore,
} from '../db/database';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

// Generate Secure Food Package Identity & Seal (Requirement 2, 4, 24)
router.post('/generate', (req: AuthRequest, res) => {
  try {
    const { donationId, numPackages, sealCode, donorPhotoUrl } = req.body;
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

    let packages = db.prepare('SELECT * FROM food_packages WHERE donation_id = ?').all(donationId) as any[];

    if (packages.length === 0) {
      for (let i = 1; i <= count; i++) {
        const pkgIndexStr = String(i).padStart(2, '0');
        const shortCode = donationId.replace('don_', '').substring(0, 6).toUpperCase();
        const pkgId = `PKG-${shortCode}-${pkgIndexStr}`;
        const generatedSeal = sealCode || `SEAL-${Math.floor(10000 + Math.random() * 90000)}`;
        const qrToken = `sec_tok_${crypto.randomBytes(16).toString('hex')}`;

        db.prepare(`
          INSERT INTO food_packages (package_id, donation_id, qr_token, seal_code, expected_quantity_kg, donor_photo_url, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 'SEALED', CURRENT_TIMESTAMP)
        `).run(pkgId, donationId, qrToken, generatedSeal, pkgWeight, donorPhotoUrl || donation.image_url || null);

        // Record Package Seal Entry
        const sealId = 'seal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        db.prepare(`
          INSERT INTO package_seals (id, package_id, donation_id, seal_code, qr_token, applied_by, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 'SEALED', CURRENT_TIMESTAMP)
        `).run(sealId, pkgId, donationId, generatedSeal, qrToken, userId);

        recordVerificationEvent(donationId, pkgId, 'PACKAGE_SEALED', userId, role, 'SUCCESS', {
          seal_code: generatedSeal,
          expected_quantity_kg: pkgWeight,
          food_type: donation.food_type,
        });

        if (donorPhotoUrl) {
          recordDeliveryEvidence(
            donationId,
            pkgId,
            'DONOR_PHOTO',
            donorPhotoUrl,
            userId,
            role,
            generatedSeal,
            'Before-handover donor package photo captured'
          );
        }
      }

      packages = db.prepare('SELECT * FROM food_packages WHERE donation_id = ?').all(donationId);
    }

    const packagePayloads = packages.map((pkg) => ({
      ...pkg,
      qr_data: JSON.stringify({
        p: pkg.package_id,
        d: donationId,
        t: pkg.qr_token,
        s: pkg.seal_code,
        v: 2,
      }),
    }));

    res.json({ message: 'Secure Package Identity & Seal Code generated', packages: packagePayloads });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Donor Seal Package & Save Before-Handover Photo Evidence (Requirement 4 & 5)
router.post('/seal', (req: AuthRequest, res) => {
  try {
    const { donationId, sealCode, donorPhotoUrl, notes } = req.body;
    const userId = req.user!.id;
    const role = req.user!.role;

    if (!donationId) {
      return res.status(400).json({ error: 'donationId is required' });
    }

    const seal = sealCode || `SEAL-${Math.floor(10000 + Math.random() * 90000)}`;

    // Update food packages seal code & photo url
    db.prepare(`
      UPDATE food_packages 
      SET seal_code = ?, donor_photo_url = ?, status = 'SEALED' 
      WHERE donation_id = ?
    `).run(seal, donorPhotoUrl || null, donationId);

    // Save evidence record
    if (donorPhotoUrl) {
      recordDeliveryEvidence(
        donationId,
        null,
        'DONOR_PHOTO',
        donorPhotoUrl,
        userId,
        role,
        seal,
        notes || 'Before-handover food package photo recorded by donor site'
      );
    }

    recordVerificationEvent(donationId, null, 'DONOR_EVIDENCE_CAPTURED', userId, role, 'SUCCESS', {
      seal_code: seal,
      photo_url: donorPhotoUrl,
    });

    const packages = db.prepare('SELECT * FROM food_packages WHERE donation_id = ?').all(donationId);

    res.json({
      success: true,
      message: '✓ Food package sealed & evidence recorded!',
      sealCode: seal,
      packages,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Driver Pickup QR & Photo Verification Endpoint (Requirement 6 & 7)
router.post('/verify-pickup', (req: AuthRequest, res) => {
  try {
    const { qrData, donationId, pickupPhotoUrl } = req.body;
    const userId = req.user!.id;
    const role = req.user!.role;

    let parsed: any;
    try {
      parsed = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
    } catch (e) {
      recordVerificationEvent(donationId || 'UNKNOWN', null, 'PICKUP_SCAN_FAILED', userId, role, 'FAILED', {
        reason: 'Malformed or unreadable QR code format',
      });
      return res.status(400).json({
        valid: false,
        error: 'Verification failed — unreadable QR code format.',
      });
    }

    const { p: packageId, d: qrDonationId, t: qrToken, s: qrSeal } = parsed;

    if (donationId && qrDonationId !== donationId) {
      recordVerificationEvent(donationId, packageId, 'PICKUP_SCAN_FAILED', userId, role, 'FAILED', {
        reason: `Package QR ${packageId} belongs to another donation (${qrDonationId})`,
      });
      addNotification('ALL', 'RESCUE_ALERT', '⚠ Security Scan Warning', `Driver scanned wrong package QR code for donation ${donationId}.`, donationId);

      return res.status(400).json({
        valid: false,
        error: 'Verification failed — package does not match assigned donation.',
      });
    }

    const pkg = db.prepare('SELECT * FROM food_packages WHERE package_id = ? AND qr_token = ?').get(packageId, qrToken) as any;

    if (!pkg) {
      recordVerificationEvent(qrDonationId || donationId, packageId, 'PICKUP_SCAN_FAILED', userId, role, 'FAILED', {
        reason: 'Token or package record not found in database',
      });
      return res.status(400).json({
        valid: false,
        error: 'Invalid package — QR token does not exist in database.',
      });
    }

    // Mark Package Verified at Pickup & attach pickup photo
    db.prepare(`
      UPDATE food_packages 
      SET verified_at_pickup = 1, pickup_photo_url = ?, status = 'VERIFIED_PICKUP' 
      WHERE package_id = ?
    `).run(pickupPhotoUrl || null, packageId);

    // Save pickup evidence
    if (pickupPhotoUrl) {
      recordDeliveryEvidence(
        pkg.donation_id,
        packageId,
        'DRIVER_PICKUP_PHOTO',
        pickupPhotoUrl,
        userId,
        role,
        pkg.seal_code,
        'Driver pickup package photo captured at handover'
      );
    }

    recordVerificationEvent(pkg.donation_id, packageId, 'PICKUP_SCAN_SUCCESS', userId, role, 'SUCCESS', {
      package_id: packageId,
      seal_code: pkg.seal_code,
      expected_quantity_kg: pkg.expected_quantity_kg,
      pickup_time: new Date().toISOString(),
    });

    const updatedPkg = db.prepare('SELECT * FROM food_packages WHERE package_id = ?').get(packageId);

    res.json({
      valid: true,
      message: '✓ Food Package Verified & Handover Recorded!',
      package: updatedPkg,
      sealCode: pkg.seal_code,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// NGO Delivery Verification & Dispute Check Endpoint (Requirement 8, 9, 17)
router.post('/verify-delivery', (req: AuthRequest, res) => {
  try {
    const { qrData, donationId, deliveryPhotoUrl, sealIntact, quantityMatch, notes } = req.body;
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

    const { p: packageId, d: qrDonationId, t: qrToken, s: expectedSeal } = parsed;

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

    const isSealBroken = sealIntact === false || sealIntact === 'NO';
    const isQtyMismatch = quantityMatch === false || quantityMatch === 'NO';

    // Update package status & photo
    const newStatus = isSealBroken ? 'DISPUTED' : 'VERIFIED_DELIVERY';
    db.prepare(`
      UPDATE food_packages 
      SET verified_at_delivery = ?, delivery_photo_url = ?, status = ? 
      WHERE package_id = ?
    `).run(isSealBroken ? 0 : 1, deliveryPhotoUrl || null, newStatus, packageId);

    // Save NGO delivery evidence
    if (deliveryPhotoUrl) {
      recordDeliveryEvidence(
        pkg.donation_id,
        packageId,
        'NGO_DELIVERY_PHOTO',
        deliveryPhotoUrl,
        userId,
        role,
        pkg.seal_code,
        notes || (isSealBroken ? 'NGO delivery photo showing seal damage' : 'NGO verified delivery photo')
      );
    }

    // Save Delivery Verification Record
    const verId = 'ver_rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const verStatus = isSealBroken ? 'SEAL_BROKEN' : (isQtyMismatch ? 'QUANTITY_MISMATCH' : 'VERIFIED');
    db.prepare(`
      INSERT OR REPLACE INTO delivery_verifications (id, donation_id, verified_by, package_match, seal_match, quantity_match, photo_verified, verification_status, notes, created_at)
      VALUES (?, ?, ?, 1, ?, ?, 1, ?, ?, CURRENT_TIMESTAMP)
    `).run(verId, pkg.donation_id, userId, isSealBroken ? 0 : 1, isQtyMismatch ? 0 : 1, verStatus, notes || null);

    // IF SEAL BROKEN / MISMATCH -> Auto-raise Delivery Dispute Alert!
    if (isSealBroken || isQtyMismatch) {
      const disputeId = 'disp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const disputeType = isSealBroken ? 'SEAL_BROKEN' : 'QUANTITY_MISMATCH';

      db.prepare(`
        INSERT INTO delivery_disputes (id, donation_id, reported_by, reported_role, dispute_type, description, expected_seal, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', CURRENT_TIMESTAMP)
      `).run(
        disputeId,
        pkg.donation_id,
        userId,
        role,
        disputeType,
        notes || `Package seal reported broken or quantity mismatch at NGO delivery verification site.`,
        pkg.seal_code
      );

      recordVerificationEvent(pkg.donation_id, packageId, 'DISPUTE_RAISED', userId, role, 'FAILED', {
        dispute_type: disputeType,
        notes: notes || 'Seal broken or discrepancy reported during delivery verification.',
      });

      addNotification(
        'ALL',
        'SEAL_BROKEN',
        '🚨 CRITICAL: Package Seal Broken / Discrepancy Alert!',
        `NGO reported seal broken or mismatch for rescue ${pkg.donation_id}. Manual admin review required!`,
        pkg.donation_id
      );

      return res.json({
        valid: false,
        verificationStatus: verStatus,
        disputeRaised: true,
        message: '⚠ DELIVERY VERIFICATION ALERT: Package seal broken or discrepancy reported. Issue logged for admin review.',
        package: pkg,
      });
    }

    // SUCCESS VERIFICATION
    recordVerificationEvent(pkg.donation_id, packageId, 'DELIVERY_CONFIRMED', userId, role, 'SUCCESS', {
      seal_code: pkg.seal_code,
      quantity_kg: pkg.expected_quantity_kg,
    });

    res.json({
      valid: true,
      verificationStatus: 'VERIFIED',
      disputeRaised: false,
      message: '✓ Delivery Verified & Chain of Custody Confirmed!',
      package: pkg,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Report Delivery Dispute Endpoint (Requirement 9 & 17)
router.post('/report-dispute', (req: AuthRequest, res) => {
  try {
    const { donationId, disputeType, description, expectedSeal, receivedSeal } = req.body;
    const userId = req.user!.id;
    const role = req.user!.role;

    if (!donationId || !disputeType || !description) {
      return res.status(400).json({ error: 'donationId, disputeType, description are required' });
    }

    const disputeId = 'disp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    db.prepare(`
      INSERT INTO delivery_disputes (id, donation_id, reported_by, reported_role, dispute_type, description, expected_seal, received_seal, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', CURRENT_TIMESTAMP)
    `).run(disputeId, donationId, userId, role, disputeType, description, expectedSeal || null, receivedSeal || null);

    recordVerificationEvent(donationId, null, 'DISPUTE_RAISED', userId, role, 'FAILED', {
      dispute_type: disputeType,
      description,
    });

    addNotification(
      'ALL',
      'DISPUTE_RAISED',
      '⚠ Delivery Dispute Logged',
      `Dispute (${disputeType}) raised for rescue ${donationId}: ${description}`,
      donationId
    );

    res.json({ success: true, disputeId, message: 'Dispute report submitted for admin investigation.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Full Chain of Custody & Evidence Comparison for Rescue (Requirement 3, 7, 14)
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
        s: pkg.seal_code,
        v: 2,
      }),
    }));

    const events = db.prepare('SELECT * FROM verification_events WHERE donation_id = ? ORDER BY created_at ASC').all(donationId);
    const evidence = db.prepare('SELECT * FROM delivery_evidence WHERE donation_id = ? ORDER BY created_at ASC').all(donationId);
    const disputes = db.prepare('SELECT * FROM delivery_disputes WHERE donation_id = ? ORDER BY created_at DESC').all(donationId);
    const verifications = db.prepare('SELECT * FROM delivery_verifications WHERE donation_id = ?').get(donationId);

    const integrityInfo = calculateIntegrityScore(donationId);

    res.json({
      packages: packagePayloads,
      custodyTimeline: events,
      evidencePhotos: evidence,
      disputes,
      verificationRecord: verifications,
      integrity: integrityInfo,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Rescue Integrity Center Endpoint (Requirement 14, 15, 31)
router.get('/admin/integrity-center', (req: AuthRequest, res) => {
  try {
    const donations = db.prepare(`
      SELECT d.*, 
        dp.organization_name as donor_name,
        np.organization_name as ngo_name,
        usr_drv.name as driver_name
      FROM donations d
      JOIN donor_profiles dp ON d.donor_id = dp.id
      LEFT JOIN matches m ON d.id = m.donation_id AND m.status != 'REJECTED'
      LEFT JOIN ngo_profiles np ON m.ngo_id = np.id
      LEFT JOIN driver_profiles drv ON m.driver_id = drv.id
      LEFT JOIN users usr_drv ON drv.user_id = usr_drv.id
      ORDER BY d.created_at DESC
    `).all() as any[];

    const integrityRecords = donations.map((don) => {
      const pkgs = db.prepare('SELECT * FROM food_packages WHERE donation_id = ?').all(don.id) as any[];
      const evd = db.prepare('SELECT * FROM delivery_evidence WHERE donation_id = ?').all(don.id) as any[];
      const disputes = db.prepare('SELECT * FROM delivery_disputes WHERE donation_id = ? AND status != "RESOLVED"').all(don.id) as any[];
      const verRecord: any = db.prepare('SELECT * FROM delivery_verifications WHERE donation_id = ?').get(don.id);
      const integrity = calculateIntegrityScore(don.id);

      return {
        ...don,
        packagesCount: pkgs.length,
        sealCode: pkgs[0]?.seal_code || 'SEAL-PENDING',
        evidenceCount: evd.length,
        hasDonorPhoto: evd.some((e) => e.evidence_type === 'DONOR_PHOTO'),
        hasDriverPhoto: evd.some((e) => e.evidence_type === 'DRIVER_PICKUP_PHOTO'),
        hasNgoPhoto: evd.some((e) => e.evidence_type === 'NGO_DELIVERY_PHOTO'),
        activeDisputesCount: disputes.length,
        verificationStatus: verRecord?.verification_status || (pkgs.some((p) => p.verified_at_delivery === 1) ? 'VERIFIED' : 'PENDING'),
        integrityScore: integrity.score,
        integrityStatus: integrity.status,
        integrityReasons: integrity.reasons,
      };
    });

    const totalRescues = integrityRecords.length;
    const verifiedCount = integrityRecords.filter((r) => r.verificationStatus === 'VERIFIED').length;
    const activeDisputes = db.prepare('SELECT * FROM delivery_disputes WHERE status != "RESOLVED"').all();
    const packageVerRate = totalRescues > 0 ? Math.round((verifiedCount / totalRescues) * 100) : 100;

    res.json({
      metrics: {
        totalRescues,
        verifiedRescues: verifiedCount,
        packageVerificationRate: packageVerRate,
        activeDisputesCount: activeDisputes.length,
      },
      rescues: integrityRecords,
      disputes: activeDisputes,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Resolve Dispute Endpoint (Requirement 17)
router.post('/admin/resolve-dispute', (req: AuthRequest, res) => {
  try {
    const { disputeId, action, resolution } = req.body;
    if (!disputeId || !action) {
      return res.status(400).json({ error: 'disputeId and action (RESOLVE|ESCALATE) are required' });
    }

    const newStatus = action === 'RESOLVE' ? 'RESOLVED' : 'ESCALATED';
    db.prepare(`
      UPDATE delivery_disputes 
      SET status = ?, resolution = ?, resolved_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(newStatus, resolution || 'Admin reviewed evidence and resolved dispute', disputeId);

    res.json({ success: true, message: `Dispute marked as ${newStatus}.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
