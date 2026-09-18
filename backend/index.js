const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const http = require('http');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const path = require('path');
if (!process.env.MONGO_URI || process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: path.join(__dirname, '.env') });
    require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
}

const connectDB = require('./config/db');
const User = require('./models/User');
const { errorHandler } = require('./middleware/errorMiddleware');

// ── Validate Critical Env Vars ──────────────────────────────────────────────
if (!process.env.JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET environment variable is not set!');
    console.error('   Set it in your .env file: JWT_SECRET=your-super-secret-key-here');
    process.exit(1);
}

// Initialize app
const app = express();
const server = http.createServer(app);

const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
    'http://localhost:3000',
    'https://crm.nexprism.com',
    'https://crm.nexprism.com/',
    'https://updated-crm-cpzi.vercel.app',
    'https://updated-crm-cpzi.vercel.app/'
].filter(Boolean);


const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

require('./socket/chatSocket')(io);
require('./socket/projectChatSocket')(io);
require('./socket/monitoringSocket')(io);

// Initialize Cron Jobs
require('./services/cronService');

const PORT = process.env.PORT || 5000;

// ── Security Middleware ─────────────────────────────────────────────────────

// 1. Helmet — HTTP security headers (XSS, clickjacking, sniffing protection)
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow serving static files cross-origin
    contentSecurityPolicy: false // Disable CSP for API server (frontend handles its own)
}));

// 2. CORS — Restrict to known frontend origins
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// 2.5 Rate Limiting — Prevent brute-force and abuse
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // 500 requests per window per IP
    message: { message: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api', globalLimiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // Only 10 login attempts per 15 min
    message: { message: 'Too many login attempts. Please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/auth/login', authLimiter);

const publicEndpointLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: { message: 'Rate limit exceeded.' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/tracking', publicEndpointLimiter);
app.use('/api/lead-forms/public', publicEndpointLimiter);
app.use('/api/candidates/public', publicEndpointLimiter);
app.use('/api/whatsapp/webhook', publicEndpointLimiter);

// 3. Body parser with limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 4. NoSQL Injection Prevention — custom sanitizer (express-mongo-sanitize not compatible with Express 5)
const sanitizeObject = (obj) => {
    if (obj && typeof obj === 'object') {
        for (const key in obj) {
            if (key.startsWith('$') || key.includes('.')) {
                console.warn(`[SECURITY] NoSQL injection attempt blocked: key "${key}"`);
                delete obj[key];
            } else if (typeof obj[key] === 'object') {
                sanitizeObject(obj[key]);
            }
        }
    }
    return obj;
};

app.use((req, res, next) => {
    if (req.body) sanitizeObject(req.body);
    if (req.params) sanitizeObject(req.params);
    if (req.query) sanitizeObject(req.query);
    next();
});

// 9. MongoDB ObjectId validation middleware
const mongoose = require('mongoose');
app.use('/api', (req, res, next) => {
    // Validate :id parameters to prevent CastError crashes
    const idParams = req.url.match(/\/([a-f0-9]{24})(?:\/|$|\?)/gi);
    if (idParams) {
        for (const match of idParams) {
            const id = match.replace(/^\//, '').replace(/[\/\?]$/, '');
            if (id.length === 24 && !mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ message: 'Invalid ID format' });
            }
        }
    }
    next();
});

// Request Logging (production-safe)
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl || req.url} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// Routes Registration
const routes = {
    projects: require('./routes/projectRoutes'),
    'project-templates': require('./routes/projectTemplateRoutes'),
    clients: require('./routes/clientRoutes'),
    users: require('./routes/userRoutes'),
    tasks: require('./routes/taskRoutes'),
    invoices: require('./routes/invoiceRoutes'),
    leads: require('./routes/leadRoutes'),
    files: require('./routes/fileRoutes'),
    'time-entries': require('./routes/timeEntryRoutes'),
    expenses: require('./routes/expenseRoutes'),
    tickets: require('./routes/ticketRoutes'),
    settings: require('./routes/settingRoutes'),
    auth: require('./routes/authRoutes'),
    'lead-forms': require('./routes/leadFormRoutes'),
    attendance: require('./routes/attendanceRoutes'),
    payroll: require('./routes/payrollRoutes'),
    notifications: require('./routes/notificationRoutes'),
    chat: require('./routes/chatRoutes'),
    'project-chat': require('./routes/projectChatRoutes'),
    tracking: require('./routes/trackingRoutes'),
    quotations: require('./routes/quotationRoutes'),
    amc: require('./routes/amcRoutes'),
    domains: require('./routes/domainRoutes'),
    'expiry-alerts': require('./routes/expiryAlertRoutes'),
    test: require('./routes/testRoutes'),
    'ai-assistant': require('./routes/aiAssistantRoutes'),
    products: require('./routes/productRoutes'),
    'client-products': require('./routes/clientProductRoutes'),
    candidates: require('./routes/candidateRoutes'),
    approvals: require('./routes/approvalRoutes'),
    campaigns: require('./routes/campaignRoutes'),
    goals: require('./routes/goalRoutes'),
    whatsapp: require('./routes/whatsappRoutes')
};

Object.entries(routes).forEach(([path, handler]) => {
    app.use(`/api/${path}`, handler);
});

// Serve static widget file
app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.send('Nexprism CRM API v1.0 - Operational'));

// Serve production dist static files if in production mode
const distPath = path.join(__dirname, '../dist');
if (process.env.NODE_ENV === 'production' && require('fs').existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/public') || req.path.includes('.')) return next();
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

// Error Middleware
app.use(errorHandler);

// Start Server
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`\n🚀 Server established on all interfaces (0.0.0.0) on port ${PORT}`);
        console.log(`📡 Network: ${process.env.BACKEND_URL || `http://localhost:${PORT}`}`);
        console.log(`📡 Local: http://localhost:${PORT}`);
        console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔒 Security: Helmet ✓ | Rate Limit ✓ | CORS (Whitelist) ✓ | Mongo Sanitize ✓\n`);
    });
}

// Connect to DB in background
connectDB().then(() => {
    // Initialize WhatsApp Web Client
    const { initWhatsAppClient } = require('./services/whatsappClient');
    initWhatsAppClient();

    const { startReminderScheduler } = require('./services/reminderScheduler');
    startReminderScheduler();
}).catch(err => {
    console.error('Initial DB connection failed:', err.message);
});

module.exports = app;
