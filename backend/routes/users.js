const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Property = require('../models/Property');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/favorites
// @desc    Get user's favorite properties
// @access  Private
router.get('/favorites', auth, async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const user = await User.findById(req.user.id)
      .populate({
        path: 'favorites',
        populate: {
          path: 'owner',
          select: 'name email phone avatar isVerified'
        },
        options: {
          skip: skip,
          limit: parseInt(limit),
          sort: { createdAt: -1 }
        }
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    const totalFavorites = user.favorites.length;
    const totalPages = Math.ceil(totalFavorites / parseInt(limit));

    res.json({
      success: true,
      data: {
        favorites: user.favorites,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalFavorites,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des favoris:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des favoris'
    });
  }
});

// @route   POST /api/users/search-alert
// @desc    Create a search alert
// @access  Private
router.post('/search-alert', auth, [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Le nom de l\'alerte doit contenir entre 3 et 100 caractères'),
  body('criteria.type')
    .optional()
    .isIn(['vente', 'location'])
    .withMessage('Type invalide'),
  body('criteria.category')
    .optional()
    .isIn(['maison', 'appartement', 'villa', 'terrain', 'bureau', 'commerce'])
    .withMessage('Catégorie invalide'),
  body('criteria.location')
    .optional()
    .isString()
    .withMessage('Localisation invalide'),
  body('criteria.minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Prix minimum invalide'),
  body('criteria.maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Prix maximum invalide')
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

    const { name, criteria } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier le nombre maximum d'alertes (par exemple 10)
    if (user.preferences.searchAlerts.length >= 10) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez atteint le nombre maximum d\'alertes de recherche (10)'
      });
    }

    // Ajouter la nouvelle alerte
    user.preferences.searchAlerts.push({
      name,
      criteria,
      isActive: true
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Alerte de recherche créée avec succès',
      data: {
        alert: user.preferences.searchAlerts[user.preferences.searchAlerts.length - 1]
      }
    });

  } catch (error) {
    console.error('Erreur lors de la création de l\'alerte:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'alerte'
    });
  }
});

// @route   GET /api/users/search-alerts
// @desc    Get user's search alerts
// @access  Private
router.get('/search-alerts', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      data: {
        alerts: user.preferences.searchAlerts
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des alertes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des alertes'
    });
  }
});

// @route   PUT /api/users/search-alert/:alertId
// @desc    Update a search alert
// @access  Private
router.put('/search-alert/:alertId', auth, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Le nom de l\'alerte doit contenir entre 3 et 100 caractères'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('Le statut doit être un booléen')
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

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    const alert = user.preferences.searchAlerts.id(req.params.alertId);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alerte non trouvée'
      });
    }

    // Mettre à jour les champs fournis
    Object.keys(req.body).forEach(key => {
      if (key === 'criteria') {
        Object.assign(alert.criteria, req.body.criteria);
      } else {
        alert[key] = req.body[key];
      }
    });

    await user.save();

    res.json({
      success: true,
      message: 'Alerte mise à jour avec succès',
      data: { alert }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'alerte:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de l\'alerte'
    });
  }
});

// @route   DELETE /api/users/search-alert/:alertId
// @desc    Delete a search alert
// @access  Private
router.delete('/search-alert/:alertId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    const alert = user.preferences.searchAlerts.id(req.params.alertId);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alerte non trouvée'
      });
    }

    alert.remove();
    await user.save();

    res.json({
      success: true,
      message: 'Alerte supprimée avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la suppression de l\'alerte:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'alerte'
    });
  }
});

// @route   PUT /api/users/preferences
// @desc    Update user preferences
// @access  Private
router.put('/preferences', auth, [
  body('notifications.email')
    .optional()
    .isBoolean()
    .withMessage('Préférence email invalide'),
  body('notifications.sms')
    .optional()
    .isBoolean()
    .withMessage('Préférence SMS invalide'),
  body('notifications.push')
    .optional()
    .isBoolean()
    .withMessage('Préférence push invalide')
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

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Mettre à jour les préférences
    if (req.body.notifications) {
      Object.assign(user.preferences.notifications, req.body.notifications);
    }

    await user.save();

    res.json({
      success: true,
      message: 'Préférences mises à jour avec succès',
      data: {
        preferences: user.preferences
      }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour des préférences:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des préférences'
    });
  }
});

// @route   POST /api/users/change-email
// @desc    Change authenticated user's email (requires current password)
// @access  Private
router.post('/change-email', auth, [
  body('email').trim().isEmail().withMessage('Email invalide'),
  body('currentPassword').isLength({ min: 6 }).withMessage('Mot de passe actuel requis')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: errors.array() });
    }

    const { email, currentPassword } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Mot de passe actuel invalide' });
    }

    // Check if email is already used by another account
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing && existing._id.toString() !== userId.toString()) {
      return res.status(409).json({ success: false, message: 'Cette adresse email est déjà utilisée' });
    }

    user.email = email.toLowerCase().trim();
    await user.save();

    const publicProfile = user.getPublicProfile ? user.getPublicProfile() : {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      isVerified: user.isVerified,
      createdAt: user.createdAt
    };

    res.json({ success: true, message: 'Email mis à jour', data: { user: publicProfile } });
  } catch (error) {
    console.error('Erreur lors du changement d\'email :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur lors de la modification de l\'email' });
  }
});

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [
      totalProperties,
      activeProperties,
      totalViews,
      totalFavorites,
      user
    ] = await Promise.all([
      Property.countDocuments({ owner: userId }),
      Property.countDocuments({ owner: userId, status: 'active' }),
      Property.aggregate([
        { $match: { owner: userId } },
        { $group: { _id: null, totalViews: { $sum: '$views' } } }
      ]),
      User.findById(userId).select('favorites'),
      User.findById(userId).select('createdAt')
    ]);

    // Statistiques par statut
    const propertiesByStatus = await Property.aggregate([
      { $match: { owner: userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Propriétés les plus vues
    const topViewedProperties = await Property.find({ owner: userId })
      .sort({ views: -1 })
      .limit(5)
      .select('title views images type category');

    res.json({
      success: true,
      data: {
        overview: {
          totalProperties,
          activeProperties,
          totalViews: totalViews[0]?.totalViews || 0,
          totalFavorites: totalFavorites?.favorites?.length || 0,
          memberSince: user?.createdAt
        },
        propertiesByStatus: propertiesByStatus.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        topViewedProperties
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
});

module.exports = router;