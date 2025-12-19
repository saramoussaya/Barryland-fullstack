const express = require('express');
const { body, query, validationResult } = require('express-validator');
const User = require('../models/User');
const Property = require('../models/Property');
const { AdminLog, SystemStats, SystemSettings } = require('../models/Admin');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Middleware pour vérifier les droits admin
const adminAuth = [auth, authorize(['admin'])];

// Fonction pour logger les actions admin
const logAdminAction = async (adminId, action, target = null, targetType = null, details = {}, req = null) => {
  try {
    const log = new AdminLog({
      admin: adminId,
      action,
      target,
      targetType,
      details,
      ipAddress: req ? req.ip : null,
      userAgent: req ? req.get('User-Agent') : null
    });
    await log.save();
  } catch (error) {
    console.error('Erreur lors du logging admin:', error);
  }
};

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Private (Admin only)
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Statistiques générales
    const [
      totalUsers,
      totalProperties,
      activeProperties,
      pendingProperties,
      newUsersThisWeek,
      newPropertiesThisWeek,
      totalViews
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      Property.countDocuments(),
      Property.countDocuments({ status: 'active' }),
      Property.countDocuments({ status: 'pending' }),
      User.countDocuments({ 
        role: { $ne: 'admin' },
        createdAt: { $gte: lastWeek }
      }),
      Property.countDocuments({ createdAt: { $gte: lastWeek } }),
      Property.aggregate([
        { $group: { _id: null, totalViews: { $sum: '$views' } } }
      ])
    ]);

    // Statistiques par type de propriété
    const propertyTypeStats = await Property.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    // Statistiques par catégorie
    const propertyCategoryStats = await Property.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    // Statistiques par type d'utilisateur
    const userStats = await User.aggregate([
      { $match: { role: { $ne: 'admin' } } },
      { $group: { _id: '$userType', count: { $sum: 1 } } }
    ]);

    // Statistiques par ville
    const cityStats = await Property.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$location.city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Activité récente
    const recentUsers = await User.find({ role: { $ne: 'admin' } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email userType createdAt isVerified');

    const recentProperties = await Property.find()
      .populate('owner', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title type category status owner createdAt');

    // Logs d'activité admin récents
    const recentAdminLogs = await AdminLog.find()
      .populate('admin', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalProperties,
          activeProperties,
          pendingProperties,
          newUsersThisWeek,
          newPropertiesThisWeek,
          totalViews: totalViews[0]?.totalViews || 0
        },
        userStats: userStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        propertyStats: {
          byType: propertyTypeStats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
          }, {}),
          byCategory: propertyCategoryStats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
          }, {}),
          byCity: cityStats
        },
        recentActivity: {
          users: recentUsers,
          properties: recentProperties,
          adminLogs: recentAdminLogs
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du dashboard admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with pagination and filters
// @access  Private (Admin only)
router.get('/users', adminAuth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('role').optional().isIn(['buyer', 'seller', 'agent']),
  query('isActive').optional().isBoolean(),
  query('isVerified').optional().isBoolean(),
  query('search').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Paramètres invalides',
        errors: errors.array()
      });
    }

    const {
      page = 1,
      limit = 20,
      role,
      isActive,
      isVerified,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { role: { $ne: 'admin' } };
    
    if (role) query.userType = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (isVerified !== undefined) query.isVerified = isVerified === 'true';
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalUsers: total,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des utilisateurs'
    });
  }
});

// @route   PUT /api/admin/users/:id/status
// @desc    Update user status (activate/deactivate)
// @access  Private (Admin only)
router.put('/users/:id/status', adminAuth, [
  body('isActive').isBoolean().withMessage('Le statut doit être un booléen'),
  body('reason').optional().isString().withMessage('La raison doit être une chaîne')
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

    const { isActive, reason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Impossible de modifier le statut d\'un administrateur'
      });
    }

    user.isActive = isActive;
    await user.save();

    // Log admin action
    await logAdminAction(
      req.user.id,
      isActive ? 'user_unbanned' : 'user_banned',
      user._id.toString(),
      'User',
      { reason, previousStatus: !isActive },
      req
    );

    res.json({
      success: true,
      message: `Utilisateur ${isActive ? 'activé' : 'désactivé'} avec succès`,
      data: { user: user.getPublicProfile() }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du statut'
    });
  }
});

