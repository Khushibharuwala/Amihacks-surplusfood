import mongoose from 'mongoose';
import db from '../db/database';
import User from '../models/user';
import DonationModel from '../models/donation';
import MatchModel from '../models/match';
import DeliveryModel from '../models/delivery';
import FoodPackageModel from '../models/package';

export async function syncDonationToMongo(donationId: string) {
  try {
    if (mongoose.connection.readyState !== 1) return;
   const don = db.prepare(`
    SELECT d.*, dp.organization_name AS donor_name
    FROM donations d
    LEFT JOIN donor_profiles dp ON dp.id = d.donor_id
    WHERE d.id = ?
  `).get(donationId) as any;
    if (!don) return;

    await DonationModel.findOneAndUpdate(
      { id: donationId },
      {
        id: don.id,
        donor_id: don.donor_id,
        donor_name: don.donor_name || 'Food Donor',
        food_type: don.food_type,
        description: don.description,
        quantity_kg: don.quantity_kg,
        pickup_address: don.pickup_address,
        pickup_latitude: don.pickup_latitude,
        pickup_longitude: don.pickup_longitude,
        available_from: don.available_from,
        safe_until: don.safe_until,
        image_url: don.image_url,
        status: don.status,
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.warn('[MongoDB Sync] Donation sync skipped:', err);
  }
}

export async function syncMatchToMongo(matchId: string) {
  try {
    if (mongoose.connection.readyState !== 1) return;
    const m = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId) as any;
    if (!m) return;

    await MatchModel.findOneAndUpdate(
      { id: matchId },
      {
        id: m.id,
        donation_id: m.donation_id,
        ngo_id: m.ngo_id,
        driver_id: m.driver_id,
        match_score: m.match_score,
        distance_km: m.distance_km,
        estimated_minutes: m.estimated_minutes,
        status: m.status,
        rejection_reason: m.rejection_reason,
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.warn('[MongoDB Sync] Match sync skipped:', err);
  }
}

export async function syncDeliveryToMongo(deliveryId: string) {
  try {
    if (mongoose.connection.readyState !== 1) return;
    const del = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(deliveryId) as any;
    if (!del) return;

    await DeliveryModel.findOneAndUpdate(
      { id: deliveryId },
      {
        id: del.id,
        donation_id: del.donation_id,
        driver_id: del.driver_id,
        ngo_id: del.ngo_id,
        pickup_time: del.pickup_time,
        delivery_time: del.delivery_time,
        status: del.status,
        cancellation_reason: del.cancellation_reason,
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.warn('[MongoDB Sync] Delivery sync skipped:', err);
  }
}

export async function syncPackageToMongo(packageId: string) {
  try {
    if (mongoose.connection.readyState !== 1) return;
    const pkg = db.prepare('SELECT * FROM food_packages WHERE package_id = ?').get(packageId) as any;
    if (!pkg) return;

    await FoodPackageModel.findOneAndUpdate(
      { package_id: packageId },
      {
        package_id: pkg.package_id,
        donation_id: pkg.donation_id,
        qr_token: pkg.qr_token,
        seal_code: pkg.seal_code,
        expected_quantity_kg: pkg.expected_quantity_kg,
        verified_at_pickup: Boolean(pkg.verified_at_pickup),
        verified_at_delivery: Boolean(pkg.verified_at_delivery),
        donor_photo_url: pkg.donor_photo_url,
        pickup_photo_url: pkg.pickup_photo_url,
        delivery_photo_url: pkg.delivery_photo_url,
        status: pkg.status,
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.warn('[MongoDB Sync] Package sync skipped:', err);
  }
}

// Bulk Sync All Database Records between MongoDB Atlas and SQLite on Server Startup
export async function syncAllTablesToMongo() {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('[MongoDB Sync] Mongoose not connected. Skipping initial sync.');
      return;
    }

    console.log('[MongoDB Sync] Syncing MongoDB Atlas collections with SQLite database...');

    // 0. Hydrate SQLite from MongoDB Atlas if MongoDB Atlas has existing records
    try {
      const mongoDonations = await DonationModel.find().lean();
      for (const md of mongoDonations) {
        const existing = db.prepare('SELECT id FROM donations WHERE id = ?').get(md.id);
        if (!existing) {
          db.prepare(`
            INSERT OR REPLACE INTO donations (
              id, donor_id, food_type, description, quantity_kg, pickup_address,
              pickup_latitude, pickup_longitude, available_from, safe_until, image_url, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `).run(
            md.id, md.donor_id || 'dnr_1', md.food_type || 'Cooked', md.description || '',
            md.quantity_kg || 10, md.pickup_address || '', md.pickup_latitude || 0,
            md.pickup_longitude || 0, md.available_from || new Date().toISOString(),
            md.safe_until || new Date(Date.now() + 18000000).toISOString(), md.image_url || '',
            md.status || 'POSTED'
          );
        } else {
          db.prepare(`
            UPDATE donations SET status = ?, description = ?, quantity_kg = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
          `).run(md.status || 'POSTED', md.description || '', md.quantity_kg || 10, md.id);
        }
      }

      const mongoMatches = await MatchModel.find().lean();
      for (const mm of mongoMatches) {
        const existing = db.prepare('SELECT id FROM matches WHERE id = ?').get(mm.id);
        if (!existing) {
          db.prepare(`
            INSERT OR REPLACE INTO matches (
              id, donation_id, ngo_id, driver_id, match_score, distance_km, estimated_minutes, status, rejection_reason, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `).run(
            mm.id, mm.donation_id, mm.ngo_id, mm.driver_id || null,
            mm.match_score || 90, mm.distance_km || 2, mm.estimated_minutes || 10,
            mm.status || 'PENDING', mm.rejection_reason || null
          );
        } else {
          db.prepare(`
            UPDATE matches SET status = ?, driver_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
          `).run(mm.status || 'PENDING', mm.driver_id || null, mm.id);
        }
      }

      const mongoDeliveries = await DeliveryModel.find().lean();
      for (const mdel of mongoDeliveries) {
        const existing = db.prepare('SELECT id FROM deliveries WHERE id = ?').get(mdel.id);
        if (!existing) {
          db.prepare(`
            INSERT OR REPLACE INTO deliveries (
              id, donation_id, driver_id, ngo_id, pickup_time, delivery_time, status, cancellation_reason, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `).run(
            mdel.id, mdel.donation_id, mdel.driver_id || null, mdel.ngo_id,
            mdel.pickup_time || null, mdel.delivery_time || null, mdel.status || 'ASSIGNED',
            mdel.cancellation_reason || null
          );
        } else {
          db.prepare(`
            UPDATE deliveries SET status = ?, driver_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
          `).run(mdel.status || 'ASSIGNED', mdel.driver_id || null, mdel.id);
        }
      }

      const mongoPkgs = await FoodPackageModel.find().lean();
      for (const mp of mongoPkgs) {
        const existing = db.prepare('SELECT package_id FROM food_packages WHERE package_id = ?').get(mp.package_id);
        if (!existing) {
          db.prepare(`
            INSERT OR REPLACE INTO food_packages (
              package_id, donation_id, qr_token, seal_code, expected_quantity_kg, verified_at_pickup, verified_at_delivery, donor_photo_url, pickup_photo_url, delivery_photo_url, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `).run(
            mp.package_id, mp.donation_id, mp.qr_token, mp.seal_code,
            mp.expected_quantity_kg || 10, mp.verified_at_pickup ? 1 : 0, mp.verified_at_delivery ? 1 : 0,
            mp.donor_photo_url || null, mp.pickup_photo_url || null, mp.delivery_photo_url || null,
            mp.status || 'CREATED'
          );
        } else {
          db.prepare(`
            UPDATE food_packages SET status = ?, verified_at_pickup = ?, verified_at_delivery = ? WHERE package_id = ?
          `).run(mp.status || 'CREATED', mp.verified_at_pickup ? 1 : 0, mp.verified_at_delivery ? 1 : 0, mp.package_id);
        }
      }
    } catch (hydrErr) {
      console.warn('[MongoDB Sync] SQLite hydration warning:', hydrErr);
    }

    // 1. Sync Users
    const users = db.prepare('SELECT * FROM users').all() as any[];
    for (const u of users) {
      const prof =
        u.role === 'DONOR'
          ? db.prepare('SELECT * FROM donor_profiles WHERE user_id = ?').get(u.id)
          : u.role === 'NGO'
          ? db.prepare('SELECT * FROM ngo_profiles WHERE user_id = ?').get(u.id)
          : u.role === 'DRIVER'
          ? db.prepare('SELECT * FROM driver_profiles WHERE user_id = ?').get(u.id)
          : {};

      await User.findOneAndUpdate(
        { id: u.id },
        { id: u.id, name: u.name, email: u.email, password: u.password, role: u.role, profileData: prof || {} },
        { upsert: true }
      );
    }

    // 2. Sync Donations
    const donations = db.prepare('SELECT * FROM donations').all() as any[];
    for (const d of donations) {
      await DonationModel.findOneAndUpdate(
        { id: d.id },
        {
          id: d.id,
          donor_id: d.donor_id,
          food_type: d.food_type,
          description: d.description,
          quantity_kg: d.quantity_kg,
          pickup_address: d.pickup_address,
          pickup_latitude: d.pickup_latitude,
          pickup_longitude: d.pickup_longitude,
          available_from: d.available_from,
          safe_until: d.safe_until,
          image_url: d.image_url,
          status: d.status,
        },
        { upsert: true }
      );
    }

    // 3. Sync Matches
    const matches = db.prepare('SELECT * FROM matches').all() as any[];
    for (const m of matches) {
      await MatchModel.findOneAndUpdate(
        { id: m.id },
        {
          id: m.id,
          donation_id: m.donation_id,
          ngo_id: m.ngo_id,
          driver_id: m.driver_id,
          match_score: m.match_score,
          distance_km: m.distance_km,
          estimated_minutes: m.estimated_minutes,
          status: m.status,
          rejection_reason: m.rejection_reason,
        },
        { upsert: true }
      );
    }

    // 4. Sync Deliveries
    const deliveries = db.prepare('SELECT * FROM deliveries').all() as any[];
    for (const del of deliveries) {
      await DeliveryModel.findOneAndUpdate(
        { id: del.id },
        {
          id: del.id,
          donation_id: del.donation_id,
          driver_id: del.driver_id,
          ngo_id: del.ngo_id,
          pickup_time: del.pickup_time,
          delivery_time: del.delivery_time,
          status: del.status,
          cancellation_reason: del.cancellation_reason,
        },
        { upsert: true }
      );
    }

    // 5. Sync Food Packages
    const pkgs = db.prepare('SELECT * FROM food_packages').all() as any[];
    for (const p of pkgs) {
      await FoodPackageModel.findOneAndUpdate(
        { package_id: p.package_id },
        {
          package_id: p.package_id,
          donation_id: p.donation_id,
          qr_token: p.qr_token,
          seal_code: p.seal_code,
          expected_quantity_kg: p.expected_quantity_kg,
          verified_at_pickup: Boolean(p.verified_at_pickup),
          verified_at_delivery: Boolean(p.verified_at_delivery),
          donor_photo_url: p.donor_photo_url,
          pickup_photo_url: p.pickup_photo_url,
          delivery_photo_url: p.delivery_photo_url,
          status: p.status,
        },
        { upsert: true }
      );
    }

    console.log('[MongoDB Sync] ✅ All Users, Donations, Matches, Deliveries & Packages successfully synced bi-directionally with MongoDB Atlas!');
  } catch (err) {
    console.error('[MongoDB Sync Error] Exception during initial database sync:', err);
  }
}
