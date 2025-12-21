const express = require('express');
const { body, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Property = require('../models/Property');
const User = require('../models/User');
const { logHistory } = require('../utils/historyLogger');
const { logActivity } = require('../utils/activityLogger');
const { auth, authorize } = require('../middleware/auth');
// middleware/upload exports the multer instance directly (module.exports = upload)
// Require it as a value rather than destructuring to avoid undefined
const upload = require('../middleware/upload');
const fs = require('fs');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');

// Configure Cloudinary (will use env vars)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const isLikelyPlaceholder = (v) => {
  if (!v || typeof v !== 'string') return true;
  const lowered = v.toLowerCase();
  return /your|votre|changeme|replace|api_key|api-secret|example|xxxxx|12345/.test(lowered);
};

const isCloudinaryConfigured = (() => {
  const name = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  const ok = !!name && !!key && !!secret && !isLikelyPlaceholder(name) && !isLikelyPlaceholder(key) && !isLikelyPlaceholder(secret);
  if (!ok) {
    console.warn('⚠️ Cloudinary non configuré pour la suppression automatique d\'images. Les images locales seront gérées si présentes.');
  }
  return ok;
})();

const router = express.Router();

// Helper: mark isFavorite on a list of properties for a given userId
async function markFavoritesForUser(props, userId) {
  try {
    if (!userId) return props;
    const user = await User.findById(userId).lean();
    if (!user || !Array.isArray(user.favorites) || user.favorites.length === 0) return props;
    const favSet = new Set(user.favorites.map(f => String(f)));
    return props.map(p => ({ ...p, isFavorite: favSet.has(String(p._id)) }));
  } catch (e) {
    return props;
  }
}

// Validation rules
const propertyValidation = [
  body('title')
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Le titre doit contenir entre 10 et 200 caractères'),
  body('description')
    .trim()
    .isLength({ min: 50, max: 2000 })
    .withMessage('La description doit contenir entre 50 et 2000 caractères'),
  // Accept either `type` (frontend older name) or `transactionType` (mapped name)
  body().custom((_, { req }) => {
    const t = req.body.type || req.body.transactionType;
    if (!t) throw new Error('Type de transaction manquant');
    if (!['vente', 'location'].includes(t)) throw new Error('Type de transaction invalide');
    return true;
  }),
  // Accept either `category` or `propertyType`
  body().custom((_, { req }) => {
    const c = req.body.category || req.body.propertyType;
    if (!c) throw new Error('Catégorie manquante');
    if (!['maison', 'appartement', 'villa', 'terrain', 'bureau', 'commerce'].includes(c)) throw new Error('Catégorie invalide');
    return true;
  }),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Le prix doit être un nombre positif'),
  body('location.city')
    .isIn([
      'Conakry', 'Kankan', 'Labé', 'Nzérékoré', 'Kindia', 
      'Mamou', 'Boké', 'Faranah', 'Siguiri', 'Guéckédou'
    ])
    .withMessage('Ville invalide'),
  body('area')
    .isFloat({ min: 1 })
    .withMessage('La surface doit être un nombre positif'),
  body('bedrooms')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Le nombre de chambres doit être un entier positif'),
  body('bathrooms')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Le nombre de salles de bain doit être un entier positif')
];

