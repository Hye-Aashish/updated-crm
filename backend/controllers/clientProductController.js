const ClientProduct = require('../models/ClientProduct');
const Product = require('../models/Product');

// Helper to calculate payment status
const calculatePaymentStatus = (customPrice, paidAmount) => {
    const price = Number(customPrice) || 0;
    const paid = Number(paidAmount) || 0;
    if (paid >= price && price > 0) return 'paid';
    if (paid > 0) return 'partial';
    return 'unpaid';
};

// Helper to auto-calculate progress from tasks
const calculateTaskProgress = (tasks) => {
    if (!tasks || tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.status === 'completed').length;
    return Math.round((completed / tasks.length) * 100);
};

// Helper to sanitize financial/payment data for staff (employee/developer/designer)
const sanitizeForStaff = (doc, user) => {
    if (!doc) return null;
    const isStaff = user && (user.role === 'employee' || user.role === 'developer' || user.role === 'designer');
    if (!isStaff) return doc;

    const raw = doc.toObject ? doc.toObject() : { ...doc };
    // Completely remove all payment / amount / pricing details for staff
    delete raw.customPrice;
    delete raw.paidAmount;
    delete raw.paymentStatus;
    delete raw.paymentHistory;
    if (raw.product && typeof raw.product === 'object') {
        const prodObj = raw.product.toObject ? raw.product.toObject() : { ...raw.product };
        delete prodObj.basePrice;
        raw.product = prodObj;
    }
    return raw;
};

// Get all assigned products across all clients
exports.getAllClientProducts = async (req, res) => {
    try {
        let query = {};
        // If user is employee/developer, they see products assigned to them or their tasks
        if (req.user && (req.user.role === 'employee' || req.user.role === 'developer' || req.user.role === 'designer')) {
            const userId = req.user._id;
            query = {
                $or: [
                    { assignedTo: userId },
                    { 'tasks.assignedTo': userId }
                ]
            };
        }

        const clientProducts = await ClientProduct.find(query)
            .populate('client', 'name email company status phone')
            .populate('product', 'name description basePrice features')
            .populate('assignedTo', 'name email avatar role')
            .populate('tasks.assignedTo', 'name email avatar')
            .populate('paymentHistory.recordedBy', 'name email')
            .sort({ assignedAt: -1 });

        const sanitized = clientProducts.map(cp => sanitizeForStaff(cp, req.user));
        res.status(200).json(sanitized);
    } catch (err) {
        console.error('Error fetching all client products:', err);
        res.status(500).json({ message: 'Error fetching all client products' });
    }
};

// Get products assigned to a specific client
exports.getClientProducts = async (req, res) => {
    try {
        const { clientId } = req.params;
        let query = { client: clientId };

        // If user is employee/developer, verify they are assigned or restrict query
        if (req.user && (req.user.role === 'employee' || req.user.role === 'developer' || req.user.role === 'designer')) {
            const userId = req.user._id;
            query.$or = [
                { assignedTo: userId },
                { 'tasks.assignedTo': userId }
            ];
        }

        const clientProducts = await ClientProduct.find(query)
            .populate('client', 'name email company status')
            .populate('product')
            .populate('assignedTo', 'name email avatar role')
            .populate('tasks.assignedTo', 'name email avatar')
            .populate('paymentHistory.recordedBy', 'name email')
            .sort({ assignedAt: -1 });

        const sanitized = clientProducts.map(cp => sanitizeForStaff(cp, req.user));
        res.status(200).json(sanitized);
    } catch (err) {
        console.error('Error fetching client products:', err);
        res.status(500).json({ message: 'Error fetching client products' });
    }
};

// Get a single client product by ID
exports.getClientProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const clientProduct = await ClientProduct.findById(id)
            .populate('client', 'name email company status phone')
            .populate('product')
            .populate('assignedTo', 'name email avatar role')
            .populate('tasks.assignedTo', 'name email avatar')
            .populate('paymentHistory.recordedBy', 'name email');

        if (!clientProduct) {
            return res.status(404).json({ message: 'Assigned product not found' });
        }

        const sanitized = sanitizeForStaff(clientProduct, req.user);
        res.status(200).json(sanitized);
    } catch (err) {
        console.error('Error fetching client product by id:', err);
        res.status(500).json({ message: 'Error fetching client product' });
    }
};

