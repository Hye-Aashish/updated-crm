const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const http = require('http');
const { Server } = require('socket.io');
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const connectDB = require('./config/db');
const User = require('./models/User');
const { errorHandler } = require('./middleware/errorMiddleware');

// Initialize app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

require('./socket/chatSocket')(io);

const PORT = process.env.PORT || 5000;

// Middleware (DB connection is handled in connectDB cache)

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request Logging
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
    tracking: require('./routes/trackingRoutes'),
    quotations: require('./routes/quotationRoutes'),
    test: require('./routes/testRoutes')
};

Object.entries(routes).forEach(([path, handler]) => {
    app.use(`/api/${path}`, handler);
});

// Serve static widget file
const path = require('path');
app.use('/public', express.static(path.join(__dirname, 'public')));


app.get('/', (req, res) => res.send('Nexprism CRM API v1.0 - Operational'));

// Error Middleware
app.use(errorHandler);

// Start Server
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    server.listen(PORT, () => {
        console.log(`\n🚀 Server established on port ${PORT}`);
        console.log(`📡 Local: http://localhost:${PORT}`);
        console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
}

// Connect to DB in background
connectDB().catch(err => {
    console.error('Initial DB connection failed:', err.message);
});

module.exports = app;
