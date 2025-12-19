const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

// GET /api/messages/conversations - list user's conversations
router.get('/conversations', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const convos = await Conversation.find({ participants: userId }).sort({ updatedAt: -1 }).limit(50).lean();
    // populate basic participant info
    const populated = await Promise.all(convos.map(async (c) => {
      const participants = await User.find({ _id: { $in: c.participants } }).select('firstName lastName email avatar');
      return { ...c, participants };
    }));
    res.json({ success: true, data: { conversations: populated } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des conversations' });
  }
});

// GET /api/messages/:conversationId - get messages for a conversation
router.get('/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await Message.find({ conversation: conversationId }).sort({ createdAt: 1 }).populate('sender', 'firstName lastName avatar');
    res.json({ success: true, data: { messages } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des messages' });
  }
});

// POST /api/messages/:conversationId - send a message
router.post('/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { body } = req.body;
    if (!body || typeof body !== 'string') {
      return res.status(400).json({ success: false, message: 'Message vide' });
    }

    const msg = await Message.create({ conversation: conversationId, sender: req.user.id, body });
    // update conversation lastMessage
    await Conversation.findByIdAndUpdate(conversationId, { lastMessage: body, updatedAt: new Date() });

    const populated = await msg.populate('sender', 'firstName lastName avatar');
    res.status(201).json({ success: true, data: { message: populated } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'envoi du message' });
  }
});

module.exports = router;
