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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const database_1 = __importStar(require("./db/database"));
const seed_1 = require("./db/seed");
const mongo_1 = require("./config/mongo");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const donorRoutes_1 = __importDefault(require("./routes/donorRoutes"));
const ngoRoutes_1 = __importDefault(require("./routes/ngoRoutes"));
const driverRoutes_1 = __importDefault(require("./routes/driverRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const donationRoutes_1 = __importDefault(require("./routes/donationRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const rescueRoutes_1 = __importDefault(require("./routes/rescueRoutes"));
const packageRoutes_1 = __importDefault(require("./routes/packageRoutes"));
const navigationRoutes_1 = __importDefault(require("./routes/navigationRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
(0, database_1.initDatabase)();
try {
    const userCount = database_1.default.prepare('SELECT COUNT(*) as count FROM users').get().count;
    if (userCount === 0) {
        (0, seed_1.seedDatabase)();
    }
}
catch {
    (0, seed_1.seedDatabase)();
}
app.use('/api/auth', authRoutes_1.default);
app.use('/api/donor', donorRoutes_1.default);
app.use('/api/ngo', ngoRoutes_1.default);
app.use('/api/driver', driverRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/donations', donationRoutes_1.default);
app.use('/api/notifications', notificationRoutes_1.default);
app.use('/api/rescues', rescueRoutes_1.default);
app.use('/api/packages', packageRoutes_1.default);
app.use('/api/navigation', navigationRoutes_1.default);
app.post('/api/seed/reset', (req, res) => {
    try {
        (0, seed_1.seedDatabase)();
        res.json({ message: 'Database reset and re-seeded successfully' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
const clientDistPath = path_1.default.resolve(__dirname, '../../client/dist');
app.use(express_1.default.static(clientDistPath));
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path_1.default.join(clientDistPath, 'index.html'));
});
app.use((err, req, res, next) => {
    console.error('API Error Handler:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
    });
});
const startServer = async () => {
    try {
        await (0, mongo_1.connectMongoDB)();
        app.listen(PORT, () => {
            console.log(`Surplus-to-Shelter Backend Server running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('Server could not start because MongoDB Atlas is not connected.');
        process.exit(1);
    }
};
startServer();
