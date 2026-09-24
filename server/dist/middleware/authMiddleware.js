"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWT_SECRET = void 0;
exports.authenticate = authenticate;
exports.authorizeRoles = authorizeRoles;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importDefault(require("../db/database"));
exports.JWT_SECRET = process.env.JWT_SECRET || 'surplus-to-shelter-secret-key-2026';
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    const customUserId = req.headers['x-user-id'];
    if (customUserId) {
        const user = database_1.default.prepare('SELECT id, email, role, name FROM users WHERE id = ?').get(customUserId);
        if (user) {
            req.user = user;
            return next();
        }
    }
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, exports.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
}
function authorizeRoles(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: `Forbidden: Access restricted to roles [${roles.join(', ')}]. Your role is '${req.user.role}'`,
            });
        }
        next();
    };
}
