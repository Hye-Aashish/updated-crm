const ProjectMessage = require('../models/ProjectMessage');

module.exports = (io) => {
    io.on('connection', (socket) => {

        // Join a Project Room
        socket.on('join_project_chat', (projectId) => {
            socket.join(`project_${projectId}`);
            console.log(`[Socket] User ${socket.id} joined project chat: ${projectId}`);
        });

        // Leave a Project Room
        socket.on('leave_project_chat', (projectId) => {
            socket.leave(`project_${projectId}`);
        });

        // Send Message to Project Room
        socket.on('send_project_message', async (data) => {
            console.log('[Socket] Received project message:', data);
            try {
                const { projectId, senderId, senderName, senderRole, message, attachments } = data;

                if (!projectId || !senderId) {
                    console.error('[Socket] Missing projectId or senderId');
                    return;
                }

                const newMessage = new ProjectMessage({
                    projectId,
                    senderId,
                    senderName,
                    senderRole,
                    message,
                    attachments: attachments || []
                });

                await newMessage.save();
                console.log('[Socket] Message saved to DB:', newMessage._id);

                // Broadcast to everyone in the project room
                io.to(`project_${projectId}`).emit('project_message_received', newMessage);
                console.log(`[Socket] Message broadcast to room: project_${projectId}`);

            } catch (error) {
                console.error('Project Socket Error:', error);
            }
        });
    });
};
