const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware d'authentification
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!process.env.JWT_SECRET) {
      console.warn('⚠️ WARNING: JWT_SECRET not set in environment. Using fallback secret for token verification. Define JWT_SECRET to avoid this behavior.');
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Accès refusé. Token manquant.'
      });
    }

    // Use fallback secret if JWT_SECRET missing (development-safe)
    const secret = process.env.JWT_SECRET || 'dev_jwt_secret_for_local_testing_only';
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, message: 'Token invalide.' });
      }
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Token expiré. Veuillez vous reconnecter.' });
      }
      throw err;
    }
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token invalide. Utilisateur non trouvé.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Compte désactivé. Contactez l\'administrateur.'
      });
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      userType: user.userType,
      firstName: user.firstName,
      lastName: user.lastName
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token invalide.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expiré. Veuillez vous reconnecter.'
      });
    }

    console.error('Erreur middleware auth:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'authentification'
    });
  }
};

// Middleware d'autorisation par rôle
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    // Convertir en tableau si c'est une chaîne
    if (typeof roles === 'string') {
      roles = [roles];
    }

    // Vérifier si l'utilisateur a l'un des rôles requis
    const hasRole = roles.includes(req.user.role) || roles.includes(req.user.userType);

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé. Permissions insuffisantes.'
      });
    }

    next();
  };
};

// Middleware optionnel d'authentification (pour les routes publiques qui peuvent bénéficier d'infos utilisateur)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');

      if (user && user.isActive) {
        req.user = {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
          userType: user.userType,
          name: user.name
        };
      }
    }

    next();
  } catch (error) {
    // En cas d'erreur, on continue sans utilisateur authentifié
    next();
  }
};

module.exports = {
  auth,
  authorize,
  optionalAuth
};