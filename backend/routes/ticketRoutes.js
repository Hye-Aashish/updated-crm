const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const { protect, authorize } = require('../middleware/authMiddleware');

// Get all tickets
router.get('/', protect, async (req, res) => {
    try {
        let filter = {};
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            // Employees see tickets assigned to them
            filter = { assignedTo: req.user._id.toString() };
        }
        const tickets = await Ticket.find(filter).sort({ createdAt: -1 });
        res.json(tickets);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create ticket
router.post('/', protect, async (req, res) => {
    const ticket = new Ticket({
        subject: req.body.subject,
        description: req.body.description,
        priority: req.body.priority,
        clientName: req.body.clientName,
        assignedTo: req.body.assignedTo,
        screenshot: req.body.screenshot
    });
    try {
        const newTicket = await ticket.save();
        res.status(201).json(newTicket);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// GET single ticket
router.get('/:id', protect, async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        if (req.user.role !== 'admin' && req.user.role !== 'owner' && ticket.assignedTo !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        res.json(ticket);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update ticket
router.put('/:id', protect, async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        if (req.user.role !== 'admin' && req.user.role !== 'owner' && ticket.assignedTo !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (req.body.status) ticket.status = req.body.status;
        if (req.body.priority) ticket.priority = req.body.priority;
        if (req.body.assignedTo) ticket.assignedTo = req.body.assignedTo;
        if (req.body.description) ticket.description = req.body.description;

        ticket.updatedAt = Date.now();
        const updatedTicket = await ticket.save();
        res.json(updatedTicket);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete ticket
router.delete('/:id', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        await Ticket.findByIdAndDelete(req.params.id);
        res.json({ message: 'Ticket deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
