const express = require('express');
const router = express.Router();
const Hosting = require('../models/Hosting');
const { protect, checkPermission } = require('../middleware/authMiddleware');

// Auto status updater helper
const updateHostingStatuses = async (servers) => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return Promise.all(servers.map(async (server) => {
        if (server.status === 'suspended' || server.status === 'terminated') return server;

        const renewal = new Date(server.renewalDate);
        let newStatus = server.status;

        if (renewal < now) {
            newStatus = 'suspended';
        } else if (renewal <= thirtyDaysFromNow) {
            newStatus = 'expiring-soon';
        } else {
            newStatus = 'active';
        }

        if (newStatus !== server.status) {
            server.status = newStatus;
            await server.save();
        }
        return server;
    }));
};

// GET all hosting servers
router.get('/', protect, async (req, res) => {
    try {
        let filter = {};
        if (req.user.role === 'client') {
            filter.clientId = req.user.clientId;
        }

        const servers = await Hosting.find(filter)
            .populate('clientId', 'name email company')
            .populate('projectId', 'name status')
            .sort({ renewalDate: 1 });

        const updated = await updateHostingStatuses(servers);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET stats summary
router.get('/stats/summary', protect, async (req, res) => {
    try {
        let filter = {};
        if (req.user.role === 'client') {
            filter.clientId = req.user.clientId;
        }

        const servers = await Hosting.find(filter);
        const totalServers = servers.length;
        const activeServers = servers.filter(s => s.status === 'active').length;
        const expiringSoon = servers.filter(s => s.status === 'expiring-soon').length;
        const suspended = servers.filter(s => s.status === 'suspended').length;
        const totalMonthlyCost = servers.reduce((acc, s) => {
            let mult = 1;
            if (s.billingCycle === 'annually') mult = 1 / 12;
            else if (s.billingCycle === 'half-yearly') mult = 1 / 6;
            else if (s.billingCycle === 'quarterly') mult = 1 / 3;
            return acc + (s.cost * mult);
        }, 0);

        res.json({
            totalServers,
            activeServers,
            expiringSoon,
            suspended,
            totalMonthlyCost: Math.round(totalMonthlyCost)
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET single server
router.get('/:id', protect, async (req, res) => {
    try {
        const server = await Hosting.findById(req.params.id)
            .populate('clientId', 'name email company')
            .populate('projectId', 'name status');
        if (!server) return res.status(404).json({ message: 'Server not found' });
        res.json(server);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// CREATE server
router.post('/', protect, checkPermission('settings', 'edit'), async (req, res) => {
    try {
        const payload = { ...req.body };
        if (!payload.clientId || payload.clientId === 'none') delete payload.clientId;
        if (!payload.projectId || payload.projectId === 'none') delete payload.projectId;

        const server = new Hosting(payload);
        await server.save();

        const populated = await Hosting.findById(server._id)
            .populate('clientId', 'name email company')
            .populate('projectId', 'name status');

        res.status(201).json(populated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// UPDATE server
router.put('/:id', protect, checkPermission('settings', 'edit'), async (req, res) => {
    try {
        const payload = { ...req.body };
        if (!payload.clientId || payload.clientId === 'none') payload.clientId = null;
        if (!payload.projectId || payload.projectId === 'none') payload.projectId = null;

        const server = await Hosting.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true })
            .populate('clientId', 'name email company')
            .populate('projectId', 'name status');

        if (!server) return res.status(404).json({ message: 'Server not found' });
        res.json(server);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE server
router.delete('/:id', protect, checkPermission('settings', 'delete'), async (req, res) => {
    try {
        const server = await Hosting.findByIdAndDelete(req.params.id);
        if (!server) return res.status(404).json({ message: 'Server not found' });
        res.json({ message: 'Server deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
