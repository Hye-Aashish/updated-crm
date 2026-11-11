const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper to verify JWT token and load current DB user
const verifySocketUser = async (socket) => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token) return null;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded?.id) return null;
        const dbUser = await User.findById(decoded.id).select('_id name role clientId').lean();
        return dbUser || null;
    } catch (e) {
        return null;
    }
};

const isAdminUser = (user) => user && (user.role === 'admin' || user.role === 'owner');

module.exports = (io) => {
    // Stores mapping of user to their current streaming socket
    const activeStreams = new Map(); // userId -> { socketId, user }
    
    // Stores who is watching whom
    const watchers = new Map(); // socketId -> targetUserId

    io.on('connection', (socket) => {
        console.log(`[MONITOR] Socket ${socket.id} connected`);

        // A user starts streaming
        socket.on('start-streaming', async (userData) => {
            const dbUser = await verifySocketUser(socket);
            if (!dbUser || dbUser.role === 'client') {
                socket.emit('auth_error', { message: 'Authentication required to stream screen' });
                return;
            }

            const validUserId = dbUser._id.toString();
            console.log(`[MONITOR] User ${validUserId} started streaming`);
            activeStreams.set(validUserId, {
                socketId: socket.id,
                user: {
                    ...(userData && typeof userData === 'object' ? userData : {}),
                    _id: validUserId,
                    id: validUserId,
                    name: dbUser.name,
                    role: dbUser.role,
                    status: userData?.status || 'Working'
                }
            });
            io.emit('streamer-list-update', Array.from(activeStreams.values()).map(s => s.user));
        });

        // Update working status
        socket.on('status-update', async (data) => {
            const dbUser = await verifySocketUser(socket);
            if (!dbUser || dbUser.role === 'client') return;

            const validUserId = dbUser._id.toString();
            const stream = activeStreams.get(validUserId);
            if (stream) {
                stream.user.status = data?.status || stream.user.status;
                console.log(`[MONITOR] User ${validUserId} changed status to ${stream.user.status}`);
                io.emit('streamer-list-update', Array.from(activeStreams.values()).map(s => s.user));
            }
        });

        // A user sends a screen frame
        socket.on('screen-frame', async (data) => {
            const dbUser = await verifySocketUser(socket);
            if (!dbUser || dbUser.role === 'client') return;

            const validUserId = dbUser._id.toString();
            if (!data?.frame) return;
            io.to(`monitor-room-${validUserId}`).emit('screen-frame-update', data.frame);
        });

        // Admin wants to watch a user
        socket.on('watch-user', async (userId) => {
            const dbUser = await verifySocketUser(socket);
            if (!isAdminUser(dbUser)) {
                console.warn(`[SECURITY] Unauthorized watch-user attempt from socket ${socket.id}`);
                socket.emit('auth_error', { message: 'Unauthorized screen monitoring access' });
                return;
            }
            console.log(`[MONITOR] Admin ${dbUser.name} is now watching user ${userId}`);
            socket.join(`monitor-room-${userId}`);
            watchers.set(socket.id, userId);
        });

        // Admin wants the user to switch active screen
        socket.on('request-screen-change', async (data) => {
            const dbUser = await verifySocketUser(socket);
            if (!isAdminUser(dbUser)) {
                socket.emit('auth_error', { message: 'Unauthorized screen control request' });
                return;
            }
            const stream = activeStreams.get(data?.userId?.toString());
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
        socket.on('get-streamers', async () => {
            const dbUser = await verifySocketUser(socket);
            if (!isAdminUser(dbUser)) {
                socket.emit('auth_error', { message: 'Unauthorized streamer list request' });
                return;
            }
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