// Assign a product to a client (admin/owner/pm only)
exports.assignProductToClient = async (req, res) => {
    try {
        const { clientId } = req.params;
        const {
            productId,
            customPrice,
            paidAmount = 0,
            workStatus = 'not_started',
            progress,
            startDate,
            dueDate,
            assignedTo = [],
            customizations = '',
            tasks = [],
            milestones = [],
            status = 'active',
            initialPaymentMethod = 'Bank Transfer',
            initialPaymentRef = '',
            initialPaymentNotes = ''
        } = req.body;

        const mongoose = require('mongoose');
        const sanitizedMilestones = Array.isArray(milestones) ? milestones.map(m => {
            const clean = { ...m };
            if (clean._id && !mongoose.Types.ObjectId.isValid(clean._id)) delete clean._id;
            if (clean.id && !mongoose.Types.ObjectId.isValid(clean.id)) delete clean.id;
            return clean;
        }) : [];

        const numPrice = Number(customPrice) || 0;
        let numPaid = Number(paidAmount) || 0;

        if (sanitizedMilestones.length > 0) {
            const milestonePaid = sanitizedMilestones.reduce((sum, m) => {
                if (m.paidAmount !== undefined && m.paidAmount > 0) return sum + m.paidAmount;
                if (m.paymentStatus === 'paid') return sum + (m.amount || 0);
                return sum;
            }, 0);
            if (milestonePaid > numPaid) numPaid = milestonePaid;
        }

        const paymentStatus = calculatePaymentStatus(numPrice, numPaid);

        let computedProgress = Number(progress);
        if (isNaN(computedProgress)) {
            if (sanitizedMilestones.length > 0) {
                const completedM = sanitizedMilestones.filter(m => m.completed || m.status === 'completed').length;
                computedProgress = Math.round((completedM / sanitizedMilestones.length) * 100);
            } else if (tasks.length > 0) {
                computedProgress = calculateTaskProgress(tasks);
            } else {
                computedProgress = 0;
            }
        }

        const paymentHistory = [];
        if (numPaid > 0) {
            paymentHistory.push({
                amount: numPaid,
                date: new Date(),
                paymentMethod: initialPaymentMethod,
                reference: initialPaymentRef,
                notes: initialPaymentNotes || 'Initial payment on assignment',
                recordedBy: req.user ? req.user._id : undefined
            });
        }

        const newClientProduct = new ClientProduct({
            client: clientId,
            product: productId,
            customPrice: numPrice,
            paidAmount: numPaid,
            paymentStatus,
            workStatus,
            progress: computedProgress,
            startDate: startDate ? new Date(startDate) : new Date(),
            dueDate: dueDate ? new Date(dueDate) : undefined,
            assignedTo: Array.isArray(assignedTo) ? assignedTo : [],
            customizations,
            tasks: Array.isArray(tasks) ? tasks : [],
            milestones: sanitizedMilestones,
            paymentHistory,
            status: status || 'active'
        });

        const saved = await newClientProduct.save();
        const populated = await ClientProduct.findById(saved._id)
            .populate('client', 'name email company status')
            .populate('product')
            .populate('assignedTo', 'name email avatar role')
            .populate('tasks.assignedTo', 'name email avatar')
            .populate('paymentHistory.recordedBy', 'name email');

        res.status(201).json(sanitizeForStaff(populated, req.user));
    } catch (err) {
        console.error('Error assigning product to client:', err);
        res.status(500).json({ message: err.message || 'Error assigning product to client' });
    }
};

