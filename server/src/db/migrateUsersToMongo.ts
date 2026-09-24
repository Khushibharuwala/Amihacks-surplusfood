import dotenv from 'dotenv';
import mongoose from 'mongoose';
import db from './database';
import { connectMongoDB } from '../config/mongo';
import User from '../models/user';

dotenv.config();

async function migrateUsersToMongo() {
  try {
    await connectMongoDB();

    const users = db.prepare(`
      SELECT
        u.id, u.name, u.email, u.password, u.role,
        dp.organization_name AS donor_org, dp.address AS donor_address,
        dp.latitude AS donor_latitude, dp.longitude AS donor_longitude,
        dp.phone AS donor_phone,

        np.organization_name AS ngo_org, np.address AS ngo_address,
        np.latitude AS ngo_latitude, np.longitude AS ngo_longitude,
        np.phone AS ngo_phone, np.maximum_capacity_kg,
        np.current_load_kg, np.accepted_food_types, np.requirements,

        drv.phone AS driver_phone, drv.latitude AS driver_latitude,
        drv.longitude AS driver_longitude, drv.vehicle_type,
        drv.vehicle_capacity_kg, drv.is_available

      FROM users u
      LEFT JOIN donor_profiles dp ON u.id = dp.user_id
      LEFT JOIN ngo_profiles np ON u.id = np.user_id
      LEFT JOIN driver_profiles drv ON u.id = drv.user_id
    `).all() as any[];

    for (const user of users) {
      let profileData: Record<string, unknown> = {};

      if (user.role === 'DONOR') {
        profileData = {
          organization_name: user.donor_org,
          address: user.donor_address,
          latitude: user.donor_latitude,
          longitude: user.donor_longitude,
          phone: user.donor_phone,
        };
      }

      if (user.role === 'NGO') {
        profileData = {
          organization_name: user.ngo_org,
          address: user.ngo_address,
          latitude: user.ngo_latitude,
          longitude: user.ngo_longitude,
          phone: user.ngo_phone,
          maximum_capacity_kg: user.maximum_capacity_kg,
          current_load_kg: user.current_load_kg,
          accepted_food_types: user.accepted_food_types
            ? JSON.parse(user.accepted_food_types)
            : [],
          requirements: user.requirements,
        };
      }

      if (user.role === 'DRIVER') {
        profileData = {
          phone: user.driver_phone,
          latitude: user.driver_latitude,
          longitude: user.driver_longitude,
          vehicle_type: user.vehicle_type,
          vehicle_capacity_kg: user.vehicle_capacity_kg,
          is_available: Boolean(user.is_available),
        };
      }

      await User.updateOne(
        { email: user.email.toLowerCase() },
        {
          $set: {
            id: user.id,
            name: user.name,
            email: user.email.toLowerCase(),
            password: user.password,
            role: user.role,
            profileData,
          },
        },
        { upsert: true }
      );
    }

    console.log(`${users.length} existing users copied to MongoDB Atlas`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

migrateUsersToMongo();