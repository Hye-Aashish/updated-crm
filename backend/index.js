const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const http = require('http');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const path = require('path');
if (process.env.NODE_ENV !== 'production') {
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
    'http://localhost:3000'
].filter(Boolean);

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"]
    }
});

require('./socket/chatSocket')(io);
require('./socket/projectChatSocket')(io);
require('./socket/monitoringSocket')(io);

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
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

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
    next();
});

// 5. Rate Limiting — Global API limiter
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,                  // Limit each IP to 500 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later.' }
});
app.use('/api', globalLimiter);

// 6. Strict limiter for auth endpoints (brute-force protection)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15,                   // 15 login attempts per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many login attempts, please try again after 15 minutes.' }
});
app.use('/api/auth/login', authLimiter);

// 7. Rate limiter for public form submissions (spam protection)
const publicSubmitLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,                   // 20 submissions per hour per IP
    message: { message: 'Too many submissions, please try again later.' }
});
app.use('/api/lead-forms/public', publicSubmitLimiter);

// 8. Rate limiter for public tracking endpoints (analytics abuse protection)
const trackingLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60,             // 60 req/min per IP
    message: { message: 'Too many tracking requests.' }
});
app.use('/api/tracking/init', trackingLimiter);
app.use('/api/tracking/event', trackingLimiter);
app.use('/api/tracking/pulse', trackingLimiter);

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
    'ai-assistant': require('./routes/aiAssistantRoutes')
};

Object.entries(routes).forEach(([path, handler]) => {
    app.use(`/api/${path}`, handler);
});

// Serve static widget file
app.use('/public', express.static(path.join(__dirname, 'public')));


app.get('/', (req, res) => res.send('Nexprism CRM API v1.0 - Operational'));

// Error Middleware
app.use(errorHandler);

// Start Server
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`\n🚀 Server established on all interfaces (0.0.0.0) on port ${PORT}`);
        console.log(`📡 Network: ${process.env.BACKEND_URL || `http://localhost:${PORT}`}`);
        console.log(`📡 Local: http://localhost:${PORT}`);
        console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔒 Security: Helmet ✓ | Rate Limit ✓ | CORS ✓ | Mongo Sanitize ✓\n`);
    });
}

// Connect to DB in background
connectDB().catch(err => {
    console.error('Initial DB connection failed:', err.message);
});

module.exports = app;
