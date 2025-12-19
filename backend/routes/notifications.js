const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const mongoose = require('mongoose');
const { sendEmail } = require('../utils/email');
const User = require('../models/User');
const Property = require('../models/Property');

const router = express.Router();

// GET /api/notifications - get notifications for current user
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const query = { user: req.user.id };
    if (unreadOnly === 'true' || unreadOnly === true) query.read = false;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [notifications, total] = await Promise.all([
      require('../models/Notification').find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      require('../models/Notification').countDocuments(query)
    ]);

    res.json({ success: true, data: { notifications, pagination: { currentPage: parseInt(page), total, limit: parseInt(limit) } } });
  } catch (err) {
    console.error('Erreur récupération notifications:', err);
    res.status(500).json({ success: false, message: 'Erreur récupération notifications' });
  }
});

// PUT /api/notifications/:id/read - mark a notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notif = await require('../models/Notification').findById(req.params.id);
    if (!notif) return res.status(404).json({ success: false, message: 'Notification non trouvée' });
    if (notif.user.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    notif.read = true;
    await notif.save();
    res.json({ success: true, message: 'Marquée comme lue', data: { notification: notif } });
  } catch (err) {
    console.error('Erreur mise à jour notification:', err);
    res.status(500).json({ success: false, message: 'Erreur mise à jour notification' });
  }
});

// PUT /api/notifications/mark-all-read - mark all unread notifications for current user as read
router.put('/mark-all-read', auth, async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    const result = await Notification.updateMany({ user: req.user.id, read: false }, { $set: { read: true } });
    res.json({ success: true, message: 'Toutes les notifications ont été marquées comme lues', data: { modifiedCount: result.modifiedCount } });
  } catch (err) {
    console.error('Erreur mark-all-read notifications:', err);
    res.status(500).json({ success: false, message: 'Erreur lors du marquage des notifications' });
  }
});

// DELETE /api/notifications/:id - delete a notification for current user
router.delete('/:id', auth, async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID de notification invalide' });
    }
    const Notification = require('../models/Notification');
    // Use an atomic delete ensuring the notification belongs to the current user
    const deleted = await Notification.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!deleted) {
      // Could be not found or not owned by user
      const exists = await Notification.findById(req.params.id).lean();
      if (!exists) return res.status(404).json({ success: false, message: 'Notification non trouvée' });
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }
    res.json({ success: true, message: 'Notification supprimée', data: { id: req.params.id } });
  } catch (err) {
    // Log detailed context to help diagnose 500s
    console.error('Erreur suppression notification:', {
      error: err && err.stack ? err.stack : err,
      userId: req.user ? req.user.id : null,
      notificationId: req.params.id
    });
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression de la notification' });
  }
});

// @route   POST /api/notifications/contact-owner
// @desc    Send contact message to property owner
// @access  Private
router.post('/contact-owner', auth, [
  body('propertyId')
    .isMongoId()
    .withMessage('ID de propriété invalide'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Le message doit contenir entre 10 et 1000 caractères'),
  body('phone')
    .optional()
    .matches(/^\+224[0-9]{8,9}$/)
    .withMessage('Format de téléphone guinéen invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { propertyId, message, phone } = req.body;

    // Récupérer la propriété et le propriétaire
    const property = await Property.findById(propertyId)
      .populate('owner', 'name email phone preferences');

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Propriété non trouvée'
      });
    }

    // Récupérer les informations de l'utilisateur qui envoie le message
    const sender = await User.findById(req.user.id);

    // Vérifier si le propriétaire accepte les notifications email
    if (property.owner.preferences?.notifications?.email !== false) {
      try {
        await sendEmail({
          to: property.owner.email,
          subject: `Nouveau message concernant votre bien: ${property.title}`,
          template: 'contact-owner',
          data: {
            ownerName: property.owner.name,
            senderName: sender.name,
            senderEmail: sender.email,
            senderPhone: phone || sender.phone,
            propertyTitle: property.title,
            propertyUrl: `${process.env.FRONTEND_URL}/property/${property._id}`,
            message: message,
            propertyImage: property.images[0]?.url
          }
        });
      } catch (emailError) {
        console.error('Erreur envoi email au propriétaire:', emailError);
      }
    }

    // Envoyer une copie à l'expéditeur
    try {
      await sendEmail({
        to: sender.email,
        subject: `Copie de votre message concernant: ${property.title}`,
        template: 'contact-copy',
        data: {
          senderName: sender.name,
          ownerName: property.owner.name,
          propertyTitle: property.title,
          message: message,
          contactInfo: property.contact
        }
      });
    } catch (emailError) {
      console.error('Erreur envoi copie email:', emailError);
    }

    res.json({
      success: true,
      message: 'Message envoyé avec succès au propriétaire'
    });

  } catch (error) {
    console.error('Erreur lors de l\'envoi du message:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi du message'
    });
  }
});

