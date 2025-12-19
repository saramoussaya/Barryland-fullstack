const express = require('express');
const router = express.Router();
const { auth, optionalAuth } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const ContactMessage = require('../models/ContactMessage');
const { sendEmail } = require('../utils/email');

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

// Check if current user/email already contacted a property
// GET /api/messages/contacted/:propertyId?email=optional
router.get('/contacted/:propertyId', optionalAuth, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const emailQuery = req.query.email ? String(req.query.email).trim().toLowerCase() : undefined;

    const filter = { property: propertyId };

    if (req.user && req.user.id) {
      // look for messages by user id or by user's email
      filter.$or = [{ user: req.user.id }];
      if (req.user.email) filter.$or.push({ email: String(req.user.email).trim().toLowerCase() });
    } else if (emailQuery) {
      filter.email = emailQuery;
    } else {
      // no identifier provided; cannot assert existence
      return res.status(200).json({ alreadyContacted: false });
    }

    const exists = await ContactMessage.exists(filter);
    return res.status(200).json({ alreadyContacted: !!exists });
  } catch (err) {
    console.error('Error checking contacted status:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Public contact form endpoint
// POST /api/messages/contact
router.post('/contact', optionalAuth, async (req, res) => {
  try {
    console.log('REQ.BODY FINAL :', req.body);
    // keep older debug info for troubleshooting
    console.log('BODY REÇU :', req.body);
    console.log('Contact POST headers:', req.headers['content-type']);
    console.log('Contact POST body keys:', Object.keys(req.body || {}));

    // Accept multiple possible names for the message field (message, body, msg)
    const bodyData = req.body || {};
    const messageFromMessageKey = typeof bodyData.message === 'string' ? bodyData.message : undefined;
    const altMessage = (bodyData.body || bodyData.msg);
    const message = (messageFromMessageKey !== undefined ? messageFromMessageKey : altMessage || '').toString().trim();

    // Validate only message (other fields are optional; frontend may not send them)
    if (!message || message.length === 0) {
      console.warn('Contact message validation failed: message empty - received body:', req.body);
      return res.status(400).json({ success: false, message: 'Message vide' });
    }

    const firstName = bodyData.firstName || bodyData.firstname || undefined;
    const lastName = bodyData.lastName || bodyData.lastname || undefined;
    const email = bodyData.email || undefined;
    const phone = bodyData.phone || undefined;
    const propertyId = bodyData.propertyId || bodyData.property || bodyData.property_id;

    const contact = await ContactMessage.create({
      user: req.user && req.user.id ? req.user.id : undefined,
      firstName: firstName ? String(firstName).trim() : undefined,
      lastName: lastName ? String(lastName).trim() : undefined,
      email: email ? String(email).trim().toLowerCase() : undefined,
      phone: phone ? String(phone).trim() : undefined,
      property: propertyId && String(propertyId).match(/^[0-9a-fA-F]{24}$/) ? propertyId : undefined,
      message: message
    });

    // Send confirmation email to the sender (non-blocking). Do not fail the request on email errors.
    if (contact.email) {
      (async () => {
        try {
          // attempt to fetch property title if available
          let propertyTitle;
          if (contact.property) {
            try {
              const Property = require('../models/Property');
              const p = await Property.findById(contact.property).select('title').lean();
              propertyTitle = p?.title;
            } catch (e) {
              // ignore property fetch errors
              propertyTitle = undefined;
            }
          }

          await sendEmail({
            to: contact.email,
            template: 'contact-confirmation',
            data: {
              firstName: contact.firstName || '',
              name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
              propertyTitle: propertyTitle
            }
          });
        } catch (emailErr) {
          console.error('Erreur envoi email confirmation contact:', emailErr);
        }
      })();
    }

    // Respond with minimal success payload as requested
    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('Error saving contact message:', err);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'enregistrement du message' });
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