// @route   GET /api/properties
// @desc    Get all properties with filters
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page invalide'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limite invalide'),
  query('type').optional().isIn(['vente', 'location']).withMessage('Type invalide'),
  query('category').optional().isIn(['maison', 'appartement', 'villa', 'terrain', 'bureau', 'commerce']).withMessage('Catégorie invalide'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('Prix minimum invalide'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Prix maximum invalide'),
  query('city').optional().isString().withMessage('Ville invalide'),
  query('bedrooms').optional().isInt({ min: 0 }).withMessage('Nombre de chambres invalide'),
  query('bathrooms').optional().isInt({ min: 0 }).withMessage('Nombre de salles de bain invalide'),
  query('sort').optional().isIn(['latest', 'price-low', 'price-high', 'views', 'featured']).withMessage('Tri invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Paramètres de recherche invalides',
        errors: errors.array()
      });
    }

    const {
      page = 1,
      limit = 12,
      type,
      category,
      city,
      minPrice,
      maxPrice,
      bedrooms,
      bathrooms,
      minArea,
      maxArea,
      sort = 'latest',
      search
    } = req.query;

    // Build query
    const query = { status: 'active' };

    if (type) query.type = type;
    if (category) query.category = category;
    if (city) query['location.city'] = new RegExp(city, 'i');
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    if (bedrooms) query.bedrooms = { $gte: parseInt(bedrooms) };
    if (bathrooms) query.bathrooms = { $gte: parseInt(bathrooms) };
    if (minArea || maxArea) {
      query.area = {};
      if (minArea) query.area.$gte = parseFloat(minArea);
      if (maxArea) query.area.$lte = parseFloat(maxArea);
    }

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Build sort
    let sortQuery = {};
    switch (sort) {
      case 'price-low':
        sortQuery = { price: 1 };
        break;
      case 'price-high':
        sortQuery = { price: -1 };
        break;
      case 'views':
        sortQuery = { views: -1 };
        break;
      case 'featured':
        sortQuery = { priority: -1, createdAt: -1 };
        break;
      case 'latest':
      default:
        sortQuery = { createdAt: -1 };
        break;
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [properties, total] = await Promise.all([
      Property.find(query)
        .populate('owner', 'name email phone avatar isVerified')
        .sort(sortQuery)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Property.countDocuments(query)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    // Mark favorites if user is authenticated
    const outProperties = req.user ? await markFavoritesForUser(properties, req.user.id) : properties;

    res.json({
      success: true,
      data: {
        properties: outProperties,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalProperties: total,
          hasNextPage,
          hasPrevPage,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des propriétés:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des propriétés'
    });
  }
});

// @route   GET /api/properties/featured
// @desc    Get featured properties
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const limit = Math.max(4, Math.min(6, parseInt(req.query.limit) || 6));

    // Business rule: only properties explicitly approved by an admin and flagged as featured
    const properties = await Property.find({
      isApproved: true,
      isFeatured: true,
      status: 'active'
    })
    .select('title images price propertyType location createdAt transactionType bedrooms area description')
    .populate('owner', 'name email phone avatar isVerified')
    .sort({ 'moderationInfo.moderatedAt': -1, createdAt: -1 })
    .limit(limit)
    .lean();

    // Map images -> mainImage for frontend convenience
    const mapped = (properties || []).map(p => {
      const mainImg = (Array.isArray(p.images) && p.images.length > 0)
        ? (p.images.find(i => i.isPrimary) || p.images[0]).url
        : null;
      return {
        _id: p._id,
        title: p.title,
        price: p.price,
        propertyType: p.propertyType,
        type: p.transactionType || p.type || null,
        rooms: typeof p.bedrooms === 'number' ? p.bedrooms : (p.bedrooms ? Number(p.bedrooms) : null),
        surface: typeof p.area === 'number' ? p.area : (p.area ? Number(p.area) : null),
        description: p.description || '',
        imagesCount: Array.isArray(p.images) ? p.images.length : 0,
        city: p.location && p.location.city ? p.location.city : null,
        mainImage: mainImg,
        createdAt: p.createdAt,
        owner: p.owner
      };
    });

    const outProps = req.user ? await markFavoritesForUser(mapped, req.user.id) : mapped;
    res.json({ success: true, data: { properties: outProps } });

  } catch (error) {
    console.error('Erreur lors de la récupération des propriétés en vedette:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des propriétés en vedette'
    });
  }
});

