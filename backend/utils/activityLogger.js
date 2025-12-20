const ActivityLog = require('../models/ActivityLog');

/**
 * Record an activity log entry. Non-blocking and safe for route use.
 * @param {Object} req - express request (optional)
 * @param {Object} opts - { userId, userEmail, userRole, actionType, actionDescription, targetEntity, targetId }
 */
async function logActivity(req, opts = {}) {
  try {
    const {
      userId,
      userEmail = null,
      userRole = null,
      actionType = 'INSCRIPTION',
      actionDescription = '',
      targetEntity = null,
      targetId = null
    } = opts;

    if (!userId) return; // require userId per schema

    const doc = new ActivityLog({
      userId,
      userEmail,
      userRole,
      actionType,
      actionDescription,
      targetEntity,
      targetId,
      timestamp: new Date()
    });

    await doc.save();
  } catch (err) {
    // Do not throw; just log for server debugging
    console.error('activityLogger error:', err);
  }
}

module.exports = { logActivity };
