const ChatConversation = require('../models/ChatConversation');
const ChatMessage = require('../models/ChatMessage');
const ChatWidget = require('../models/ChatWidget');
const jwt = require('jsonwebtoken');

// Helper to verify JWT token from socket
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
    io.on('connection', (socket) => {
        // console.log('Socket connected:', socket.id);

        // VISITOR: Start Conversation
        socket.on('start_conversation', async ({ token, message }, callback) => {
            try {
                const widget = await ChatWidget.findOne({ widget_token: token });
                if (!widget) return;

                const conversation = new ChatConversation({
                    widget_id: widget._id,
                    visitor_id: socket.id,
                    last_message: message,
                    unread_count: 1
                });
                await conversation.save();

                const chatMessage = new ChatMessage({
                    conversation_id: conversation._id,
                    sender_type: 'visitor',
                    message
                });
                await chatMessage.save();

                socket.join(conversation._id.toString());

                // Notify Admin
                io.to(`admin_${widget.user_id}`).emit('new_conversation', conversation);

                if (callback) callback({ conversationId: conversation._id });
            } catch (error) {
                console.error('Socket Error:', error);
            }
        });

        // VISITOR: Rejoin
        socket.on('visitor_join', ({ conversationId }) => {
            socket.join(conversationId);
        });

        // VISITOR: Send Message
        socket.on('visitor_message', async ({ conversationId, message }) => {
            try {
                const newMessage = new ChatMessage({
                    conversation_id: conversationId,
                    sender_type: 'visitor',
                    message
                });
                await newMessage.save();

                const conversation = await ChatConversation.findByIdAndUpdate(conversationId, {
                    last_message: message,
                    last_message_time: new Date(),
                    $inc: { unread_count: 1 }
                }, { new: true });

                // Emit to conversation room (so admin sees it if they are looking at this chat)
                io.to(conversationId).emit('message_received', newMessage);

                // Notify Admin List (for badge/list update)
                const widget = await ChatWidget.findById(conversation.widget_id);
                if (widget) {
                    io.to(`admin_${widget.user_id}`).emit('conversation_updated', conversation);
                }

            } catch (error) {
                console.error(error);
            }
        });

        // ADMIN: Join Dashboard (requires authentication)
        socket.on('admin_join', (userId) => {
            const user = verifySocketToken(socket);
            if (!user) {
                socket.emit('auth_error', { message: 'Authentication required' });
                return;
            }
            // Only allow joining your own admin room
            if (user.id !== userId) {
                socket.emit('auth_error', { message: 'Unauthorized' });
                return;
            }
            socket.join(`admin_${userId}`);
        });

        // ADMIN: View Conversation (requires authentication)
        socket.on('join_conversation', (conversationId) => {
            const user = verifySocketToken(socket);
            if (!user) {
                socket.emit('auth_error', { message: 'Authentication required' });
                return;
            }
            socket.join(conversationId);
        });

        // ADMIN: Send Message (requires authentication)
        socket.on('admin_message', async ({ conversationId, message, userId }) => {
            const user = verifySocketToken(socket);
            if (!user) {
                socket.emit('auth_error', { message: 'Authentication required' });
                return;
            }

            try {
                const newMessage = new ChatMessage({
                    conversation_id: conversationId,
                    sender_type: 'admin',
                    message,
                    is_read: true
                });
                await newMessage.save();

                await ChatConversation.findByIdAndUpdate(conversationId, {
                    last_message: message,
                    last_message_time: new Date(),
                    unread_count: 0 // Admin replied
                });

                // Emit to Visitor (in the room)
                io.to(conversationId).emit('admin_message', newMessage);

            } catch (error) {
                console.error(error);
            }
        });
    });
};
