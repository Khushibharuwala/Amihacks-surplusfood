"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importDefault(require("../db/database"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const user_1 = __importDefault(require("../models/user"));
const router = (0, express_1.Router)();
router.post('/register', async (req, res) => {
    let sqliteUserCreated = false;
    let userId = '';
    try {
        const { email, password, name, role, profileData = {} } = req.body;
        const cleanEmail = email?.trim().toLowerCase();
        if (!cleanEmail || !password || !name || !role) {
            return res.status(400).json({ error: 'Missing required registration fields' });
        }
        if (!['DONOR', 'NGO', 'DRIVER', 'ADMIN'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        const mongoUser = await user_1.default.findOne({ email: cleanEmail });
        const sqliteUser = database_1.default.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
        if (mongoUser || sqliteUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }
        const hashedPassword = bcryptjs_1.default.hashSync(password, 10);
        userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        // Existing SQLite dashboards ke liye user/profile create hota rahega
        database_1.default.prepare(`
      INSERT INTO users (id, name, email, password, role, created_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(userId, name, cleanEmail, hashedPassword, role);
        sqliteUserCreated = true;
        if (role === 'DONOR') {
            const profileId = `dnr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            database_1.default.prepare(`
        INSERT INTO donor_profiles
        (id, user_id, organization_name, address, latitude, longitude, phone)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(profileId, userId, profileData.organization_name || name, profileData.address || '123 Main St', profileData.latitude || 37.7749, profileData.longitude || -122.4194, profileData.phone || '555-0100');
        }
        if (role === 'NGO') {
            const profileId = `ngo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            database_1.default.prepare(`
        INSERT INTO ngo_profiles
        (id, user_id, organization_name, address, latitude, longitude, phone,
        maximum_capacity_kg, current_load_kg, accepted_food_types, requirements)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(profileId, userId, profileData.organization_name || name, profileData.address || '456 Relief Way', profileData.latitude || 37.7833, profileData.longitude || -122.4167, profileData.phone || '555-0200', profileData.maximum_capacity_kg || 100, profileData.current_load_kg || 0, JSON.stringify(profileData.accepted_food_types || ['All']), profileData.requirements || 'Standard clean food packaging');
        }
        if (role === 'DRIVER') {
            const profileId = `drv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            database_1.default.prepare(`
        INSERT INTO driver_profiles
        (id, user_id, phone, latitude, longitude, vehicle_type, vehicle_capacity_kg, is_available)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(profileId, userId, profileData.phone || '555-0300', profileData.latitude || 37.775, profileData.longitude || -122.418, profileData.vehicle_type || 'Van', profileData.vehicle_capacity_kg || 50, 1);
        }
        // MongoDB Atlas mein same registered user save hoga
        await user_1.default.create({
            id: userId,
            name,
            email: cleanEmail,
            password: hashedPassword,
            role,
            profileData,
        });
        const token = jsonwebtoken_1.default.sign({ id: userId, email: cleanEmail, role, name }, authMiddleware_1.JWT_SECRET, { expiresIn: '7d' });
        return res.status(201).json({
            token,
            user: { id: userId, email: cleanEmail, role, name },
        });
    }
    catch (err) {
        // Mongo save fail ho to SQLite mein half-created user hata do
        if (sqliteUserCreated && userId) {
            database_1.default.prepare('DELETE FROM users WHERE id = ?').run(userId);
        }
        return res.status(500).json({ error: err.message || 'Registration failed' });
    }
});
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const cleanEmail = email?.trim().toLowerCase();
        if (!cleanEmail || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        // MongoDB is primary login source
        const mongoUser = await user_1.default.findOne({ email: cleanEmail });
        if (mongoUser && bcryptjs_1.default.compareSync(password, mongoUser.password)) {
            const token = jsonwebtoken_1.default.sign({
                id: mongoUser.id,
                email: mongoUser.email,
                role: mongoUser.role,
                name: mongoUser.name,
            }, authMiddleware_1.JWT_SECRET, { expiresIn: '7d' });
            return res.json({
                token,
                user: {
                    id: mongoUser.id,
                    email: mongoUser.email,
                    role: mongoUser.role,
                    name: mongoUser.name,
                },
            });
        }
        // Purane SQLite demo users ke liye fallback
        const sqliteUser = database_1.default.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
        if (!sqliteUser || !bcryptjs_1.default.compareSync(password, sqliteUser.password)) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const token = jsonwebtoken_1.default.sign({
            id: sqliteUser.id,
            email: sqliteUser.email,
            role: sqliteUser.role,
            name: sqliteUser.name,
        }, authMiddleware_1.JWT_SECRET, { expiresIn: '7d' });
        return res.json({
            token,
            user: {
                id: sqliteUser.id,
                email: sqliteUser.email,
                role: sqliteUser.role,
                name: sqliteUser.name,
            },
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Login failed' });
    }
});
router.get('/demo-accounts', (req, res) => {
    try {
        const users = database_1.default.prepare(`
      SELECT u.id, u.name, u.email, u.role,
        dp.organization_name as donor_org,
        np.organization_name as ngo_org, np.maximum_capacity_kg, np.current_load_kg,
        drv.vehicle_type, drv.vehicle_capacity_kg, drv.is_available
      FROM users u
      LEFT JOIN donor_profiles dp ON u.id = dp.user_id
      LEFT JOIN ngo_profiles np ON u.id = np.user_id
      LEFT JOIN driver_profiles drv ON u.id = drv.user_id
      ORDER BY u.role, u.name
    `).all();
        res.json({ users });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
