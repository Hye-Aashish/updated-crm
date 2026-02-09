const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const connectDB = require('./config/db');
const User = require('./models/User');
const { errorHandler } = require('./middleware/errorMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware to ensure DB connection
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error('Database connection failed:', error);
        res.status(500).json({ message: 'Database Connection Error', error: error.message });
    }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request Logging
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
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
    notifications: require('./routes/notificationRoutes')
};

Object.entries(routes).forEach(([path, handler]) => {
    app.use(`/api/${path}`, handler);
});

app.get('/', (req, res) => res.send('Nexprism CRM API v1.0 - Operational'));

// Error Middleware
app.use(errorHandler);

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`\n🚀 Server established on port ${PORT}`);
        console.log(`📡 Local: http://localhost:${PORT}`);
        console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
}

module.exports = app;
