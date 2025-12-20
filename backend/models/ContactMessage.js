const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  firstName: { type: String, required: false },
  lastName: { type: String, required: false },
  email: { type: String, required: false },
  phone: { type: String, required: false },
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: false },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  status: { type: String, enum: ['nouveau', 'lu', 'traite'], default: 'nouveau' }
}, {
  timestamps: true
});

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