// @route   POST /api/admin/users
// @desc    Create a new user (admin only). Can create admin accounts.
// @access  Private (Admin only)
router.post('/users', adminAuth, [
  body('firstName').trim().isLength({ min: 1 }).withMessage('Prénom requis'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Nom requis'),
  body('email').isEmail().withMessage('Email invalide'),
  body('phone').matches(/^\+224[0-9]{8,9}$/).withMessage('Téléphone invalide'),
  body('password').isLength({ min: 6 }).withMessage('Mot de passe trop court'),
  body('role').optional().isIn(['particular', 'professional', 'admin'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: errors.array() });
    }

    const { firstName, lastName, email, phone, password, role = 'particular' } = req.body;

    // Check existing email
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Un utilisateur avec cet email existe déjà' });
    }

    const user = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      password,
      role
    });

    await user.save();

    await logAdminAction(
      req.user.id,
      role === 'admin' ? 'admin_created' : 'user_created',
      user._id.toString(),
      'User',
      { role },
      req
    );

    res.status(201).json({ success: true, message: 'Utilisateur créé avec succès', data: { user: user.getPublicProfile() } });

  } catch (error) {
    console.error('Erreur création utilisateur admin:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la création de l\'utilisateur' });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update a user's profile (admin only). Use role endpoint to change role.
// @access  Private (Admin only)
router.put('/users/:id', adminAuth, [
  body('firstName').optional().trim().isLength({ min: 1 }).withMessage('Prénom requis'),
  body('lastName').optional().trim().isLength({ min: 1 }).withMessage('Nom requis'),
  body('email').optional().isEmail().withMessage('Email invalide'),
  body('phone').optional().matches(/^\+224[0-9]{8,9}$/).withMessage('Téléphone invalide'),
  body('password').optional().isLength({ min: 6 }).withMessage('Mot de passe trop court')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: errors.array() });
    }

    // Prevent role change via this endpoint
    if (req.body.role) {
      return res.status(403).json({ success: false, message: 'Pour changer le rôle utilisez /api/admin/users/:id/role' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });

    // Do not allow changing other admins via this general endpoint
    if (user.role === 'admin' && req.user.id !== user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Modification d\'un administrateur non autorisée via cette route' });
    }

    const updatable = ['firstName', 'lastName', 'email', 'phone', 'password', 'isVerified', 'isActive'];
    updatable.forEach(field => {
      if (req.body[field] !== undefined) user[field] = req.body[field];
    });

    // If email is being changed, ensure uniqueness
    if (req.body.email && req.body.email.toLowerCase() !== user.email) {
      const exists = await User.findOne({ email: req.body.email.toLowerCase(), _id: { $ne: user._id } });
      if (exists) return res.status(409).json({ success: false, message: 'Email déjà utilisé' });
      user.email = req.body.email.toLowerCase();
    }

    await user.save();

    await logAdminAction(
      req.user.id,
      'user_updated',
      user._id.toString(),
      'User',
      { updatedFields: Object.keys(req.body) },
      req
    );

    res.json({ success: true, message: 'Utilisateur mis à jour', data: { user: user.getPublicProfile() } });

  } catch (error) {
    console.error('Erreur mise à jour utilisateur admin:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de l\'utilisateur' });
  }
});

// @route   PUT /api/admin/users/:id/role
// @desc    Change a user's role (promote/demote). Guard demotion of last admin.
// @access  Private (Admin only)
router.put('/users/:id/role', adminAuth, [
  body('role').isIn(['particular', 'professional', 'admin']).withMessage('Rôle invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: errors.array() });
    }

    const { role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });

    // Prevent self-demotion
    if (req.user.id === user._id.toString() && user.role === 'admin' && role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Vous ne pouvez pas vous retirer le rôle administrateur' });
    }

    // If demoting an admin, ensure there is at least one other admin
    if (user.role === 'admin' && role !== 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(403).json({ success: false, message: 'Impossible de démoter le dernier administrateur' });
      }
    }

    const previousRole = user.role;
    user.role = role;
    await user.save();

    await logAdminAction(
      req.user.id,
      'user_role_changed',
      user._id.toString(),
      'User',
      { previousRole, newRole: role },
      req
    );

    res.json({ success: true, message: 'Rôle modifié avec succès', data: { user: user.getPublicProfile() } });

  } catch (error) {
    console.error('Erreur changement rôle utilisateur admin:', error);
    res.status(500).json({ success: false, message: 'Erreur lors du changement de rôle' });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete a user and associated resources
// @access  Private (Admin only)
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });

    // Prevent deleting admins or self-deletion
    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Impossible de supprimer un administrateur' });
    }
    if (req.user.id === user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    // Find user's properties to remove and clean up references
    const properties = await Property.find({ owner: user._id }).select('_id');
    const propertyIds = properties.map(p => p._id);

    // Delete properties owned by user
    if (propertyIds.length > 0) {
      await Property.deleteMany({ owner: user._id });
      // Remove these properties from other users' favorites
      await User.updateMany({ favorites: { $in: propertyIds } }, { $pull: { favorites: { $in: propertyIds } } });
    }

    // Delete user's notifications
    const Notification = require('../models/Notification');
    await Notification.deleteMany({ user: user._id });

    // Finally delete the user
    await User.findByIdAndDelete(user._id);

    await logAdminAction(
      req.user.id,
      'user_deleted',
      user._id.toString(),
      'User',
      { propertyCount: propertyIds.length, email: user.email },
      req
    );

    res.json({ success: true, message: 'Utilisateur supprimé avec succès' });

  } catch (error) {
    console.error('Erreur suppression utilisateur admin:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression de l\'utilisateur' });
  }
});

