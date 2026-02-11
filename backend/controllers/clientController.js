const Client = require('../models/Client');
const Project = require('../models/Project');

exports.getClients = async (req, res, next) => {
    try {
        let filter = {};
        if (req.user && req.user.role !== 'admin' && req.user.role !== 'owner') {
            const userId = req.user._id.toString();

            // Clients assigned to me
            // OR Clients for projects where I am PM or member
            const myProjects = await Project.find({
                $or: [{ pmId: userId }, { members: userId }]
            }).select('clientId');
            const myProjectClientIds = myProjects.map(p => p.clientId);

            filter = {
                $or: [
                    { assignedTo: userId },
                    { _id: { $in: myProjectClientIds } }
                ]
            };
        }
        const clients = await Client.find(filter).sort({ createdAt: -1 });
        res.json(clients);
    } catch (err) {
        next(err);
    }
};

exports.getClientById = async (req, res, next) => {
    try {
        const client = await Client.findById(req.params.id);
        if (!client) return res.status(404).json({ message: 'Client not found' });

        if (req.user && req.user.role !== 'admin' && req.user.role !== 'owner') {
            const userId = req.user._id.toString();
            if (client.assignedTo !== userId) {
                // Secondary check: Are they working on any of this client's projects?
                const hasProject = await Project.findOne({
                    clientId: client._id.toString(),
                    $or: [{ pmId: userId }, { members: userId }]
                });

                if (!hasProject) {
                    return res.status(403).json({ message: 'Not authorized to view this client' });
                }
            }
        }
        res.json(client);
    } catch (err) {
        next(err);
    }
};

exports.createClient = async (req, res, next) => {
    try {
        const clientData = { ...req.body };
        if (req.user && !clientData.assignedTo) {
            clientData.assignedTo = req.user._id.toString();
        }
        const client = new Client(clientData);
        const newClient = await client.save();

        // Trigger Notification
        try {
            const Notification = require('../models/Notification');
            await Notification.create({
                title: 'New Client Registered',
                message: `Client "${newClient.company}" has been added to the system.`,
                type: 'new_client',
                relatedId: newClient._id
            });
        } catch (nErr) { console.error('Notif Error:', nErr); }

        res.status(201).json(newClient);
    } catch (err) {
        next(err);
    }
};

exports.updateClient = async (req, res, next) => {
    try {
        const client = await Client.findById(req.params.id);
        if (!client) return res.status(404).json({ message: 'Client not found' });

        // RBAC Check
        if (req.user && req.user.role !== 'admin' && req.user.role !== 'owner') {
            const userId = req.user._id.toString();
            if (client.assignedTo !== userId) {
                const hasProject = await Project.findOne({
                    clientId: client._id.toString(),
                    $or: [{ pmId: userId }, { members: userId }]
                });
                if (!hasProject) {
                    return res.status(403).json({ message: 'Not authorized to update this client' });
                }
            }
        }

        const updatedClient = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedClient);
    } catch (err) {
        next(err);
    }
};

exports.deleteClient = async (req, res, next) => {
    try {
        const deletedClient = await Client.findByIdAndDelete(req.params.id);
        if (!deletedClient) return res.status(404).json({ message: 'Client not found' });
        res.json({ message: 'Client deleted' });
    } catch (err) {
        next(err);
    }
};
