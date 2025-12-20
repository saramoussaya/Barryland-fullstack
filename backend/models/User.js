const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Le prénom est requis'],
    trim: true,
    maxlength: [50, 'Le prénom ne peut pas dépasser 50 caractères']
  },
  lastName: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true,
    maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères']
  },
  email: {
    type: String,
    required: [true, 'L\'email est requis'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide']
  },
  phone: {
    type: String,
    required: [true, 'Le numéro de téléphone est requis'],
    match: [/^\+224[0-9]{8,9}$/, 'Format de téléphone guinéen invalide (+224XXXXXXXX)']
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères'],
    select: false // Ne pas inclure par défaut dans les requêtes
  },
  role: {
    type: String,
    enum: ['particular', 'professional', 'admin'],
    default: 'professional'
  },
  isRealEstateAgent: {
    type: Boolean,
    default: false
  },
  avatar: {
    type: String,
    default: null
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  address: {
    street: String,
    city: String,
    region: String,
    country: {
      type: String,
      default: 'Guinée'
    }
  },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true }
    },
    searchAlerts: [{
      name: String,
      criteria: {
        type: String,
        category: String,
        location: String,
        minPrice: Number,
        maxPrice: Number,
        bedrooms: Number,
        bathrooms: Number
      },
      isActive: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now }
    }]
  },
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property'
  }],
  lastLogin: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date
  ,
  // Champs pour la réinitialisation de mot de passe (OTP)
  resetOTP: {
    type: String,
    default: null
  },
  resetOTPExpires: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances
userSchema.index({ phone: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Virtual pour vérifier si le compte est verrouillé
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Middleware pour hasher le mot de passe avant sauvegarde
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!candidatePassword || !this.password) return false;
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Erreur lors de la comparaison des mots de passe:', error);
    return false;
  }
};

// Méthode pour incrémenter les tentatives de connexion
userSchema.methods.incLoginAttempts = function() {
  // Si nous avons une date de verrouillage précédente et qu'elle est expirée, redémarrer à 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Si nous atteignons le maximum de tentatives et qu'il n'y a pas de verrouillage, verrouiller le compte
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // Verrouiller pendant 2 heures
  }
  
  return this.updateOne(updates);
};

// Méthode pour réinitialiser les tentatives de connexion
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

// Méthode pour obtenir les informations publiques de l'utilisateur
userSchema.methods.getPublicProfile = function() {
  const userObject = {
    id: this._id,
    _id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    phone: this.phone,
    role: this.role,
    avatar: this.avatar,
    isVerified: this.isVerified,
    createdAt: this.createdAt,
    favorites: this.favorites || []
  };
  return userObject;
};

module.exports = mongoose.model('User', userSchema);