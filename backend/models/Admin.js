const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'user_created', 'user_updated', 'user_deleted', 'user_banned', 'user_unbanned',
      'property_approved', 'property_rejected', 'property_deleted', 'property_featured',
      'system_settings_updated', 'backup_created', 'data_exported',
      'login', 'logout', 'password_changed'
    ]
  },
  target: {
    type: String, // ID de l'élément ciblé (user, property, etc.)
    required: false
  },
  targetType: {
    type: String,
    enum: ['User', 'Property', 'System'],
    required: false
  },
  details: {
    type: mongoose.Schema.Types.Mixed, // Détails flexibles de l'action
    default: {}
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

// Index pour améliorer les performances
adminLogSchema.index({ admin: 1, createdAt: -1 });
adminLogSchema.index({ action: 1, createdAt: -1 });
adminLogSchema.index({ targetType: 1, target: 1 });

const systemStatsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true
  },
  users: {
    total: { type: Number, default: 0 },
    new: { type: Number, default: 0 },
    active: { type: Number, default: 0 },
    buyers: { type: Number, default: 0 },
    sellers: { type: Number, default: 0 },
    agents: { type: Number, default: 0 }
  },
  properties: {
    total: { type: Number, default: 0 },
    new: { type: Number, default: 0 },
    active: { type: Number, default: 0 },
    pending: { type: Number, default: 0 },
    sold: { type: Number, default: 0 },
    rented: { type: Number, default: 0 },
    byType: {
      vente: { type: Number, default: 0 },
      location: { type: Number, default: 0 }
    },
    byCategory: {
      maison: { type: Number, default: 0 },
      appartement: { type: Number, default: 0 },
      villa: { type: Number, default: 0 },
      terrain: { type: Number, default: 0 },
      bureau: { type: Number, default: 0 },
      commerce: { type: Number, default: 0 }
    }
  },
  activity: {
    totalViews: { type: Number, default: 0 },
    totalSearches: { type: Number, default: 0 },
    totalContacts: { type: Number, default: 0 },
    avgViewsPerProperty: { type: Number, default: 0 }
  },
  revenue: {
    total: { type: Number, default: 0 },
    subscriptions: { type: Number, default: 0 },
    promotions: { type: Number, default: 0 },
    commissions: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Index pour les statistiques
systemStatsSchema.index({ date: -1 });

const systemSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  description: String,
  category: {
    type: String,
    enum: ['general', 'security', 'email', 'payment', 'moderation', 'features'],
    default: 'general'
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  modifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index pour les paramètres système
systemSettingsSchema.index({ category: 1 });
systemSettingsSchema.index({ isPublic: 1 });

const AdminLog = mongoose.model('AdminLog', adminLogSchema);
const SystemStats = mongoose.model('SystemStats', systemStatsSchema);
const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);

module.exports = {
  AdminLog,
  SystemStats,
  SystemSettings
};