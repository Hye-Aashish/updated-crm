const jwt = require('jsonwebtoken');

// Helper to verify JWT token from socket handshake or auth object
const verifySocketToken = (socket) => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token) return null;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded;
    } catch (e) {
        return null;
    }
};

module.exports = (io) => {
    // Stores mapping of user to their current streaming socket
    const activeStreams = new Map(); // userId -> { socketId, user }
    
    // Stores who is watching whom
    const watchers = new Map(); // socketId -> targetUserId

    io.on('connection', (socket) => {
        console.log(`[MONITOR] Socket ${socket.id} connected`);

        // A user (from Electron) starts streaming
        socket.on('start-streaming', (userData) => {
            const user = verifySocketToken(socket);
            // Allow streaming from logged-in users or valid desktop agent data
            const validUserId = user ? (user.id || user._id) : (userData.id || userData._id);
            if (!validUserId) return;

            console.log(`[MONITOR] User ${validUserId} started streaming`);
            activeStreams.set(validUserId.toString(), {
                socketId: socket.id,
                user: userData
            });
            io.emit('streamer-list-update', Array.from(activeStreams.values()).map(s => s.user));
        });

        // Update working status
        socket.on('status-update', (data) => {
            // data: { userId, status: 'Working' | 'On Break' }
            console.log(`[MONITOR] User ${data.userId} changed status to ${data.status}`);
            const stream = activeStreams.get(data.userId?.toString());
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
            const user = verifySocketToken(socket);
            if (!user && process.env.NODE_ENV === 'production') {
                console.warn(`[SECURITY] Unauthorized watch-user attempt from socket ${socket.id}`);
                socket.emit('auth_error', { message: 'Unauthorized screen monitoring access' });
                return;
            }
            console.log(`[MONITOR] Admin ${user?.name || socket.id} is now watching user ${userId}`);
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
