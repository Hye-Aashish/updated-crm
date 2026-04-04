const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            return res.status(401).json({ message: 'User not found' });
        }

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired, please login again' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: 'Access denied. Insufficient permissions.'
            });
        }
        next();
    };
};

const checkPermission = (module, action) => {
    return async (req, res, next) => {
        if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
        
        // Owners have bypass
        if (req.user.role === 'owner') return next();

        try {
            const Setting = require('../models/Setting');
            const settings = await Setting.findOne({ type: 'general' });
            if (!settings || !settings.roles) return res.status(403).json({ message: 'System roles not configured' });

            const userRoleConfig = settings.roles.find(r => r.name === req.user.role);
            if (!userRoleConfig) return res.status(403).json({ message: `Role "${req.user.role}" not found in system` });

            const permissions = userRoleConfig.permissions || {};
            const modulePerms = permissions[module] || {};
            
            if (modulePerms[action]) {
                return next();
            }

            res.status(403).json({ 
                message: `Permission Denied: You do not have '${action}' access for the '${module}' module.` 
            });
        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({ message: 'Internal Server Error during permission check' });
        }
    };
};

module.exports = { protect, authorize, checkPermission };
