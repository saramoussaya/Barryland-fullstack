const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendEmail } = require('./email');

/**
 * Create a notification for a user and optionally send an email based on user preferences.
 * @param {{userId: string, title: string, message?: string, type?: string, data?: object, link?: string}} opts
 */
async function createNotification(opts = {}) {
  const { userId, title, message = '', type = 'generic', data = {}, link } = opts;
  if (!userId || !title) throw new Error('userId and title are required to create a notification');

  try {
    const user = await User.findById(userId).select('email name preferences');

    const notif = await Notification.create({
      user: userId,
      type,
      title,
      message,
      data: { ...data, link }
    });

    // Send email if user allows email notifications
    try {
      if (user && user.email && user.preferences?.notifications?.email !== false) {
        await sendEmail({
          to: user.email,
          subject: title,
          template: 'generic-notification',
          data: {
            userName: user.name || '',
            title,
            message,
            link: link ? `${process.env.FRONTEND_URL || ''}${link}` : undefined
          }
        });
      }
    } catch (emailErr) {
      // Don't fail the notification creation if email fails
      console.error('Failed to send notification email:', emailErr && emailErr.message ? emailErr.message : emailErr);
    }

    return notif;
  } catch (err) {
    console.error('Error creating notification:', err && err.message ? err.message : err);
    throw err;
  }
}

module.exports = { createNotification };
