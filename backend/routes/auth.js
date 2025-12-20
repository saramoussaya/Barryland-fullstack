const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Le prénom doit contenir entre 2 et 50 caractères'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Le nom doit contenir entre 2 et 50 caractères'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  body('phone')
    .matches(/^\+224[0-9]{8,9}$/)
    .withMessage('Format de téléphone guinéen invalide (+224XXXXXXXX)'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  body('password')
    .notEmpty()
    .withMessage('Le mot de passe est requis')
];

// Generate JWT token (use a development fallback if JWT_SECRET is not set)
const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET || 'dev_jwt_secret_for_local_testing_only';
  if (!process.env.JWT_SECRET) {
    console.warn('⚠️ WARNING: JWT_SECRET is not set. Using development fallback secret. Set JWT_SECRET in environment for production.');
  }

  return jwt.sign({ userId }, secret, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { firstName, lastName, email, phone, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email 
          ? 'Un utilisateur avec cet email existe déjà'
          : 'Un utilisateur avec ce numéro de téléphone existe déjà'
      });
    }

    // Create new user
    const user = new User({
      firstName,
      lastName,
      email,
      phone,
      password
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Prepare user data without sensitive information
    const userData = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role || 'professional'
    };

    // Send welcome email
    try {
      await sendEmail({
        to: user.email,
        template: 'welcome',
        data: {
          userName: `${user.firstName} ${user.lastName}`,
          userType: user.role || 'professional'
        }
      });
    } catch (emailError) {
      console.error('Erreur envoi email de bienvenue:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      data: {
        token,
        user: user.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du compte'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email with password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier si le compte est verrouillé
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Compte temporairement verrouillé. Réessayez plus tard.'
      });
    }

    // Vérifier si le compte est actif
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Compte désactivé. Contactez l\'administrateur.'
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Incrémenter les tentatives de connexion échouées si la méthode existe
      if (user.incLoginAttempts) {
        await user.incLoginAttempts();
      }
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Réinitialiser les tentatives de connexion
    await user.resetLoginAttempts();

    // Générer le token
    const token = generateToken(user._id);

    // Mettre à jour la date de dernière connexion
    await User.updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    );

    // Préparer les données utilisateur
    const userWithFavorites = await User.findById(user._id).populate('favorites');
    const userData = userWithFavorites.getPublicProfile();
    userData.favorites = userWithFavorites.favorites;

    res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      data: {
        token,
        user: userData
      }
    });

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('favorites');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      data: user.getPublicProfile()
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom doit contenir entre 2 et 100 caractères'),
  body('phone')
    .optional()
    .matches(/^\+224[0-9]{8,9}$/)
    .withMessage('Format de téléphone guinéen invalide'),
  body('address.city')
    .optional()
    .isIn([
      'Conakry', 'Kankan', 'Labé', 'Nzérékoré', 'Kindia', 
      'Mamou', 'Boké', 'Faranah', 'Siguiri', 'Guéckédou'
    ])
    .withMessage('Ville invalide')
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

    // Update allowed fields
    const allowedUpdates = ['name', 'phone', 'address', 'preferences'];
    const updates = {};
    
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    Object.assign(user, updates);
    await user.save();

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: {
        user: user.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du profil'
    });
  }
});

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', auth, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Le mot de passe actuel est requis'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères')
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

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe actuel incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Mot de passe modifié avec succès'
    });

  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement de mot de passe'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', auth, (req, res) => {
  res.json({
    success: true,
    message: 'Déconnexion réussie'
  });
});

// @route POST /api/auth/forgot-password
// @desc  Demander un code OTP pour réinitialisation de mot de passe
// @access Public
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Email invalide' });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Aucun compte trouvé avec cet email' });
    }

    // Générer un OTP (6 chiffres) et l'enregistrer avec expiration
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.resetOTP = otp;
    user.resetOTPExpires = expires;
    await user.save();

    // Envoyer l'email
    try {
      await sendEmail({
        to: user.email,
        template: 'forgot-password',
        data: { userName: `${user.firstName} ${user.lastName}`, code: otp, expiresMinutes: 15 }
      });
    } catch (emailErr) {
      // Log détaillé pour faciliter le debug local
      console.error('Erreur envoi OTP email:', emailErr);
      const devMessage = process.env.NODE_ENV === 'production' ? 'Impossible d\'envoyer l\'email' : `Impossible d'envoyer l'email: ${emailErr.message || emailErr}`;
      return res.status(500).json({ success: false, message: devMessage });
    }

    res.json({ success: true, message: 'Code OTP envoyé à votre email' });
  } catch (error) {
    console.error('Erreur forgot-password:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// @route POST /api/auth/verify-otp
// @desc  Vérifier le code OTP envoyé par email
// @access Public
router.post('/verify-otp', [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Données invalides' });

    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'Aucun compte trouvé' });

    if (!user.resetOTP || !user.resetOTPExpires || user.resetOTP !== otp || user.resetOTPExpires < Date.now()) {
      return res.status(400).json({ success: false, message: 'OTP invalide ou expiré' });
    }

    // OTP valide -> répondre positivement
    // Pour plus de sécurité, on peut supprimer l'OTP ici ou le conserver jusqu'à reset
    res.json({ success: true, message: 'OTP vérifié' });
  } catch (error) {
    console.error('Erreur verify-otp:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// @route POST /api/auth/reset-password
// @desc  Réinitialiser le mot de passe en fournissant email, otp et nouveau mot de passe
// @access Public
router.post('/reset-password', [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP invalide'),
  body('newPassword').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Données invalides', errors: errors.array() });

    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email }).select('+password +resetOTP +resetOTPExpires');
    if (!user) return res.status(404).json({ success: false, message: 'Aucun compte trouvé' });

    if (!user.resetOTP || !user.resetOTPExpires || user.resetOTP !== otp || user.resetOTPExpires < Date.now()) {
      return res.status(400).json({ success: false, message: 'OTP invalide ou expiré' });
    }

    // Mettre à jour le mot de passe
    user.password = newPassword;
    user.resetOTP = null;
    user.resetOTPExpires = null;
    await user.save();

    res.json({ success: true, message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    console.error('Erreur reset-password:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;