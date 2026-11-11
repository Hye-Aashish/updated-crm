const ChatConversation = require('../models/ChatConversation');
const ChatMessage = require('../models/ChatMessage');
const ChatWidget = require('../models/ChatWidget');
const User = require('../models/User');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Helper to verify JWT token and load current DB user
const verifySocketUser = async (socket) => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token) return null;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded?.id) return null;
        return await User.findById(decoded.id).select('_id name role').lean();
    } catch (e) {
        return null;
    }
};

const canAccessWidget = (dbUser, widget) => {
    if (!dbUser || dbUser.role === 'client') return false;
    if (dbUser.role === 'admin' || dbUser.role === 'owner') return true;
    return widget && String(widget.user_id) === dbUser._id.toString();
};

module.exports = (io) => {
    io.on('connection', (socket) => {
        socket.data.visitorConversations = new Set();

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

                const convId = conversation._id.toString();
                socket.data.visitorConversations.add(convId);
                socket.join(convId);

                // Notify Admin
                io.to(`admin_${widget.user_id}`).emit('new_conversation', conversation);

                if (callback) callback({ conversationId: conversation._id });
            } catch (error) {
                console.error('Socket Error:', error);
            }
        });

        // VISITOR: Rejoin
        socket.on('visitor_join', async ({ conversationId, token }) => {
            try {
                if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) return;
                const conv = await ChatConversation.findById(conversationId).select('widget_id').lean();
                if (!conv) return;
                if (token) {
                    const widget = await ChatWidget.findById(conv.widget_id).select('widget_token').lean();
                    if (!widget || widget.widget_token !== token) return;
                }
                socket.data.visitorConversations.add(conversationId.toString());
                socket.join(conversationId.toString());
            } catch (err) {
                console.error('visitor_join error:', err.message);
            }
        });

        // VISITOR: Send Message
        socket.on('visitor_message', async ({ conversationId, message }) => {
            try {
                if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) return;
                if (!socket.data.visitorConversations.has(conversationId.toString())) return;

                const existing = await ChatConversation.findById(conversationId).select('widget_id').lean();
                if (!existing) return;

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
        socket.on('admin_join', async (userId) => {
            const dbUser = await verifySocketUser(socket);
            if (!dbUser || dbUser.role === 'client') {
                socket.emit('auth_error', { message: 'Authentication required' });
                return;
            }
            if (dbUser._id.toString() !== String(userId)) {
                socket.emit('auth_error', { message: 'Unauthorized' });
                return;
            }
            socket.join(`admin_${dbUser._id.toString()}`);
        });

        // ADMIN: View Conversation (requires authentication & widget ownership)
        socket.on('join_conversation', async (conversationId) => {
            const dbUser = await verifySocketUser(socket);
            if (!dbUser || dbUser.role === 'client') {
                socket.emit('auth_error', { message: 'Authentication required' });
                return;
            }
            const conv = await ChatConversation.findById(conversationId).select('widget_id').lean();
            if (!conv) return;
            const widget = await ChatWidget.findById(conv.widget_id).select('user_id').lean();
            if (!canAccessWidget(dbUser, widget)) {
                socket.emit('auth_error', { message: 'Unauthorized conversation access' });
                return;
            }
            socket.join(conversationId.toString());
        });

        // ADMIN: Send Message (requires authentication & widget ownership)
        socket.on('admin_message', async ({ conversationId, message }) => {
            const dbUser = await verifySocketUser(socket);
            if (!dbUser || dbUser.role === 'client') {
                socket.emit('auth_error', { message: 'Authentication required' });
                return;
            }

            try {
                const conv = await ChatConversation.findById(conversationId).select('widget_id').lean();
                if (!conv) return;
                const widget = await ChatWidget.findById(conv.widget_id).select('user_id').lean();
                if (!canAccessWidget(dbUser, widget)) {
                    socket.emit('auth_error', { message: 'Unauthorized conversation access' });
                    return;
                }

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
                    unread_count: 0
                });

                // Emit to Visitor (in the room)
                io.to(conversationId).emit('admin_message', newMessage);

            } catch (error) {
                console.error(error);
            }
        });
    });
};
