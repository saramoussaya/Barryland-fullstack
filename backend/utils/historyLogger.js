const HistoryLog = require('../models/HistoryLog');

/**
 * Log a history event
 * @param {Object} req - Express request (may be null)
 * @param {Object} opts - { userId, userEmail, actionType, actionDetails }
 */
async function logHistory(req, opts = {}) {
  try {
    const { userId = null, userEmail = null, actionType = 'UNKNOWN', actionDetails = {} } = opts;
    const ipAddress = req ? (req.ip || req.headers['x-forwarded-for'] || null) : null;
    const userAgent = req ? (req.get ? req.get('User-Agent') : req.headers['user-agent']) : null;

    const doc = new HistoryLog({
      userId,
      userEmail,
      actionType,
      actionDetails,
      ipAddress,
      userAgent,
      timestamp: new Date()
    });

    await doc.save();
  } catch (error) {
    // Don't fail the main flow on logging errors
    console.error('Erreur lors de l enregistrement de l historique:', error);
  }
}

module.exports = {
  logHistory
};