// @route   GET /api/properties/:id/similar
// @desc    Get similar properties for a given property id
// @access  Public
router.get('/:id/similar', async (req, res) => {
  try {
    const propId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(propId)) {
      return res.status(400).json({ success: false, message: 'Identifiant invalide' });
    }

    const current = await Property.findById(propId).lean();
    if (!current) {
      return res.status(404).json({ success: false, message: 'Propriété non trouvée' });
    }

    // Base query: same propertyType and same transactionType, exclude current
    // Prefer showing public active properties, but also include properties owned by the same owner
    // so that a user viewing their own (pending) ad can still see their other listings.
    const ownerId = current.owner;
    const baseQuery = {
      propertyType: current.propertyType,
      transactionType: current.transactionType,
      _id: { $ne: current._id },
      $or: [ { status: 'active' } ]
    };
    if (ownerId) {
      baseQuery.$or.push({ owner: ownerId });
    }

    // Fetch a candidate pool (limit a bit higher to allow re-ranking)
    const poolLimit = 20;
    let candidates = await Property.find(baseQuery)
      .select('title images price propertyType bedrooms area location createdAt')
      .lean()
      .limit(poolLimit);

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.json({ success: true, data: { properties: [] } });
    }

    // Compute optional matching score for each candidate
    const areaMin = current.area ? current.area * 0.9 : null;
    const areaMax = current.area ? current.area * 1.1 : null;
    const priceMin = current.price ? current.price * 0.85 : null;
    const priceMax = current.price ? current.price * 1.15 : null;

    const scored = candidates.map(c => {
      let score = 0;
      try {
        if (current.location && current.location.city && c.location && c.location.city) {
          if (String(current.location.city).toLowerCase() === String(c.location.city).toLowerCase()) score += 40;
        }
      } catch (e) {}
      if (typeof current.bedrooms === 'number' && typeof c.bedrooms === 'number' && current.bedrooms === c.bedrooms) score += 15;
      if (areaMin !== null && areaMax !== null && typeof c.area === 'number') {
        if (c.area >= areaMin && c.area <= areaMax) score += 15;
      }
      if (priceMin !== null && priceMax !== null && typeof c.price === 'number') {
        if (c.price >= priceMin && c.price <= priceMax) score += 15;
      }
      if (Array.isArray(c.images) && c.images.length > 0) score += 5;
      return { prop: c, score };
    });

    // Sort by score then by createdAt
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ta = a.prop.createdAt ? new Date(a.prop.createdAt).getTime() : 0;
      const tb = b.prop.createdAt ? new Date(b.prop.createdAt).getTime() : 0;
      return tb - ta;
    });

    // Limit results to 4-6 based on query param
    const requested = parseInt(req.query.limit || '4');
    const limit = Math.max(4, Math.min(6, isNaN(requested) ? 4 : requested));
    const selected = scored.slice(0, limit).map(s => s.prop).filter(Boolean);

    const out = selected.map(p => ({
      _id: p._id,
      title: p.title,
      image: (Array.isArray(p.images) && p.images.length > 0) ? (p.images.find(i => i.isPrimary) || p.images[0]).url : null,
      price: p.price,
      propertyType: p.propertyType,
      bedrooms: p.bedrooms,
      area: p.area,
      city: p.location && p.location.city ? p.location.city : null,
      address: p.location && p.location.address ? p.location.address : null
    }));

    res.json({ success: true, data: { properties: out } });

  } catch (error) {
    console.error('Erreur lors de la récupération des propriétés similaires:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des propriétés similaires' });
  }
});

// @route   GET /api/properties/:id
// @desc    Get single property
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('owner', 'name email phone avatar isVerified createdAt');

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Propriété non trouvée'
      });
    }
    // Increment views (but not for the owner)
    if (!req.user || req.user.id !== property.owner._id.toString()) {
      await property.incrementViews();
    }

    const outPropArr = req.user ? await markFavoritesForUser([property], req.user.id) : [property];
    const outProp = outPropArr[0] || property;
    res.json({ success: true, data: { property: outProp } });

  } catch (error) {
    console.error('Erreur lors de la récupération de la propriété:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la propriété'
    });
  }
});

