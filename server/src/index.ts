import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import db, { initDatabase } from './db/database';
import { seedDatabase } from './db/seed';
import authRoutes from './routes/authRoutes';
import donorRoutes from './routes/donorRoutes';
import ngoRoutes from './routes/ngoRoutes';
import driverRoutes from './routes/driverRoutes';
import adminRoutes from './routes/adminRoutes';
import donationRoutes from './routes/donationRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize database schema
initDatabase();

// Auto-seed if users table is empty
try {
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
  if (userCount === 0) {
    seedDatabase();
  }
} catch (e) {
  seedDatabase();
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/donor', donorRoutes);
app.use('/api/ngo', ngoRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/donations', donationRoutes);

// Hackathon Demo Helper: 1-Click Database Reset & Reseed
app.post('/api/seed/reset', (req, res) => {
  try {
    seedDatabase();
    res.json({ message: 'Database reset and re-seeded successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend static files in production / unified deployment
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// Fallback to index.html for SPA client-side routing
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error Handler:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Surplus-to-Shelter Backend Server running on port ${PORT}`);
});
