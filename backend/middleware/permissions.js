const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Non autorisé - Authentification requise'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé - Permissions insuffisantes'
      });
    }

    next();
  };
};

const checkPropertyOwnership = async (req, res, next) => {
  try {
    const propertyId = req.params.id;
    const property = await Property.findById(propertyId);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Propriété non trouvée'
      });
    }

    // Permettre aux admins d'accéder à toutes les propriétés
    if (req.user.role === 'admin') {
      return next();
    }

    // Vérifier si l'utilisateur est le propriétaire
    if (property.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé - Vous n\'êtes pas le propriétaire de cette annonce'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification des permissions',
      error: error.message
    });
  }
};

const canModerateContent = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Non autorisé - Seuls les administrateurs peuvent modérer le contenu'
    });
  }
  next();
};

module.exports = {
  checkRole,
  checkPropertyOwnership,
  canModerateContent
};
