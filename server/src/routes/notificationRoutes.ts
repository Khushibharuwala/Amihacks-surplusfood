import { Router } from 'express';
import db from '../db/database';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

// Get user notifications
router.get('/', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const notifications = db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? OR user_id = 'ALL' 
      ORDER BY created_at DESC 
      LIMIT 50
    `).all(userId);

    const unreadCount = (db.prepare(`
      SELECT COUNT(*) as count FROM notifications 
      WHERE (user_id = ? OR user_id = 'ALL') AND is_read = 0
    `).get(userId) as any).count;

    res.json({ notifications, unreadCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mark single notification read
router.post('/:id/read', (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    db.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ?`).run(id);
    res.json({ message: 'Notification marked as read' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mark all read
router.post('/read-all', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    db.prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ? OR user_id = 'ALL'`).run(userId);
    res.json({ message: 'All notifications marked as read' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
