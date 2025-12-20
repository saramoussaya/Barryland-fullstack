const express = require('express');
const router = express.Router();
const { auth, optionalAuth, authorize } = require('../middleware/auth');
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

// GET /api/messages - list messages according to role
// Admin: all, Professional/owner: messages for their properties, Client: own messages
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, propertyId, status } = req.query;
    const p = Math.max(1, parseInt(String(page), 10) || 1);
    const l = Math.max(1, Math.min(200, parseInt(String(limit), 10) || 20));

    const filter = {};
    if (status) filter.status = status;
    if (propertyId && String(propertyId).match(/^[0-9a-fA-F]{24}$/)) filter.property = propertyId;

    // Role-agnostic owner check: admin sees all; otherwise only messages for properties owned by the current user
    const role = req.user && req.user.role;
    if (role === 'admin') {
      // admin can see all
    } else {
      // find properties owned by this user (ownerId match) regardless of user role
      try {
        const Property = require('../models/Property');
        const owned = await Property.find({ owner: req.user.id }).select('_id').lean();
        const ownedIds = owned.map(o => String(o._id));
        if (!ownedIds.length) {
          // user does not own any property -> deny access
          return res.status(403).json({ success: false, message: 'Accès refusé' });
        }
        filter.property = filter.property && ownedIds.includes(String(filter.property)) ? filter.property : { $in: ownedIds };
      } catch (e) {
        console.error('Error fetching owned properties for messages:', e);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
      }
    }

    const total = await ContactMessage.countDocuments(filter);
    const data = await ContactMessage.find(filter)
      .sort({ createdAt: -1 })
      .skip((p - 1) * l)
      .limit(l)
      .select('firstName lastName email phone property message createdAt status')
      .populate('property', 'title')
      .lean();

    return res.json({ success: true, data, total, page: p, limit: l });
  } catch (err) {
    console.error('Error listing contact messages (role):', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ADMIN: list contact messages with filters
// GET /api/messages/admin
router.get('/admin', auth, authorize(['admin', 'professional']), async (req, res) => {
  try {
    const { propertyId, status, page = 1, limit = 20 } = req.query;
    const p = Math.max(1, parseInt(String(page), 10) || 1);
    const l = Math.max(1, Math.min(100, parseInt(String(limit), 10) || 20));

    const filter = {};
    if (propertyId && String(propertyId).match(/^[0-9a-fA-F]{24}$/)) filter.property = propertyId;
    if (status) filter.status = status;

    const total = await ContactMessage.countDocuments(filter);
    const data = await ContactMessage.find(filter)
      .sort({ createdAt: -1 })
      .skip((p - 1) * l)
      .limit(l)
      .populate('property', 'title')
      .lean();

    return res.json({ success: true, data, total, page: p, limit: l });
  } catch (err) {
    console.error('Error listing contact messages:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ADMIN: get message detail
// GET /api/messages/admin/:id
router.get('/admin/:id', auth, authorize(['admin', 'professional']), async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !String(id).match(/^[0-9a-fA-F]{24}$/)) return res.status(400).json({ success: false, message: 'Id invalide' });
    const msg = await ContactMessage.findById(id).populate('property', 'title').lean();
    if (!msg) return res.status(404).json({ success: false, message: 'Message non trouvé' });
    return res.json({ success: true, data: msg });
  } catch (err) {
    console.error('Error getting contact message:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ADMIN: update message (status/read)
// PATCH /api/messages/admin/:id
router.patch('/admin/:id', auth, authorize(['admin', 'professional']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, read } = req.body;
    if (!id || !String(id).match(/^[0-9a-fA-F]{24}$/)) return res.status(400).json({ success: false, message: 'Id invalide' });
    const update = {};
    if (typeof status === 'string') update.status = status;
    if (typeof read === 'boolean') update.read = read;
    if (Object.keys(update).length === 0) return res.status(400).json({ success: false, message: 'Rien à mettre à jour' });

    const updated = await ContactMessage.findByIdAndUpdate(id, update, { new: true }).populate('property', 'title').lean();
    if (!updated) return res.status(404).json({ success: false, message: 'Message non trouvé' });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error updating contact message:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/messages/:conversationId - get messages for a conversation
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

// GET /api/messages/:id - detail (role-aware)
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !String(id).match(/^[0-9a-fA-F]{24}$/)) return res.status(400).json({ success: false, message: 'Id invalide' });
    const msg = await ContactMessage.findById(id).select('firstName lastName email phone property message createdAt status').populate('property', 'title owner').lean();
    if (!msg) return res.status(404).json({ success: false, message: 'Message non trouvé' });
    const role = req.user && req.user.role;
    if (role === 'admin') {
      return res.json({ success: true, data: msg });
    }

    // For non-admin users allow only if they are the owner of the property (ownerId match)
    if (msg.property && msg.property.owner && String(msg.property.owner) === String(req.user.id)) {
      return res.json({ success: true, data: msg });
    }

    return res.status(403).json({ success: false, message: 'Accès refusé' });
  } catch (err) {
    console.error('Error getting contact message (role-aware):', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PATCH /api/messages/:id - update status/read (role-aware)
router.patch('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, read } = req.body;
    if (!id || !String(id).match(/^[0-9a-fA-F]{24}$/)) return res.status(400).json({ success: false, message: 'Id invalide' });
    const msg = await ContactMessage.findById(id).populate('property', 'owner').lean();
    if (!msg) return res.status(404).json({ success: false, message: 'Message non trouvé' });

    const role = req.user && req.user.role;
    let allowed = false;
    if (role === 'admin') allowed = true;
    // owner of the property may update regardless of declared role
    if (msg.property && msg.property.owner && String(msg.property.owner) === String(req.user.id)) allowed = true;

    if (!allowed) return res.status(403).json({ success: false, message: 'Accès refusé' });

    const update = {};
    if (typeof status === 'string') update.status = status;
    if (typeof read === 'boolean') update.read = read;
    if (Object.keys(update).length === 0) return res.status(400).json({ success: false, message: 'Rien à mettre à jour' });

    const updated = await ContactMessage.findByIdAndUpdate(id, update, { new: true }).select('firstName lastName email phone property message createdAt status').populate('property', 'title').lean();
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error updating contact message (role-aware):', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/messages/conversations/:conversationId - get messages for a conversation
router.get('/conversations/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await Message.find({ conversation: conversationId }).sort({ createdAt: 1 }).populate('sender', 'firstName lastName avatar');
    res.json({ success: true, data: { messages } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des messages' });
  }
});

// (moved contacted route above to avoid param collision)

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

// POST /api/messages - create a contact message linked to a property
router.post('/', optionalAuth, async (req, res) => {
  try {
    const bodyData = req.body || {};
    const messageFromMessageKey = typeof bodyData.message === 'string' ? bodyData.message : undefined;
    const altMessage = (bodyData.body || bodyData.msg);
    const message = (messageFromMessageKey !== undefined ? messageFromMessageKey : altMessage || '').toString().trim();

    if (!message || message.length === 0) {
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

    const populated = await ContactMessage.findById(contact._id).select('firstName lastName email phone property message createdAt status').populate('property', 'title').lean();

    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    console.error('Error creating contact message:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
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

