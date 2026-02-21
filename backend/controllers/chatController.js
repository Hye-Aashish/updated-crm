const ChatWidget = require('../models/ChatWidget');
const ChatConversation = require('../models/ChatConversation');
const ChatMessage = require('../models/ChatMessage');
const { v4: uuidv4 } = require('uuid');

// Widget Controller
exports.createWidget = async (req, res) => {
    try {
        const { widget_name, website_url, primary_color } = req.body;
        const newWidget = new ChatWidget({
            user_id: req.user.id,
            widget_name,
            website_url,
            primary_color,
            widget_token: uuidv4()
        });
        const savedWidget = await newWidget.save();
        res.status(201).json(savedWidget);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getWidgets = async (req, res) => {
    try {
        const widgets = await ChatWidget.find({ user_id: req.user.id });
        res.status(200).json(widgets);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getWidgetConfig = async (req, res) => {
    try {
        const { token } = req.params;
        const widget = await ChatWidget.findOne({ widget_token: token });
        if (!widget) return res.status(404).json({ message: 'Widget not found' });

        res.status(200).json({
            widget_id: widget._id,
            widget_name: widget.widget_name,
            primary_color: widget.primary_color,

        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Conversation Controller
exports.getConversations = async (req, res) => {
    try {
        // Find widgets owned by user
        const userWidgets = await ChatWidget.find({ user_id: req.user.id }).distinct('_id');

        const conversations = await ChatConversation.find({ widget_id: { $in: userWidgets } })
            .sort({ last_message_time: -1 });

        res.status(200).json(conversations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;

        // Verify ownership
        const userWidgets = await ChatWidget.find({ user_id: req.user.id }).distinct('_id');
        const conversation = await ChatConversation.findOne({
            _id: conversationId,
            widget_id: { $in: userWidgets }
        });

        if (!conversation && req.user.role !== 'admin' && req.user.role !== 'owner') {
            return res.status(403).json({ message: 'Not authorized to view this conversation' });
        }

        const messages = await ChatMessage.find({ conversation_id: conversationId }).sort({ timestamp: 1 });
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.replyMessage = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { message } = req.body;

        // Verify ownership
        const userWidgets = await ChatWidget.find({ user_id: req.user.id }).distinct('_id');
        const conversation = await ChatConversation.findOne({
            _id: conversationId,
            widget_id: { $in: userWidgets }
        });

        if (!conversation && req.user.role !== 'admin' && req.user.role !== 'owner') {
            return res.status(403).json({ message: 'Not authorized to reply to this conversation' });
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
            status: 'open'
        });

        res.status(201).json(newMessage);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