// @route   POST /api/notifications/property-alert
// @desc    Send property alert to users with matching criteria
// @access  Private (System/Admin)
router.post('/property-alert', auth, async (req, res) => {
  try {
    const { propertyId } = req.body;

    const property = await Property.findById(propertyId)
      .populate('owner', 'name email');

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Propriété non trouvée'
      });
    }

    // Trouver les utilisateurs avec des alertes correspondantes
    const matchingUsers = await User.find({
      'preferences.searchAlerts': {
        $elemMatch: {
          isActive: true,
          $or: [
            { 'criteria.type': property.type },
            { 'criteria.category': property.category },
            { 'criteria.location': { $regex: property.location.city, $options: 'i' } },
            {
              $and: [
                { 'criteria.minPrice': { $lte: property.price } },
                { 'criteria.maxPrice': { $gte: property.price } }
              ]
            }
          ]
        }
      },
      'preferences.notifications.email': true
    });

    // Envoyer les notifications
    const emailPromises = matchingUsers.map(async (user) => {
      try {
        await sendEmail({
          to: user.email,
          subject: 'Nouvelle propriété correspondant à vos critères !',
          template: 'property-alert',
          data: {
            userName: user.name,
            propertyTitle: property.title,
            propertyPrice: property.formattedPrice,
            propertyLocation: property.fullAddress,
            propertyUrl: `${process.env.FRONTEND_URL}/property/${property._id}`,
            propertyImage: property.images[0]?.url,
            unsubscribeUrl: `${process.env.FRONTEND_URL}/unsubscribe?token=${user._id}`
          }
        });
      } catch (emailError) {
        console.error(`Erreur envoi alerte à ${user.email}:`, emailError);
      }
    });

    await Promise.all(emailPromises);

    res.json({
      success: true,
      message: `Alertes envoyées à ${matchingUsers.length} utilisateur(s)`
    });

  } catch (error) {
    console.error('Erreur lors de l\'envoi des alertes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi des alertes'
    });
  }
});

// @route   POST /api/notifications/newsletter
// @desc    Send newsletter to all subscribed users
// @access  Private (Admin only)
router.post('/newsletter', auth, [
  body('subject')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Le sujet doit contenir entre 5 et 200 caractères'),
  body('content')
    .trim()
    .isLength({ min: 50 })
    .withMessage('Le contenu doit contenir au moins 50 caractères'),
  body('template')
    .optional()
    .isString()
    .withMessage('Template invalide')
], async (req, res) => {
  try {
    // Vérifier les droits admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { subject, content, template = 'newsletter' } = req.body;

    // Récupérer tous les utilisateurs qui acceptent les newsletters
    const subscribers = await User.find({
      'preferences.notifications.email': true,
      isActive: true
    }).select('name email');

    // Envoyer la newsletter par batch pour éviter la surcharge
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < subscribers.length; i += batchSize) {
      batches.push(subscribers.slice(i, i + batchSize));
    }

    let totalSent = 0;
    let totalErrors = 0;

    for (const batch of batches) {
      const emailPromises = batch.map(async (user) => {
        try {
          await sendEmail({
            to: user.email,
            subject: subject,
            template: template,
            data: {
              userName: user.name,
              content: content,
              unsubscribeUrl: `${process.env.FRONTEND_URL}/unsubscribe?token=${user._id}`
            }
          });
          totalSent++;
        } catch (emailError) {
          console.error(`Erreur envoi newsletter à ${user.email}:`, emailError);
          totalErrors++;
        }
      });

      await Promise.all(emailPromises);
      
      // Pause entre les batches pour éviter la surcharge
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    res.json({
      success: true,
      message: `Newsletter envoyée avec succès`,
      data: {
        totalSubscribers: subscribers.length,
        totalSent,
        totalErrors
      }
    });

  } catch (error) {
    console.error('Erreur lors de l\'envoi de la newsletter:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi de la newsletter'
    });
  }
});

// @route   POST /api/notifications/welcome
// @desc    Send welcome email to new user
// @access  Private (System)
router.post('/welcome', async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    await sendEmail({
      to: user.email,
      subject: 'Bienvenue sur BarryLand !',
      template: 'welcome',
      data: {
        userName: user.name,
        userType: user.userType,
        dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
        supportEmail: 'support@barryland.gn'
      }
    });

    res.json({
      success: true,
      message: 'Email de bienvenue envoyé avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email de bienvenue:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi de l\'email de bienvenue'
    });
  }
});

module.exports = router;