// @route   POST /api/properties
// @desc    Create new property
// @access  Private (any authenticated user) - TEMPORARY for soutenance/demo
router.post('/', auth, propertyValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const propertyData = {
      ...req.body,
      owner: req.user.id
    };

    // Map frontend fields to schema fields
    if (propertyData.type) {
      propertyData.transactionType = propertyData.type;
      delete propertyData.type;
    }
    if (propertyData.category) {
      propertyData.propertyType = propertyData.category;
      delete propertyData.category;
    }

    // Defensive defaults and sanitation to avoid Mongoose validation errors
    // Ensure images is an array with at least one placeholder if missing
    if (!Array.isArray(propertyData.images)) {
      propertyData.images = [];
    }

    // If publisherType not set, default to 'particulier'
    if (!propertyData.publisherType) {
      propertyData.publisherType = 'particulier';
    }

    // Ensure location has address when frontend provides only city
    if (propertyData.location && propertyData.location.city && !propertyData.location.address) {
      propertyData.location.address = propertyData.location.city;
    }

    // Basic coercions for numbers (price, area, bedrooms, bathrooms)
    if (propertyData.price) propertyData.price = Number(propertyData.price);
    if (propertyData.area) propertyData.area = Number(propertyData.area);
    if (propertyData.bedrooms) propertyData.bedrooms = Number(propertyData.bedrooms);
    if (propertyData.bathrooms) propertyData.bathrooms = Number(propertyData.bathrooms);

    // Set region based on city
    const cityToRegion = {
      'Conakry': 'Conakry',
      'Kankan': 'Haute-Guinée',
      'Siguiri': 'Haute-Guinée',
      'Kouroussa': 'Haute-Guinée',
      'Labé': 'Moyenne-Guinée',
      'Pita': 'Moyenne-Guinée',
      'Mamou': 'Moyenne-Guinée',
      'Nzérékoré': 'Guinée-Forestière',
      'Guéckédou': 'Guinée-Forestière',
      'Kissidougou': 'Guinée-Forestière',
      'Boké': 'Basse-Guinée',
      'Kindia': 'Basse-Guinée',
      'Télimélé': 'Basse-Guinée'
    };

    if (propertyData.location && propertyData.location.city) {
      propertyData.location.region = cityToRegion[propertyData.location.city] || 'Conakry';
    }

    const property = new Property(propertyData);
    await property.save();

    await property.populate('owner', 'name email phone avatar');

    // Notify owner if helper exists
    try {
      const { createNotification } = require('../utils/notifications');
      if (createNotification) {
        await createNotification({
          userId: property.owner._id || property.owner,
          title: `Votre annonce "${property.title}" est en cours de vérification`,
          message: 'Votre annonce a été reçue et sera vérifiée par notre équipe.',
          type: 'property_pending',
          link: `/properties/${property._id}`
        });
      }
    } catch (notifErr) {
      console.warn('Notification not created:', notifErr.message || notifErr);
    }

    // Log property creation
    try {
      await logHistory(req, {
        userId: req.user.id,
        userEmail: req.user.email,
        actionType: 'PUBLICATION_ANNONCE',
        actionDetails: { propertyId: property._id, title: property.title }
      });
    } catch (e) { /* ignore */ }

    try {
      logActivity(req, {
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        actionType: 'PUBLICATION_ANNONCE',
        actionDescription: 'Création d\'une annonce',
        targetEntity: 'Property',
        targetId: property._id
      }).catch(() => {});
    } catch (e) { /* ignore */ }

    res.status(201).json({
      success: true,
      message: 'Propriété créée avec succès. Elle sera visible après validation.',
      data: { property }
    });

  } catch (error) {
    console.error('Erreur lors de la création de la propriété:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la propriété',
      error: error && error.message ? error.message : String(error)
    });
  }
});

