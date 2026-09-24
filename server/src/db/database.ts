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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(donation_id) REFERENCES donations(id) ON DELETE CASCADE,
      FOREIGN KEY(driver_id) REFERENCES driver_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY(ngo_id) REFERENCES ngo_profiles(id) ON DELETE CASCADE
    );
  `);
}

export default db;
