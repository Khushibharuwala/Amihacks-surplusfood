import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(__dirname, '../../food_rescue.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('DONOR', 'NGO', 'DRIVER', 'ADMIN')) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS donor_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      organization_name TEXT NOT NULL,
      address TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      phone TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ngo_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      organization_name TEXT NOT NULL,
      address TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      phone TEXT NOT NULL,
      maximum_capacity_kg REAL NOT NULL,
      current_load_kg REAL NOT NULL DEFAULT 0,
      accepted_food_types TEXT NOT NULL, -- JSON string array
      requirements TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS driver_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      vehicle_type TEXT NOT NULL,
      vehicle_capacity_kg REAL NOT NULL,
      is_available INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS donations (
      id TEXT PRIMARY KEY,
      donor_id TEXT NOT NULL,
      food_type TEXT NOT NULL,
      description TEXT NOT NULL,
      quantity_kg REAL NOT NULL,
      pickup_address TEXT NOT NULL,
      pickup_latitude REAL NOT NULL,
      pickup_longitude REAL NOT NULL,
      available_from DATETIME NOT NULL,
      safe_until DATETIME NOT NULL,
      image_url TEXT,
      status TEXT CHECK(status IN ('POSTED', 'MATCHING', 'MATCHED', 'DRIVER_ASSIGNED', 'PICKUP_STARTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'EXPIRED', 'CANCELLED')) NOT NULL DEFAULT 'POSTED',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(donor_id) REFERENCES donor_profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      donation_id TEXT NOT NULL,
      ngo_id TEXT NOT NULL,
      driver_id TEXT,
      match_score REAL NOT NULL,
      distance_km REAL NOT NULL,
      estimated_minutes INTEGER NOT NULL,
      status TEXT CHECK(status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED')) NOT NULL DEFAULT 'PENDING',
      rejection_reason TEXT,
      match_reasons TEXT, -- JSON array of reasons
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(donation_id) REFERENCES donations(id) ON DELETE CASCADE,
      FOREIGN KEY(ngo_id) REFERENCES ngo_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY(driver_id) REFERENCES driver_profiles(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS deliveries (
      id TEXT PRIMARY KEY,
      donation_id TEXT UNIQUE NOT NULL,
      driver_id TEXT NOT NULL,
      ngo_id TEXT NOT NULL,
      pickup_time DATETIME,
      delivery_time DATETIME,
      status TEXT CHECK(status IN ('ASSIGNED', 'ACCEPTED', 'PICKUP_STARTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED')) NOT NULL DEFAULT 'ASSIGNED',
      cancellation_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(donation_id) REFERENCES donations(id) ON DELETE CASCADE,
      FOREIGN KEY(driver_id) REFERENCES driver_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY(ngo_id) REFERENCES ngo_profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL, -- user_id or 'ALL'
      type TEXT NOT NULL, -- e.g. 'MATCH_FOUND', 'DRIVER_ASSIGNED', 'RESCUE_ALERT', 'EXPIRED', 'ROUTE_DEVIATION', 'SEAL_BROKEN', 'DISPUTE_RAISED'
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      donation_id TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rescue_logs (
      id TEXT PRIMARY KEY,
      donation_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      status TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(donation_id) REFERENCES donations(id) ON DELETE CASCADE
    );

    -- Food Package Identity Table for Multi-Package Secure QR Verification
    CREATE TABLE IF NOT EXISTS food_packages (
      package_id TEXT PRIMARY KEY,
      donation_id TEXT NOT NULL,
      qr_token TEXT UNIQUE NOT NULL,
      seal_code TEXT,
      expected_quantity_kg REAL NOT NULL,
      verified_at_pickup INTEGER DEFAULT 0,
      verified_at_delivery INTEGER DEFAULT 0,
      donor_photo_url TEXT,
      pickup_photo_url TEXT,
      delivery_photo_url TEXT,
      status TEXT DEFAULT 'CREATED', -- 'CREATED', 'SEALED', 'VERIFIED_PICKUP', 'IN_TRANSIT', 'VERIFIED_DELIVERY', 'DELIVERED', 'DISPUTED'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(donation_id) REFERENCES donations(id) ON DELETE CASCADE
    );

    -- Package Seals Audit & Tracking Table
    CREATE TABLE IF NOT EXISTS package_seals (
      id TEXT PRIMARY KEY,
      package_id TEXT NOT NULL,
      donation_id TEXT NOT NULL,
      seal_code TEXT NOT NULL,
      qr_token TEXT NOT NULL,
      applied_by TEXT NOT NULL,
      status TEXT DEFAULT 'SEALED',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(donation_id) REFERENCES donations(id) ON DELETE CASCADE
    );

    -- Anti-Tamper Chain of Custody Verification Events Table
    CREATE TABLE IF NOT EXISTS verification_events (
      id TEXT PRIMARY KEY,
      donation_id TEXT NOT NULL,
      package_id TEXT,
      event_type TEXT NOT NULL, -- 'PACKAGE_SEALED', 'DONOR_EVIDENCE_CAPTURED', 'PICKUP_SCAN_SUCCESS', 'PICKUP_SCAN_FAILED', 'ROUTE_DEVIATION_DETECTED', 'UNEXPECTED_STOP_DETECTED', 'STOP_EXCEPTION_LOGGED', 'DELIVERY_SCAN_SUCCESS', 'DELIVERY_SCAN_FAILED', 'SEAL_VERIFIED', 'SEAL_BROKEN', 'DELIVERY_CONFIRMED', 'DISPUTE_RAISED'
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      location TEXT,
      result TEXT NOT NULL, -- 'SUCCESS', 'FAILED', 'WARNING'
      metadata TEXT, -- JSON payload
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(donation_id) REFERENCES donations(id) ON DELETE CASCADE
    );

    -- Live Driver Location & Off-Route Deviation Tracking Table
    CREATE TABLE IF NOT EXISTS driver_locations (
      id TEXT PRIMARY KEY,
      driver_id TEXT NOT NULL,
      donation_id TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      is_off_route INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(donation_id) REFERENCES donations(id) ON DELETE CASCADE
    );

    -- NEW: Delivery Photographic Evidence Storage Table (Requirement 5, 7, 8)
    CREATE TABLE IF NOT EXISTS delivery_evidence (
      id TEXT PRIMARY KEY,
      donation_id TEXT NOT NULL,
      package_id TEXT,
      evidence_type TEXT NOT NULL, -- 'DONOR_PHOTO', 'DRIVER_PICKUP_PHOTO', 'NGO_DELIVERY_PHOTO'
      image_url TEXT NOT NULL,
      captured_by TEXT NOT NULL,
      captured_role TEXT NOT NULL,
      seal_code TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(donation_id) REFERENCES donations(id) ON DELETE CASCADE
    );

    -- NEW: Route Integrity & Stop Exception Event Log Table (Requirement 11, 12)
    CREATE TABLE IF NOT EXISTS route_events (
      id TEXT PRIMARY KEY,
      donation_id TEXT NOT NULL,
      driver_id TEXT NOT NULL,
      event_type TEXT NOT NULL, -- 'LOCATION_UPDATE', 'ROUTE_DEVIATION', 'UNEXPECTED_STOP', 'STOP_EXCEPTION'
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      duration_seconds INTEGER DEFAULT 0,
      stop_reason TEXT, -- 'Traffic', 'Police checkpoint', 'Vehicle issue', 'Emergency', 'Road closure', 'Other'
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(donation_id) REFERENCES donations(id) ON DELETE CASCADE
    );

    -- NEW: Delivery Verification Status Table (Requirement 8, 9, 13)
    CREATE TABLE IF NOT EXISTS delivery_verifications (
      id TEXT PRIMARY KEY,
      donation_id TEXT UNIQUE NOT NULL,
      verified_by TEXT NOT NULL,
      package_match INTEGER NOT NULL DEFAULT 1,
      seal_match INTEGER NOT NULL DEFAULT 1,
      quantity_match INTEGER NOT NULL DEFAULT 1,
      photo_verified INTEGER NOT NULL DEFAULT 1,
      verification_status TEXT NOT NULL, -- 'VERIFIED', 'SEAL_BROKEN', 'PACKAGE_MISMATCH', 'QUANTITY_MISMATCH', 'DELIVERY_DISPUTED', 'UNDER_REVIEW'
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(donation_id) REFERENCES donations(id) ON DELETE CASCADE
    );

    -- NEW: Delivery Disputes Table (Requirement 9, 17)
    CREATE TABLE IF NOT EXISTS delivery_disputes (
      id TEXT PRIMARY KEY,
      donation_id TEXT NOT NULL,
      reported_by TEXT NOT NULL,
      reported_role TEXT NOT NULL,
      dispute_type TEXT NOT NULL, -- 'SEAL_BROKEN', 'PACKAGE_MISMATCH', 'QUANTITY_MISMATCH', 'FOOD_CONDITION_ISSUE', 'UNEXPLAINED_STOP'
      description TEXT NOT NULL,
      expected_seal TEXT,
      received_seal TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'ESCALATED'
      resolution TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      FOREIGN KEY(donation_id) REFERENCES donations(id) ON DELETE CASCADE
    );
  `);

  // Migration column additions for existing database files
  try { db.exec(`ALTER TABLE donations ADD COLUMN image_url TEXT`); } catch (e) {}
  try { db.exec(`ALTER TABLE matches ADD COLUMN match_reasons TEXT`); } catch (e) {}
  try { db.exec(`ALTER TABLE deliveries ADD COLUMN cancellation_reason TEXT`); } catch (e) {}
  try { db.exec(`ALTER TABLE food_packages ADD COLUMN seal_code TEXT`); } catch (e) {}
  try { db.exec(`ALTER TABLE food_packages ADD COLUMN donor_photo_url TEXT`); } catch (e) {}
  try { db.exec(`ALTER TABLE food_packages ADD COLUMN pickup_photo_url TEXT`); } catch (e) {}
  try { db.exec(`ALTER TABLE food_packages ADD COLUMN delivery_photo_url TEXT`); } catch (e) {}
}

export function addNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  donationId?: string
) {
  const id = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, donation_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(id, userId, type, title, message, donationId || null);
}

export function addRescueLog(
  donationId: string,
  actorName: string,
  actorRole: string,
  action: string,
  status: string,
  details?: string
) {
  const id = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  db.prepare(`
    INSERT INTO rescue_logs (id, donation_id, actor_name, actor_role, action, status, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(id, donationId, actorName, actorRole, action, status, details || null);
}

export function recordVerificationEvent(
  donationId: string,
  packageId: string | null,
  eventType: string,
  userId: string,
  role: string,
  result: 'SUCCESS' | 'FAILED' | 'WARNING',
  metadata?: any,
  location?: string
) {
  const id = 'ver_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const metaStr = metadata ? JSON.stringify(metadata) : null;
  db.prepare(`
    INSERT INTO verification_events (id, donation_id, package_id, event_type, user_id, role, location, result, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(id, donationId, packageId, eventType, userId, role, location || null, result, metaStr);

  addRescueLog(
    donationId,
    `User ${userId.substring(0, 8)}`,
    role,
    eventType,
    result,
    metaStr || undefined
  );
}

export function recordDeliveryEvidence(
  donationId: string,
  packageId: string | null,
  evidenceType: 'DONOR_PHOTO' | 'DRIVER_PICKUP_PHOTO' | 'NGO_DELIVERY_PHOTO',
  imageUrl: string,
  capturedBy: string,
  capturedRole: string,
  sealCode?: string,
  notes?: string
) {
  const id = 'evd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  db.prepare(`
    INSERT INTO delivery_evidence (id, donation_id, package_id, evidence_type, image_url, captured_by, captured_role, seal_code, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(id, donationId, packageId, evidenceType, imageUrl, capturedBy, capturedRole, sealCode || null, notes || null);
}

export function calculateIntegrityScore(donationId: string): { score: number; status: string; reasons: string[] } {
  const pkgs = db.prepare('SELECT * FROM food_packages WHERE donation_id = ?').all(donationId) as any[];
  const evs = db.prepare('SELECT * FROM verification_events WHERE donation_id = ?').all(donationId) as any[];
  const evd = db.prepare('SELECT * FROM delivery_evidence WHERE donation_id = ?').all(donationId) as any[];
  const disputes = db.prepare('SELECT * FROM delivery_disputes WHERE donation_id = ? AND status != "RESOLVED"').all(donationId) as any[];
  const routeDevs = db.prepare('SELECT * FROM driver_locations WHERE donation_id = ? AND is_off_route = 1').all(donationId) as any[];

  let score = 100;
  const reasons: string[] = [];

  if (disputes.length > 0) {
    score -= 40;
    reasons.push(`Active dispute reported: ${disputes[0].dispute_type}`);
  }

  if (pkgs.length === 0) {
    score -= 20;
    reasons.push('No packages registered yet');
  } else {
    reasons.push(`${pkgs.length} Food package(s) registered with unique Seal ID`);
    const allPickupVer = pkgs.every((p) => p.verified_at_pickup === 1);
    const allDelVer = pkgs.every((p) => p.verified_at_delivery === 1);
    if (allPickupVer) {
      reasons.push('Driver package QR & seal verified at pickup');
    } else {
      score -= 15;
      reasons.push('Pickup QR scan pending');
    }
    if (allDelVer) {
      reasons.push('NGO package QR & seal verified at delivery');
    }
  }

  const hasDonorPhoto = evd.some((e) => e.evidence_type === 'DONOR_PHOTO');
  const hasPickupPhoto = evd.some((e) => e.evidence_type === 'DRIVER_PICKUP_PHOTO');
  const hasDeliveryPhoto = evd.some((e) => e.evidence_type === 'NGO_DELIVERY_PHOTO');

  if (hasDonorPhoto && hasPickupPhoto && hasDeliveryPhoto) {
    reasons.push('Complete 3-stage photographic evidence recorded');
  } else if (!hasDonorPhoto) {
    score -= 10;
    reasons.push('Donor before-handover package photo missing');
  }

  if (routeDevs.length > 0) {
    score -= 15;
    reasons.push(`Driver route deviation detected (${routeDevs.length} instances)`);
  } else {
    reasons.push('Driver route fully compliant with planned navigation');
  }

  score = Math.max(0, Math.min(100, score));

  let status = 'VERIFIED';
  if (disputes.length > 0) status = 'DISPUTED';
  else if (score < 60) status = 'AT_RISK';
  else if (score < 85) status = 'ATTENTION_REQUIRED';

  return { score, status, reasons };
}

export default db;