// @route   PUT /api/properties/:id
// @desc    Update property
// @access  Private (owner, admin)
router.put('/:id', auth, propertyValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Propriété non trouvée'
      });
    }

    // Check ownership or admin role
    if (property.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Update property
    // Map frontend fields to schema fields (same mapping as in POST)
    const updateData = { ...req.body };
    if (updateData.type) {
      updateData.transactionType = updateData.type;
      delete updateData.type;
    }
    if (updateData.category) {
      updateData.propertyType = updateData.category;
      delete updateData.category;
    }

    // Ensure location.address/region when frontend provides only city
    if (updateData.location && updateData.location.city) {
      if (!updateData.location.address) {
        updateData.location.address = updateData.location.city;
      }

      const cityToRegion = {
        'Conakry': 'Conakry',
        'Kankan': 'Haute-Guinée',
        'Siguiri': 'Haute-Guinée',
        'Kouroussa': 'Haute-Guinée',
        'Labé': 'Moyenne-Guinée',
        'Pita': 'Moyenne-Guinée',
        'Mamou': 'Moyenne-Guinée',
        'Nzérékoré': 'Guinée-Forestière',
        'Guéckédou': 'Guinée-Forestière',
        'Kissidougou': 'Guinée-Forestière',
        'Boké': 'Basse-Guinée',
        'Kindia': 'Basse-Guinée',
        'Télimélé': 'Basse-Guinée'
      };

      if (!updateData.location.region) {
        updateData.location.region = cityToRegion[updateData.location.city] || 'Conakry';
      }
    }

    Object.assign(property, updateData);
    
    // If not admin, set status to pending for re-approval
    if (req.user.role !== 'admin') {
      property.status = 'pending';
    }

    await property.save();
    await property.populate('owner', 'name email phone avatar');

    // Log property update
    try {
      await logHistory(req, {
        userId: req.user.id,
        userEmail: req.user.email,
        actionType: 'MODIFICATION_ANNONCE',
        actionDetails: { propertyId: property._id, updatedFields: Object.keys(updateData) }
      });
    } catch (e) { /* ignore */ }

    try {
      logActivity(req, {
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        actionType: 'MODIFICATION_ANNONCE',
        actionDescription: 'Modification d\'une annonce',
        targetEntity: 'Property',
        targetId: property._id
      }).catch(() => {});
    } catch (e) { /* ignore */ }

    res.json({
      success: true,
      message: 'Propriété mise à jour avec succès',
      data: { property }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour de la propriété:', error);
    // If Mongoose validation error, return 400 with details
    if (error && error.name === 'ValidationError') {
      const errors = Object.keys(error.errors || {}).map(key => ({ field: key, message: error.errors[key].message }));
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la propriété'
    });
  }
});

