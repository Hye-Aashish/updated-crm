module.exports = (io) => {
    // Stores mapping of user to their current streaming socket
    const activeStreams = new Map(); // userId -> { socketId, user }
    
    // Stores who is watching whom
    const watchers = new Map(); // socketId -> targetUserId

    io.on('connection', (socket) => {
        console.log(`[MONITOR] Socket ${socket.id} connected`);

        // A user (from Electron) starts streaming
        socket.on('start-streaming', (userData) => {
            console.log(`[MONITOR] User ${userData.id} started streaming`);
            activeStreams.set(userData.id, {
                socketId: socket.id,
                user: userData
            });
            io.emit('streamer-list-update', Array.from(activeStreams.values()).map(s => s.user));
        });

        // Update working status
        socket.on('status-update', (data) => {
            // data: { userId, status: 'Working' | 'On Break' }
            console.log(`[MONITOR] User ${data.userId} changed status to ${data.status}`);
            const stream = activeStreams.get(data.userId);
            if (stream) {
                stream.user.status = data.status;
                io.emit('streamer-list-update', Array.from(activeStreams.values()).map(s => s.user));
            }
        });

        // A user sends a screen frame
        socket.on('screen-frame', (data) => {
            // data: { userId, frame, status }
            io.to(`monitor-room-${data.userId}`).emit('screen-frame-update', data.frame);
        });

        // Admin wants to watch a user
        socket.on('watch-user', (userId) => {
            console.log(`[MONITOR] Admin ${socket.id} is now watching user ${userId}`);
            socket.join(`monitor-room-${userId}`);
            watchers.set(socket.id, userId);
        });

        // Admin wants the user to switch active screen
        socket.on('request-screen-change', (data) => {
            const stream = activeStreams.get(data.userId);
            if (stream) {
                io.to(stream.socketId).emit('change-active-screen', data.screenId);
            }
        });

        // An Admin stops watching
        socket.on('stop-watching', (userId) => {
            socket.leave(`monitor-room-${userId}`);
            watchers.delete(socket.id);
        });

        // Admin asks for current streamers
        socket.on('get-streamers', () => {
            socket.emit('streamer-list-update', Array.from(activeStreams.values()).map(s => s.user));
        });

        socket.on('disconnect', () => {
            for (const [userId, stream] of activeStreams.entries()) {
                if (stream.socketId === socket.id) {
                    activeStreams.delete(userId);
                    io.emit('streamer-list-update', Array.from(activeStreams.values()).map(s => s.user));
                    break;
                }
            }
            watchers.delete(socket.id);
        });
    });
};