// @route   GET /api/admin/properties
// @desc    Get all properties for admin management
// @access  Private (Admin only)
router.get('/properties', adminAuth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['pending', 'active', 'inactive', 'sold', 'rented', 'rejected']),
  query('type').optional().isIn(['vente', 'location']),
  query('category').optional().isIn(['maison', 'appartement', 'villa', 'terrain', 'bureau', 'commerce']),
  query('search').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Paramètres invalides',
        errors: errors.array()
      });
    }

    const {
      page = 1,
      limit = 20,
      status,
      type,
      category,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (status) query.status = status;
    if (type) query.type = type;
    if (category) query.category = category;
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [properties, total] = await Promise.all([
      Property.find(query)
        .populate('owner', 'name email phone userType isVerified')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Property.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: {
        properties,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalProperties: total,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des propriétés admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des propriétés'
    });
  }
});

// @route   PUT /api/admin/properties/:id/status
// @desc    Update property status (approve/reject)
// @access  Private (Admin only)
router.put('/properties/:id/status', adminAuth, [
  body('status').isIn(['active', 'rejected', 'inactive']).withMessage('Statut invalide'),
  body('rejectionReason').optional().isString(),
  body('moderationNotes').optional().isString()
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

    const { status, rejectionReason, moderationNotes } = req.body;
    const property = await Property.findById(req.params.id).populate('owner', 'name email');

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Propriété non trouvée'
      });
    }

  const previousStatus = property.status;
  property.status = status;

  // Save moderation metadata so the owner's dashboard can display validation info
  property.moderationInfo = property.moderationInfo || {};
  property.moderationInfo.moderatedBy = req.user.id;
  property.moderationInfo.moderatedAt = new Date();

  if (rejectionReason) property.rejectionReason = rejectionReason;
  if (moderationNotes) property.moderationNotes = moderationNotes;

    // If approved, set publishedAt and ensure expiresAt is reasonable so it becomes visible
    if (status === 'active') {
      property.publishedAt = property.publishedAt || new Date();
      // If expiresAt is missing or in the past, set default 90 days from now
      if (!property.expiresAt || property.expiresAt < new Date()) {
        property.expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      }
      // Ensure priority default
      if (!property.priority) property.priority = 'normal';
      // If request asks to feature the property, set priority and isPromoted
      if (req.body && req.body.featured) {
        property.priority = 'featured';
        property.isPromoted = true;
        // Business flags
        property.isFeatured = true;
      } else {
        property.isFeatured = false;
      }
      // mark approved
      property.isApproved = true;
    }
    else {
      // if not active, ensure flags are unset
      property.isApproved = false;
      property.isFeatured = false;
    }

    await property.save();

    // Respond quickly to the admin — run notifications/email/logging asynchronously
    (async () => {
      try {
        const { createNotification } = require('../utils/notifications');
        const { sendEmail } = require('../utils/email');

        const owner = property.owner;
        const ownerId = owner && (owner._id || owner);
        const ownerEmail = owner && owner.email;

        try {
          if (createNotification) {
            await createNotification({
              userId: ownerId,
              type: status === 'active' ? 'property_approved' : 'property_rejected',
              title: status === 'active' ? 'Votre annonce a été approuvée' : 'Votre annonce a été rejetée',
              message: status === 'active' ? `Votre annonce "${property.title}" a été approuvée par un administrateur.` : `Votre annonce "${property.title}" a été rejetée. Raison: ${rejectionReason || 'Aucune'}`,
              link: `/properties/${property._id}`,
              data: { propertyId: property._id.toString(), previousStatus }
            });
          }
        } catch (nerr) {
          console.error('Erreur lors de la création de la notification via helper:', nerr);
        }

        if (ownerEmail) {
          try {
            await sendEmail({
              to: ownerEmail,
              template: status === 'active' ? 'property-approved' : 'property-rejected',
              data: {
                ownerName: owner.name || owner.firstName || '',
                propertyTitle: property.title,
                rejectionReason: rejectionReason || '',
                propertyUrl: `${process.env.FRONTEND_URL || ''}/properties/${property._id}`
              }
            });
          } catch (e) {
            console.error('Erreur lors de l\'envoi de l\'email de modération:', e);
          }
        }

        const action = status === 'active' ? 'property_approved' : 'property_rejected';
        await logAdminAction(
          req.user.id,
          action,
          property._id.toString(),
          'Property',
          { 
            previousStatus, 
            newStatus: status, 
            rejectionReason, 
            moderationNotes,
            propertyTitle: property.title,
            ownerEmail: property.owner.email
          },
          req
        );
      } catch (notifyErr) {
        console.error('Erreur lors des notifications admin (async):', notifyErr);
      }
    })();

    // Immediate response
    res.json({
      success: true,
      message: `Propriété ${status === 'active' ? 'approuvée' : 'rejetée'} avec succès`,
      data: { property }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut de la propriété:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du statut'
    });
  }
});

