"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../db/database"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticate);
// Get user notifications
router.get('/', (req, res) => {
    try {
        const userId = req.user.id;
        const notifications = database_1.default.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? OR user_id = 'ALL' 
      ORDER BY created_at DESC 
      LIMIT 50
    `).all(userId);
        const unreadCount = database_1.default.prepare(`
      SELECT COUNT(*) as count FROM notifications 
      WHERE (user_id = ? OR user_id = 'ALL') AND is_read = 0
    `).get(userId).count;
        res.json({ notifications, unreadCount });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Mark single notification read
router.post('/:id/read', (req, res) => {
    try {
        const id = req.params.id;
        database_1.default.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ?`).run(id);
        res.json({ message: 'Notification marked as read' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Mark all read
router.post('/read-all', (req, res) => {
    try {
        const userId = req.user.id;
        database_1.default.prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ? OR user_id = 'ALL'`).run(userId);
        res.json({ message: 'All notifications marked as read' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
