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
      status TEXT CHECK(status IN ('POSTED', 'MATCHING', 'MATCHED', 'DRIVER_ASSIGNED', 'PICKUP_STARTED', 'PICKED_UP', 'DELIVERED', 'EXPIRED', 'CANCELLED')) NOT NULL DEFAULT 'POSTED',
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
      status TEXT CHECK(status IN ('ASSIGNED', 'ACCEPTED', 'PICKUP_STARTED', 'PICKED_UP', 'DELIVERED', 'CANCELLED')) NOT NULL DEFAULT 'ASSIGNED',
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
      type TEXT NOT NULL, -- e.g. 'MATCH_FOUND', 'DRIVER_ASSIGNED', 'RESCUE_ALERT', 'EXPIRED'
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
  `);

  // Migration column additions for existing database files
  try {
    db.exec(`ALTER TABLE matches ADD COLUMN match_reasons TEXT`);
  } catch (e) {}

  try {
    db.exec(`ALTER TABLE deliveries ADD COLUMN cancellation_reason TEXT`);
  } catch (e) {}
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

export default db;