// Update assigned product
exports.updateClientProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const cp = await ClientProduct.findById(id);
        if (!cp) {
            return res.status(404).json({ message: 'Assigned product not found' });
        }

        const isStaff = req.user && (req.user.role === 'employee' || req.user.role === 'developer' || req.user.role === 'designer');

        const {
            customPrice,
            paidAmount,
            workStatus,
            progress,
            startDate,
            dueDate,
            assignedTo,
            customizations,
            status,
            tasks,
            milestones
        } = req.body;

        // Staff cannot modify prices or payments
        if (!isStaff) {
            if (customPrice !== undefined) cp.customPrice = Number(customPrice);
            if (paidAmount !== undefined) cp.paidAmount = Number(paidAmount);
        }

        if (workStatus !== undefined) cp.workStatus = workStatus;
        if (startDate !== undefined) cp.startDate = startDate ? new Date(startDate) : cp.startDate;
        if (dueDate !== undefined) cp.dueDate = dueDate ? new Date(dueDate) : undefined;
        if (assignedTo !== undefined && !isStaff) cp.assignedTo = assignedTo;
        if (customizations !== undefined) cp.customizations = customizations;
        if (status !== undefined && !isStaff) cp.status = status;
        if (tasks !== undefined && Array.isArray(tasks)) {
            cp.tasks = tasks;
        }

        if (milestones !== undefined && Array.isArray(milestones)) {
            const mongoose = require('mongoose');
            cp.milestones = milestones.map(m => {
                const clean = { ...m };
                if (clean._id && !mongoose.Types.ObjectId.isValid(clean._id)) delete clean._id;
                if (clean.id && !mongoose.Types.ObjectId.isValid(clean.id)) delete clean.id;
                return clean;
            });

            // Calculate milestone-based paid amount
            if (!isStaff) {
                const milestonePaid = cp.milestones.reduce((sum, m) => {
                    if (m.paidAmount !== undefined && m.paidAmount > 0) return sum + m.paidAmount;
                    if (m.paymentStatus === 'paid') return sum + (m.amount || 0);
                    return sum;
                }, 0);
                if (milestonePaid > 0) {
                    cp.paidAmount = milestonePaid;
                }
            }
        }

        // Calculate progress
        if (progress !== undefined && !isNaN(Number(progress))) {
            cp.progress = Math.min(100, Math.max(0, Number(progress)));
        } else if (cp.milestones && cp.milestones.length > 0) {
            const completedM = cp.milestones.filter(m => m.completed || m.status === 'completed').length;
            cp.progress = Math.round((completedM / cp.milestones.length) * 100);
        } else if (cp.tasks && cp.tasks.length > 0) {
            cp.progress = calculateTaskProgress(cp.tasks);
        }

        // Auto update workStatus if progress is 100% and it was in_progress or not_started
        if (cp.progress === 100 && (cp.workStatus === 'in_progress' || cp.workStatus === 'not_started')) {
            cp.workStatus = 'completed';
        }

        // Sync payment status (managers only)
        if (!isStaff) {
            cp.paymentStatus = calculatePaymentStatus(cp.customPrice, cp.paidAmount);
        }
        cp.updatedAt = new Date();

        await cp.save();

        const updated = await ClientProduct.findById(id)
            .populate('client', 'name email company status')
            .populate('product')
            .populate('assignedTo', 'name email avatar role')
            .populate('tasks.assignedTo', 'name email avatar')
            .populate('paymentHistory.recordedBy', 'name email');

        res.status(200).json(sanitizeForStaff(updated, req.user));
    } catch (err) {
        console.error('Error updating client product:', err);
        res.status(500).json({ message: err.message || 'Error updating client product' });
    }
};

// Add Task to Client Product
exports.addTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, dueDate, assignedTo, status = 'pending' } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ message: 'Task title is required' });
        }

        const cp = await ClientProduct.findById(id);
        if (!cp) {
            return res.status(404).json({ message: 'Assigned product not found' });
        }

        cp.tasks.push({
            title: title.trim(),
            description: description || '',
            dueDate: dueDate ? new Date(dueDate) : undefined,
            assignedTo: assignedTo || undefined,
            status,
            completedAt: status === 'completed' ? new Date() : undefined
        });

        // Recalculate progress
        cp.progress = calculateTaskProgress(cp.tasks);
        if (cp.progress > 0 && cp.workStatus === 'not_started') {
            cp.workStatus = 'in_progress';
        }
        cp.updatedAt = new Date();

        await cp.save();

        const populated = await ClientProduct.findById(id)
            .populate('client', 'name email company status')
            .populate('product')
            .populate('assignedTo', 'name email avatar role')
            .populate('tasks.assignedTo', 'name email avatar')
            .populate('paymentHistory.recordedBy', 'name email');

        res.status(201).json(sanitizeForStaff(populated, req.user));
    } catch (err) {
        console.error('Error adding task to client product:', err);
        res.status(500).json({ message: err.message || 'Error adding task' });
    }
};

