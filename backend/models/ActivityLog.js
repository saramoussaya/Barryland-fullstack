const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userEmail: { type: String, default: null },
  userRole: { type: String, default: null },
  actionType: {
    type: String,
    enum: [
      'CONNEXION',
      'DÉCONNEXION',
      'INSCRIPTION',
      'PUBLICATION_ANNONCE',
      'MODIFICATION_ANNONCE',
      'SUPPRESSION_ANNONCE',
      'MODIFICATION_PROFIL',
      'AJOUT_FAVORIS',
      'ENVOI_MESSAGE',
      'DÉBUT_TRANSACTION',
      'ACHÈVEMENT_TRANSACTION'
    ],
    required: true
  },
  actionDescription: { type: String, default: '' },
  targetEntity: { type: String, default: null },
  targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
  timestamp: { type: Date, default: Date.now, index: true }
});

activityLogSchema.index({ userId: 1 });
activityLogSchema.index({ actionType: 1 });
activityLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
