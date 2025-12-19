const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Le titre est requis'],
    trim: true,
    maxlength: [200, 'Le titre ne peut pas dépasser 200 caractères']
  },
  description: {
    type: String,
    required: [true, 'La description est requise'],
    maxlength: [2000, 'La description ne peut pas dépasser 2000 caractères']
  },
  transactionType: {
    type: String,
    required: [true, 'Le type de transaction est requis'],
    enum: ['vente', 'location']
  },
  propertyType: {
    type: String,
    required: [true, 'Le type de bien est requis'],
    enum: ['maison', 'appartement', 'villa', 'terrain', 'bureau', 'commerce', 'autre']
  },
  publisherType: {
    type: String,
    required: [true, 'Le type de vendeur est requis'],
    enum: ['particulier', 'professionnel']
  },
  professionalInfo: {
    agencyName: {
      type: String,
      required: function() { return this.publisherType === 'professionnel'; }
    },
    professionalPhone: {
      type: String,
      required: function() { return this.publisherType === 'professionnel'; }
    },
    agencyAddress: {
      type: String,
      required: function() { return this.publisherType === 'professionnel'; }
    }
  },
  // status field is defined later in the schema (use the standardized values)
  moderationInfo: {
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    moderatedAt: Date,
    rejectionReason: String,
    moderationNotes: String
  },
  price: {
    type: Number,
    required: [true, 'Le prix est requis'],
    min: [0, 'Le prix ne peut pas être négatif']
  },
  location: {
    address: {
      type: String,
      required: [true, 'L\'adresse est requise']
    },
    city: {
      type: String,
      required: [true, 'La ville est requise'],
      enum: [
        'Conakry', 'Kankan', 'Labé', 'Nzérékoré', 'Kindia', 
        'Mamou', 'Boké', 'Faranah', 'Siguiri', 'Guéckédou',
        'Kissidougou', 'Dabola', 'Kouroussa', 'Télimélé', 'Pita'
      ]
    },
    region: {
      type: String,
      required: [true, 'La région est requise'],
      enum: [
        'Conakry', 'Haute-Guinée', 'Moyenne-Guinée', 
        'Guinée-Forestière', 'Basse-Guinée'
      ]
    },
    coordinates: {
      latitude: {
        type: Number,
        min: [-90, 'Latitude invalide'],
        max: [90, 'Latitude invalide']
      },
      longitude: {
        type: Number,
        min: [-180, 'Longitude invalide'],
        max: [180, 'Longitude invalide']
      }
    }
  },
  area: {
    type: Number,
    required: [true, 'La surface est requise'],
    min: [1, 'La surface doit être positive']
  },
  bedrooms: {
    type: Number,
    default: 0,
    min: [0, 'Le nombre de chambres ne peut pas être négatif']
  },
  bathrooms: {
    type: Number,
    default: 0,
    min: [0, 'Le nombre de salles de bain ne peut pas être négatif']
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    publicId: String, // Pour Cloudinary
    caption: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  features: [{
    type: String,
    trim: true
  }],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Le propriétaire est requis']
  },
  contact: {
    phone: {
      type: String,
      match: [/^\+224[0-9]{8,9}$/, 'Format de téléphone guinéen invalide']
    },
    email: {
      type: String,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide']
    },
    whatsapp: String
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'inactive', 'sold', 'rented', 'rejected'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['normal', 'featured', 'premium'],
    default: 'normal'
  },
  views: {
    type: Number,
    default: 0
  },
  favorites: {
    type: Number,
    default: 0
  },
  isPromoted: {
    type: Boolean,
    default: false
  },
  promotionExpiry: Date,
  // Date de publication effective (remplie lors de l'approbation par un administrateur)
  publishedAt: Date,
  rejectionReason: String,
  moderationNotes: String,
  lastModified: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Les annonces expirent après 90 jours par défaut
      return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    }
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances de recherche
propertySchema.index({ type: 1, category: 1 });
propertySchema.index({ 'location.city': 1 });
propertySchema.index({ 'location.region': 1 });
propertySchema.index({ price: 1 });
propertySchema.index({ status: 1 });
propertySchema.index({ owner: 1 });
propertySchema.index({ createdAt: -1 });
propertySchema.index({ views: -1 });
propertySchema.index({ priority: 1, createdAt: -1 });

// Index géospatial pour les recherches par localisation
propertySchema.index({ 'location.coordinates': '2dsphere' });

// Index de texte pour la recherche textuelle
propertySchema.index({
  title: 'text',
  description: 'text',
  'location.address': 'text',
  features: 'text'
});

// Virtual pour obtenir l'image principale
propertySchema.virtual('primaryImage').get(function() {
  const primaryImg = this.images.find(img => img.isPrimary);
  return primaryImg || this.images[0] || null;
});

// Virtual pour formater le prix
propertySchema.virtual('formattedPrice').get(function() {
  return new Intl.NumberFormat('fr-GN', {
    style: 'currency',
    currency: 'GNF',
    minimumFractionDigits: 0,
  }).format(this.price);
});

// Virtual pour obtenir l'adresse complète
propertySchema.virtual('fullAddress').get(function() {
  return `${this.location.address}, ${this.location.city}, ${this.location.region}`;
});

// Middleware pour mettre à jour lastModified
propertySchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastModified = new Date();
  }
  next();
});

// Méthode pour incrémenter les vues
propertySchema.methods.incrementViews = function() {
  return this.updateOne({ $inc: { views: 1 } });
};

// Méthode pour vérifier si l'annonce est expirée
propertySchema.methods.isExpired = function() {
  return this.expiresAt && this.expiresAt < new Date();
};

// Méthode pour renouveler l'annonce
propertySchema.methods.renew = function(days = 90) {
  this.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  this.status = 'active';
  return this.save();
};

// Méthode statique pour rechercher des propriétés
propertySchema.statics.search = function(criteria) {
  const query = { status: 'active' };
  
  if (criteria.type) query.type = criteria.type;
  if (criteria.category) query.category = criteria.category;
  if (criteria.city) query['location.city'] = new RegExp(criteria.city, 'i');
  if (criteria.minPrice) query.price = { $gte: criteria.minPrice };
  if (criteria.maxPrice) {
    query.price = query.price || {};
    query.price.$lte = criteria.maxPrice;
  }
  if (criteria.bedrooms) query.bedrooms = { $gte: criteria.bedrooms };
  if (criteria.bathrooms) query.bathrooms = { $gte: criteria.bathrooms };
  if (criteria.minArea) query.area = { $gte: criteria.minArea };
  if (criteria.maxArea) {
    query.area = query.area || {};
    query.area.$lte = criteria.maxArea;
  }
  
  return this.find(query)
    .populate('owner', 'name email phone avatar')
    .sort({ priority: -1, createdAt: -1 });
};

module.exports = mongoose.model('Property', propertySchema);