// Update Task in Client Product (or toggle status)
exports.updateTask = async (req, res) => {
    try {
        const { id, taskId } = req.params;
        const { title, description, status, dueDate, assignedTo } = req.body;

        const cp = await ClientProduct.findById(id);
        if (!cp) {
            return res.status(404).json({ message: 'Assigned product not found' });
        }

        const task = cp.tasks.id(taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        if (title !== undefined) task.title = title.trim();
        if (description !== undefined) task.description = description;
        if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : undefined;
        if (assignedTo !== undefined) task.assignedTo = assignedTo || undefined;
        if (status !== undefined) {
            task.status = status;
            if (status === 'completed') {
                task.completedAt = new Date();
            } else {
                task.completedAt = undefined;
            }
        }

        // Recalculate progress
        cp.progress = calculateTaskProgress(cp.tasks);
        if (cp.progress === 100 && (cp.workStatus === 'in_progress' || cp.workStatus === 'not_started')) {
            cp.workStatus = 'completed';
        } else if (cp.progress > 0 && cp.progress < 100 && cp.workStatus === 'not_started') {
            cp.workStatus = 'in_progress';
        }
        cp.updatedAt = new Date();

        await cp.save();

        const populated = await ClientProduct.findById(id)
            .populate('client', 'name email company status')
            .populate('product')
            .populate('assignedTo', 'name email avatar role')
            .populate('tasks.assignedTo', 'name email avatar')
            .populate('paymentHistory.recordedBy', 'name email');

        res.status(200).json(sanitizeForStaff(populated, req.user));
    } catch (err) {
        console.error('Error updating task in client product:', err);
        res.status(500).json({ message: err.message || 'Error updating task' });
    }
};

// Delete Task from Client Product
exports.deleteTask = async (req, res) => {
    try {
        const { id, taskId } = req.params;
        const cp = await ClientProduct.findById(id);
        if (!cp) {
            return res.status(404).json({ message: 'Assigned product not found' });
        }

        cp.tasks = cp.tasks.filter(t => t._id.toString() !== taskId);
        cp.progress = cp.tasks.length > 0 ? calculateTaskProgress(cp.tasks) : cp.progress;
        cp.updatedAt = new Date();

        await cp.save();

        const populated = await ClientProduct.findById(id)
            .populate('client', 'name email company status')
            .populate('product')
            .populate('assignedTo', 'name email avatar role')
            .populate('tasks.assignedTo', 'name email avatar')
            .populate('paymentHistory.recordedBy', 'name email');

        res.status(200).json(sanitizeForStaff(populated, req.user));
    } catch (err) {
        console.error('Error deleting task from client product:', err);
        res.status(500).json({ message: err.message || 'Error deleting task' });
    }
};

// Record Payment Installment (Admin / Owner only)
exports.recordPayment = async (req, res) => {
    try {
        if (req.user && req.user.role !== 'admin' && req.user.role !== 'owner') {
            return res.status(403).json({ message: 'Access denied. Only administrators can record payments.' });
        }

        const { id } = req.params;
        const { amount, paymentMethod, reference, notes, date } = req.body;

        const numAmount = Number(amount);
        if (!numAmount || numAmount <= 0) {
            return res.status(400).json({ message: 'Valid payment amount is required' });
        }

        const cp = await ClientProduct.findById(id);
        if (!cp) {
            return res.status(404).json({ message: 'Assigned product not found' });
        }

        cp.paymentHistory.push({
            amount: numAmount,
            date: date ? new Date(date) : new Date(),
            paymentMethod: paymentMethod || 'Bank Transfer',
            reference: reference || '',
            notes: notes || '',
            recordedBy: req.user ? req.user._id : undefined
        });

        cp.paidAmount = (cp.paidAmount || 0) + numAmount;
        cp.paymentStatus = calculatePaymentStatus(cp.customPrice, cp.paidAmount);
        cp.updatedAt = new Date();

        await cp.save();

        const populated = await ClientProduct.findById(id)
            .populate('client', 'name email company status')
            .populate('product')
            .populate('assignedTo', 'name email avatar role')
            .populate('tasks.assignedTo', 'name email avatar')
            .populate('paymentHistory.recordedBy', 'name email');

        res.status(201).json(sanitizeForStaff(populated, req.user));
    } catch (err) {
        console.error('Error recording payment for client product:', err);
        res.status(500).json({ message: err.message || 'Error recording payment' });
    }
};

// Delete Payment Installment (Admin / Owner only)
exports.deletePayment = async (req, res) => {
    try {
        if (req.user && req.user.role !== 'admin' && req.user.role !== 'owner') {
            return res.status(403).json({ message: 'Access denied. Only administrators can delete payments.' });
        }

        const { id, paymentId } = req.params;
        const cp = await ClientProduct.findById(id);
        if (!cp) {
            return res.status(404).json({ message: 'Assigned product not found' });
        }

        const payment = cp.paymentHistory.id(paymentId);
        const removedAmount = payment ? payment.amount : 0;

        cp.paymentHistory = cp.paymentHistory.filter(p => p._id.toString() !== paymentId);
        cp.paidAmount = Math.max(0, (cp.paidAmount || 0) - removedAmount);
        cp.paymentStatus = calculatePaymentStatus(cp.customPrice, cp.paidAmount);
        cp.updatedAt = new Date();

        await cp.save();

        const populated = await ClientProduct.findById(id)
            .populate('client', 'name email company status')
            .populate('product')
            .populate('assignedTo', 'name email avatar role')
            .populate('tasks.assignedTo', 'name email avatar')
            .populate('paymentHistory.recordedBy', 'name email');

        res.status(200).json(sanitizeForStaff(populated, req.user));
    } catch (err) {
        console.error('Error deleting payment from client product:', err);
        res.status(500).json({ message: err.message || 'Error deleting payment' });
    }
};

// Remove assigned product
exports.removeClientProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await ClientProduct.findByIdAndDelete(id);
        
        if (!deleted) {
            return res.status(404).json({ message: 'Assigned product not found' });
        }
        res.status(200).json({ message: 'Assigned product removed successfully' });
    } catch (err) {
        console.error('Error removing client product:', err);
        res.status(500).json({ message: 'Error removing client product' });
    }
};