// @route   DELETE /api/properties/:id
// @desc    Delete property
// @access  Private (owner, admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Propriété non trouvée'
      });
    }

    // Check ownership or admin role
    if (property.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Before deleting the property document, attempt to delete images from Cloudinary or local storage
    try {
      if (Array.isArray(property.images) && property.images.length > 0) {
        for (const img of property.images) {
          const publicId = img && img.publicId ? String(img.publicId) : null;
          if (publicId && isCloudinaryConfigured && !publicId.startsWith('local/')) {
            try {
              await cloudinary.uploader.destroy(publicId);
            } catch (delErr) {
              console.warn(`Failed to delete Cloudinary image ${publicId}:`, delErr && delErr.message ? delErr.message : delErr);
            }
          } else if (publicId && publicId.startsWith('local/')) {
            // local path stored as local/filename
            const filename = publicId.replace(/^local\//, '');
            const filepath = path.join(__dirname, '..', 'uploads', 'properties', filename);
            try {
              if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
            } catch (fsErr) {
              console.warn(`Failed to delete local image ${filepath}:`, fsErr && fsErr.message ? fsErr.message : fsErr);
            }
          } else if (img && img.url && typeof img.url === 'string' && img.url.includes('/uploads/properties/')) {
            // older entries may have direct URL
            try {
              const filename = img.url.split('/uploads/properties/').pop();
              const filepath = path.join(__dirname, '..', 'uploads', 'properties', filename);
              if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
            } catch (oldFsErr) {
              console.warn('Failed to delete legacy local image for property:', oldFsErr && oldFsErr.message ? oldFsErr.message : oldFsErr);
            }
          }
        }
      }
    } catch (imgDelErr) {
      console.error('Error while deleting property images:', imgDelErr && imgDelErr.message ? imgDelErr.message : imgDelErr);
      // Proceed with deletion of document anyway — don't block removal due to image deletion issues
    }

    await Property.findByIdAndDelete(req.params.id);

    // Log property deletion
    try {
      await logHistory(req, {
        userId: req.user.id,
        userEmail: req.user.email,
        actionType: 'SUPPRESSION_ANNONCE',
        actionDetails: { propertyId: req.params.id, title: property.title }
      });
    } catch (e) { /* ignore */ }

    try {
      logActivity(req, {
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        actionType: 'SUPPRESSION_ANNONCE',
        actionDescription: 'Suppression d\'une annonce',
        targetEntity: 'Property',
        targetId: req.params.id
      }).catch(() => {});
    } catch (e) { /* ignore */ }

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

// @route   POST /api/properties/:id/favorite
// @desc    Add/remove property from favorites
// @access  Private
router.post('/:id/favorite', auth, async (req, res) => {
  try {
    const propId = req.params.id;
    const userId = req.user.id;

    // Resolve property: try ObjectId lookup if valid, otherwise try alternative id fields
    let property = null;
    try {
      if (mongoose.Types.ObjectId.isValid(propId)) {
        property = await Property.findById(propId);
      }
    } catch (e) {
      console.warn('Ignored error during findById for favorites:', e && e.message ? e.message : e);
    }

    if (!property) {
      property = await Property.findOne({ $or: [ { id: propId }, { externalId: propId }, { legacyId: propId } ] });
    }

    // Si la propriété n'existe pas, la créer automatiquement (mock minimal)
    if (!property) {
      const mockData = {
        id: propId,
        title: 'Annonce',
        description: '',
        images: [],
        location: '',
        price: 0,
        type: 'vente',
        category: 'maison',
        area: 0,
        bedrooms: 0,
        bathrooms: 0,
        features: [],
        owner: userId,
        contact: { phone: '', email: '' },
  // Mark as pending so it doesn't appear in public/featured listings
  status: 'pending',
        publisherType: 'particulier',
        favorites: 0
      };
      try {
        console.info(`[fav] Creating mock property for propId=${propId} by user=${userId}`);
        property = await Property.create(mockData);
        console.info(`[fav] Created mock property _id=${property._id} for propId=${propId}`);
      } catch (e) {
        console.error(`[fav] Error creating mock property for propId=${propId}:`, e && e.message ? e.message : e);
        return res.status(500).json({ success: false, message: 'Erreur lors de la création de la propriété mock', error: e && e.message ? e.message : String(e) });
      }
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    // Defensive: ensure favorites is an array
    if (!Array.isArray(user.favorites)) user.favorites = [];

    const workingId = property._id.toString();
    const hasFav = user.favorites.some(f => String(f) === workingId || String(f) === propId);

    // Defensive: ensure property.favorites is a number
    if (typeof property.favorites !== 'number') {
      property.favorites = 0;
      await Property.findByIdAndUpdate(workingId, { favorites: 0 }).catch(() => {});
    }

    // Use atomic updates to avoid race conditions (use workingId)
    try {
      if (hasFav) {
        console.info(`[fav] Removing favorite: user=${userId} prop=${workingId} (orig=${propId})`);
        await User.findByIdAndUpdate(userId, { $pull: { favorites: workingId } });
        await Property.findByIdAndUpdate(workingId, { $inc: { favorites: -1 } });
      } else {
        console.info(`[fav] Adding favorite: user=${userId} prop=${workingId} (orig=${propId})`);
        await User.findByIdAndUpdate(userId, { $addToSet: { favorites: workingId } });
        await Property.findByIdAndUpdate(workingId, { $inc: { favorites: 1 } });
      }
    } catch (e) {
      console.error(`[fav] Error updating favorite for user=${userId} prop=${workingId}:`, e && e.message ? e.message : e);
      throw e;
    }

    // Re-fetch fresh documents
    const [freshUser, freshProperty] = await Promise.all([
      User.findById(userId).lean(),
      Property.findById(workingId).populate('owner', 'name email phone avatar isVerified createdAt')
    ]);

    if (!freshProperty) {
      return res.status(404).json({ success: false, message: 'Propriété introuvable après mise à jour' });
    }

    // Log favorite action
    try {
      await logHistory(req, {
        userId,
        userEmail: user.email,
        actionType: hasFav ? 'RETRAIT_FAVORIS' : 'AJOUT_FAVORIS',
        actionDetails: { propertyId: workingId }
      });
    } catch (e) { /* ignore */ }

    try {
      logActivity(req, {
        userId,
        userEmail: user.email,
        userRole: user.role,
        actionType: 'AJOUT_FAVORIS',
        actionDescription: hasFav ? 'Retiré des favoris' : 'Ajouté aux favoris',
        targetEntity: 'Property',
        targetId: workingId
      }).catch(() => {});
    } catch (e) { /* ignore */ }

    // Ensure favorites count is not negative
    if (typeof freshProperty.favorites !== 'number' || freshProperty.favorites < 0) {
      freshProperty.favorites = 0;
      await Property.findByIdAndUpdate(workingId, { favorites: 0 });
    }

    const isFavorite = (freshUser.favorites || []).some(f => f.toString() === workingId || f.toString() === propId);

    res.json({
      success: true,
      message: hasFav ? 'Retiré des favoris' : 'Ajouté aux favoris',
      data: {
        property: freshProperty,
        isFavorite,
        favoritesCount: freshProperty.favorites || 0
      }
    });

    } catch (error) {
    console.error('Erreur lors de la gestion des favoris:', error && error.stack ? error.stack : error);
    if (error && error.name === 'ValidationError') {
      const errors = Object.keys(error.errors || {}).map(key => ({ field: key, message: error.errors[key].message }));
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }
    res.status(500).json({ success: false, message: 'Erreur lors de la gestion des favoris', error: error && error.message ? error.message : String(error) });
  }
});

// @route   GET /api/properties/user/my-properties
// @desc    Get current user's properties
// @access  Private
router.get('/user/my-properties', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = { owner: req.user.id };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch properties and ensure uniqueness by _id before returning
    const [rawProperties] = await Promise.all([
      Property.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean()
    ]);

    // Deduplicate results by _id to protect the frontend from duplicates
    const uniqueMap = new Map();
    (rawProperties || []).forEach(p => {
      const key = String(p?._id || p?.id || '');
      if (key && !uniqueMap.has(key)) uniqueMap.set(key, p);
    });
    const properties = Array.from(uniqueMap.values());

    // Use the unique count as total to ensure pagination/stats align with returned array
    const totalUnique = properties.length;
    const totalPages = Math.ceil(totalUnique / parseInt(limit));

    const outPropsUser = req.user ? await markFavoritesForUser(properties, req.user.id) : properties;
    // Prevent client-side caching for this endpoint to ensure dashboard always receives fresh data
    try {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      // Explicitly set an empty ETag to avoid conditional 304 responses
      // Express may compute/set an ETag after middleware; setting it to empty string forces no-match
      try { res.set('ETag', ''); } catch (e) { /* ignore */ }
    } catch (hdrErr) {
      // ignore header failures
    }
    res.json({
      success: true,
      data: {
        properties: outPropsUser,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalProperties: totalUnique,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des propriétés utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de vos propriétés'
    });
  }
});

module.exports = router;