// @route   DELETE /api/admin/properties/:id
// @desc    Delete property (admin only)
// @access  Private (Admin only)
router.delete('/properties/:id', adminAuth, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).populate('owner', 'name email');

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Propriété non trouvée'
      });
    }

    await Property.findByIdAndDelete(req.params.id);

    // Log admin action
    await logAdminAction(
      req.user.id,
      'property_deleted',
      req.params.id,
      'Property',
      { 
        propertyTitle: property.title,
        ownerEmail: property.owner.email,
        reason: req.body.reason || 'Suppression administrative'
      },
      req
    );

    res.json({
      success: true,
      message: 'Propriété supprimée avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la suppression de la propriété:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la propriété'
    });
  }
});

// @route   GET /api/admin/logs
// @desc    Get admin activity logs
// @access  Private (Admin only)
router.get('/logs', adminAuth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('action').optional().isString(),
  query('admin').optional().isMongoId()
], async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      admin,
      startDate,
      endDate
    } = req.query;

    const query = {};
    
    if (action) query.action = action;
    if (admin) query.admin = admin;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      AdminLog.find(query)
        .populate('admin', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AdminLog.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalLogs: total,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des logs admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des logs'
    });
  }
});

// @route   GET /api/admin/settings
// @desc    Get system settings
// @access  Private (Admin only)
router.get('/settings', adminAuth, async (req, res) => {
  try {
    const settings = await SystemSettings.find()
      .populate('modifiedBy', 'name email')
      .sort({ category: 1, key: 1 });

    // Group settings by category
    const groupedSettings = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push(setting);
      return acc;
    }, {});

    res.json({
      success: true,
      data: { settings: groupedSettings }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des paramètres'
    });
  }
});

// @route   PUT /api/admin/settings
// @desc    Update system settings
// @access  Private (Admin only)
router.put('/settings', adminAuth, async (req, res) => {
  try {
    const { settings } = req.body;

    if (!Array.isArray(settings)) {
      return res.status(400).json({
        success: false,
        message: 'Les paramètres doivent être un tableau'
      });
    }

    const updatePromises = settings.map(async (setting) => {
      return await SystemSettings.findOneAndUpdate(
        { key: setting.key },
        {
          value: setting.value,
          lastModified: new Date(),
          modifiedBy: req.user.id
        },
        { upsert: true, new: true }
      );
    });

    await Promise.all(updatePromises);

    // Log admin action
    await logAdminAction(
      req.user.id,
      'system_settings_updated',
      null,
      'System',
      { settingsCount: settings.length, keys: settings.map(s => s.key) },
      req
    );

    res.json({
      success: true,
      message: 'Paramètres mis à jour avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des paramètres'
    });
  }
});

module.exports = router;