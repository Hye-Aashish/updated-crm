const ProjectMessage = require('../models/ProjectMessage');
const Project = require('../models/Project');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Helper to verify JWT token and load current DB user
const verifySocketUser = async (socket) => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token) return null;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded?.id) return null;
        return await User.findById(decoded.id).select('_id name role clientId').lean();
    } catch (e) {
        return null;
    }
};

const userHasProjectAccess = async (dbUser, projectId) => {
    if (!dbUser || !projectId) return false;
    const project = await Project.findById(projectId).select('clientId pmId members developers designers').lean();
    if (!project) return false;
    if (dbUser.role === 'admin' || dbUser.role === 'owner') return true;
    if (dbUser.role === 'client') {
        const own = dbUser.clientId?.toString?.() || '';
        const projClient = project.clientId?.toString?.() || '';
        return Boolean(own && own === projClient);
    }
    const uid = dbUser._id.toString();
    const hasId = (arr) => Array.isArray(arr) && arr.map(String).includes(uid);
    return (
        String(project.pmId || '') === uid ||
        hasId(project.members) ||
        hasId(project.developers) ||
        hasId(project.designers)
    );
};

module.exports = (io) => {
    io.on('connection', (socket) => {

        // Join a Project Room
        socket.on('join_project_chat', async (projectId) => {
            if (!projectId) return;
            const dbUser = await verifySocketUser(socket);
            const allowed = await userHasProjectAccess(dbUser, projectId);
            if (!allowed) {
                socket.emit('auth_error', { message: 'Not authorized to join this project chat' });
                return;
            }
            socket.join(`project_${projectId}`);
            console.log(`[Socket] User ${dbUser._id} joined project chat: ${projectId}`);
        });

        // Leave a Project Room
        socket.on('leave_project_chat', (projectId) => {
            if (projectId) socket.leave(`project_${projectId}`);
        });

        // Send Message to Project Room
        socket.on('send_project_message', async (data) => {
            try {
                const { projectId, message, attachments } = data || {};
                if (!projectId) return;

                const dbUser = await verifySocketUser(socket);
                const allowed = await userHasProjectAccess(dbUser, projectId);
                if (!allowed) {
                    socket.emit('auth_error', { message: 'Not authorized to message this project' });
                    return;
                }

                const newMessage = new ProjectMessage({
                    projectId,
                    senderId: dbUser._id.toString(),
                    senderName: dbUser.name || 'User',
                    senderRole: dbUser.role || 'member',
                    message: message || '',
                    attachments: Array.isArray(attachments) ? attachments : []
                });

                await newMessage.save();

                // Broadcast to everyone in the project room
                io.to(`project_${projectId}`).emit('project_message_received', newMessage);
            } catch (error) {
                console.error('Project Socket Error:', error);
            }
        });

        // Delete message event
        socket.on('delete_project_message', async (data) => {
            try {
                const { messageId, projectId } = data || {};
                if (!messageId || !projectId) return;

                const dbUser = await verifySocketUser(socket);
                const allowed = await userHasProjectAccess(dbUser, projectId);
                if (!allowed) {
                    socket.emit('auth_error', { message: 'Not authorized to delete messages here' });
                    return;
                }

                const msg = await ProjectMessage.findById(messageId);
                if (!msg || String(msg.projectId) !== String(projectId)) return;

                const isPrivileged = dbUser.role === 'admin' || dbUser.role === 'owner';
                if (!isPrivileged && String(msg.senderId) !== dbUser._id.toString()) {
                    socket.emit('auth_error', { message: 'Can only delete your own messages' });
                    return;
                }

                await ProjectMessage.findByIdAndDelete(messageId);
                io.to(`project_${projectId}`).emit('project_message_deleted', messageId);
            } catch (error) {
                console.error('Socket Delete Error:', error);
            }
        });
    });
};
