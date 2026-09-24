"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDatabase = seedDatabase;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = __importStar(require("./database"));
const matchingService_1 = require("../services/matchingService");
function seedDatabase() {
    (0, database_1.initDatabase)();
    console.log('Seeding Surplus-to-Shelter database...');
    // Clear existing tables
    database_1.default.exec(`
    DELETE FROM deliveries;
    DELETE FROM matches;
    DELETE FROM donations;
    DELETE FROM driver_profiles;
    DELETE FROM ngo_profiles;
    DELETE FROM donor_profiles;
    DELETE FROM users;
  `);
    const passwordHash = bcryptjs_1.default.hashSync('password123', 10);
    // 1. ADMIN USER
    database_1.default.prepare(`
    INSERT INTO users (id, name, email, password, role)
    VALUES ('usr_admin', 'System Administrator', 'admin@surplus.org', ?, 'ADMIN')
  `).run(passwordHash);
    // 2. DONOR USERS & PROFILES
    const donors = [
        {
            userId: 'usr_donor1',
            profileId: 'dnr_1',
            name: 'Tasty Bites Restaurant',
            email: 'donor1@tastybites.com',
            org: 'Tasty Bites Restaurant',
            address: '742 Market St, San Francisco, CA',
            lat: 37.7879,
            lng: -122.4042,
            phone: '415-555-0101',
        },
        {
            userId: 'usr_donor2',
            profileId: 'dnr_2',
            name: 'FreshMarket Grocery',
            email: 'donor2@freshmarket.com',
            org: 'FreshMarket Grocery',
            address: '2300 16th St, San Francisco, CA',
            lat: 37.7665,
            lng: -122.4132,
            phone: '415-555-0102',
        },
        {
            userId: 'usr_donor3',
            profileId: 'dnr_3',
            name: 'Bay Area Catering Co',
            email: 'donor3@baycatering.com',
            org: 'Bay Area Catering Co',
            address: '500 Howard St, San Francisco, CA',
            lat: 37.7885,
            lng: -122.3972,
            phone: '415-555-0103',
        },
    ];
    for (const d of donors) {
        database_1.default.prepare(`
      INSERT INTO users (id, name, email, password, role)
      VALUES (?, ?, ?, ?, 'DONOR')
    `).run(d.userId, d.name, d.email, passwordHash);
        database_1.default.prepare(`
      INSERT INTO donor_profiles (id, user_id, organization_name, address, latitude, longitude, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(d.profileId, d.userId, d.org, d.address, d.lat, d.lng, d.phone);
    }
    // 3. NGO USERS & PROFILES
    const ngos = [
        {
            userId: 'usr_ngo1',
            profileId: 'ngo_1',
            name: 'St. Marys Shelter',
            email: 'ngo1@stmarys.org',
            org: 'St. Marys Shelter',
            address: '600 Guerrero St, San Francisco, CA',
            lat: 37.7621,
            lng: -122.4241,
            phone: '415-555-0201',
            maxCap: 15, // LIMITED CAPACITY (Rule 2 test!)
            curLoad: 10, // Available: 5 kg
            accepted: JSON.stringify(['Cooked', 'Bakery']),
            reqs: 'Insulated hot containers required',
        },
        {
            userId: 'usr_ngo2',
            profileId: 'ngo_2',
            name: 'Hope Community Kitchen',
            email: 'ngo2@hopekitchen.org',
            org: 'Hope Community Kitchen',
            address: '1050 Mission St, San Francisco, CA',
            lat: 37.7809,
            lng: -122.4095,
            phone: '415-555-0202',
            maxCap: 120, // Available: 100 kg (Primary Match Candidate!)
            curLoad: 20,
            accepted: JSON.stringify(['Cooked', 'Grocery', 'Produce', 'Bakery', 'Dairy']),
            reqs: 'Standard clean food trays',
        },
        {
            userId: 'usr_ngo3',
            profileId: 'ngo_3',
            name: 'Harbor Rescue Shelter',
            email: 'ngo3@harborrescue.org',
            org: 'Harbor Rescue Shelter',
            address: '400 Connecticut St, San Francisco, CA',
            lat: 37.7601,
            lng: -122.3980,
            phone: '415-555-0203',
            maxCap: 150, // Available: 120 kg (Farther location)
            curLoad: 30,
            accepted: JSON.stringify(['Cooked', 'Grocery', 'Produce']),
            reqs: 'Bulk packaging accepted',
        },
        {
            userId: 'usr_ngo4',
            profileId: 'ngo_4',
            name: 'Vegan Safe Pantry',
            email: 'ngo4@vegansafe.org',
            org: 'Vegan Safe Pantry',
            address: '1800 Polk St, San Francisco, CA',
            lat: 37.7923,
            lng: -122.4209,
            phone: '415-555-0204',
            maxCap: 200, // Available: 190 kg (Incompatible food test!)
            curLoad: 10,
            accepted: JSON.stringify(['Raw', 'Produce']),
            reqs: 'Strictly raw fruits, vegetables, and pantry grains',
        },
    ];
    for (const n of ngos) {
        database_1.default.prepare(`
      INSERT INTO users (id, name, email, password, role)
      VALUES (?, ?, ?, ?, 'NGO')
    `).run(n.userId, n.name, n.email, passwordHash);
        database_1.default.prepare(`
      INSERT INTO ngo_profiles (id, user_id, organization_name, address, latitude, longitude, phone, maximum_capacity_kg, current_load_kg, accepted_food_types, requirements)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(n.profileId, n.userId, n.org, n.address, n.lat, n.lng, n.phone, n.maxCap, n.curLoad, n.accepted, n.reqs);
    }
    // 4. DRIVER USERS & PROFILES
    const drivers = [
        {
            userId: 'usr_drv1',
            profileId: 'drv_1',
            name: 'Rahul Express',
            email: 'driver1@express.com',
            phone: '415-555-0301',
            lat: 37.7850,
            lng: -122.4060,
            vehicle: 'Cargo Van',
            capacity: 80,
            available: 1,
        },
        {
            userId: 'usr_drv2',
            profileId: 'drv_2',
            name: 'Sarah Green',
            email: 'driver2@greenride.com',
            phone: '415-555-0302',
            lat: 37.7820,
            lng: -122.4100,
            vehicle: 'E-Cargo Bike',
            capacity: 15, // Low capacity test (Rule 4 filter!)
            available: 1,
        },
        {
            userId: 'usr_drv3',
            profileId: 'drv_3',
            name: 'Carlos Trucking',
            email: 'driver3@carlostruck.com',
            phone: '415-555-0303',
            lat: 37.7710,
            lng: -122.4180,
            vehicle: 'Pickup Truck',
            capacity: 150,
            available: 1,
        },
        {
            userId: 'usr_drv4',
            profileId: 'drv_4',
            name: 'Alex Rivera',
            email: 'driver4@driverflex.com',
            phone: '415-555-0304',
            lat: 37.7680,
            lng: -122.4020,
            vehicle: 'Compact Car',
            capacity: 35,
            available: 1,
        },
        {
            userId: 'usr_drv5',
            profileId: 'drv_5',
            name: 'David Chen',
            email: 'driver5@reefertrans.com',
            phone: '415-555-0305',
            lat: 37.7750,
            lng: -122.4200,
            vehicle: 'Refrigerated Truck',
            capacity: 200,
            available: 0, // OFFLINE (Rule 5 test!)
        },
    ];
    for (const drv of drivers) {
        database_1.default.prepare(`
      INSERT INTO users (id, name, email, password, role)
      VALUES (?, ?, ?, ?, 'DRIVER')
    `).run(drv.userId, drv.name, drv.email, passwordHash);
        database_1.default.prepare(`
      INSERT INTO driver_profiles (id, user_id, phone, latitude, longitude, vehicle_type, vehicle_capacity_kg, is_available)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(drv.profileId, drv.userId, drv.phone, drv.lat, drv.lng, drv.vehicle, drv.capacity, drv.available);
    }
    // 5. INITIAL DONATIONS
    const now = new Date();
    const safeWindow830PM = new Date();
    safeWindow830PM.setHours(20, 30, 0, 0);
    if (safeWindow830PM < now) {
        safeWindow830PM.setDate(safeWindow830PM.getDate() + 1);
    }
    const safeWindow2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const safeWindow30Mins = new Date(now.getTime() + 30 * 60 * 1000);
    // Donation 1: Required Demo Scenario (25 kg cooked rice safe until 8:30 PM)
    database_1.default.prepare(`
    INSERT INTO donations (
      id, donor_id, food_type, description, quantity_kg,
      pickup_address, pickup_latitude, pickup_longitude,
      available_from, safe_until, status
    ) VALUES (
      'don_demo_1', 'dnr_1', 'Cooked', '25 kg Freshly Cooked Basmati Rice & Curry', 25,
      '742 Market St, San Francisco, CA', 37.7879, -122.4042,
      ?, ?, 'POSTED'
    )
  `).run(now.toISOString(), safeWindow830PM.toISOString());
    // Donation 2: Fresh Bakery Bread
    database_1.default.prepare(`
    INSERT INTO donations (
      id, donor_id, food_type, description, quantity_kg,
      pickup_address, pickup_latitude, pickup_longitude,
      available_from, safe_until, status
    ) VALUES (
      'don_demo_2', 'dnr_2', 'Bakery', '12 kg Surplus Whole Wheat & Sourdough Loaves', 12,
      '2300 16th St, San Francisco, CA', 37.7665, -122.4132,
      ?, ?, 'POSTED'
    )
  `).run(now.toISOString(), safeWindow2Hours.toISOString());
    // Donation 3: Unmatched Donation (Excessive Quantity 500 kg - No single NGO can fit!)
    database_1.default.prepare(`
    INSERT INTO donations (
      id, donor_id, food_type, description, quantity_kg,
      pickup_address, pickup_latitude, pickup_longitude,
      available_from, safe_until, status
    ) VALUES (
      'don_demo_3', 'dnr_3', 'Cooked', '500 kg Massive Event Catering Stew', 500,
      '500 Howard St, San Francisco, CA', 37.7885, -122.3972,
      ?, ?, 'POSTED'
    )
  `).run(now.toISOString(), safeWindow30Mins.toISOString());
    console.log('Running automatic matching on initial donations...');
    (0, matchingService_1.evaluateAndMatchDonation)('don_demo_1');
    (0, matchingService_1.evaluateAndMatchDonation)('don_demo_2');
    (0, matchingService_1.evaluateAndMatchDonation)('don_demo_3');
    console.log('Database seeded successfully!');
}
if (require.main === module) {
    seedDatabase();
}
