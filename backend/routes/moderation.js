// Routes pour la modération des propriétés (admin)
router.put(
  '/properties/:id/moderate',
  auth,
  canModerateContent,
  [
    body('status').isIn(['validee', 'rejetee']).withMessage('Statut de modération invalide'),
    body('rejectionReason')
      .if(body('status').equals('rejetee'))
      .notEmpty()
      .withMessage('Raison du rejet requise pour les annonces rejetées')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
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

      // Mise à jour du statut et des informations de modération
      // Normalize status values to internal representation and set approval/featured flags
      if (req.body.status === 'validee') {
        property.status = 'active';
        property.isApproved = true;
        // admin may send featured boolean to mark as featured during moderation
        property.isFeatured = !!req.body.featured;
      } else if (req.body.status === 'rejetee') {
        property.status = 'rejected';
        property.isApproved = false;
        property.isFeatured = false;
      } else {
        property.status = req.body.status;
      }

      property.moderationInfo = {
        moderatedBy: req.user.id,
        moderatedAt: new Date(),
        rejectionReason: req.body.status === 'rejetee' ? req.body.rejectionReason : null,
        moderationNotes: req.body.moderationNotes || null
      };

      // Ensure publishedAt / expiresAt when approved
      if (property.status === 'active') {
        property.publishedAt = property.publishedAt || new Date();
        if (!property.expiresAt || property.expiresAt < new Date()) {
          property.expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        }
      }

      await property.save();

      // Envoyer une notification au propriétaire
      await createNotification({
        userId: property.owner,
        title: `Votre annonce "${property.title}" a été ${req.body.status === 'validee' ? 'validée' : 'rejetée'}`,
        message: req.body.status === 'validee' 
          ? 'Votre annonce a été validée et est maintenant visible sur la plateforme.'
          : `Votre annonce a été rejetée. Raison : ${req.body.rejectionReason}`,
        type: 'property_moderation',
        link: `/properties/${property._id}`
      });

      res.json({
        success: true,
        message: `Propriété ${req.body.status === 'validee' ? 'validée' : 'rejetée'} avec succès`,
        property
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la modération de la propriété',
        error: error.message
      });
    }
  }
);
