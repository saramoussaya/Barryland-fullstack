const mongoose = require('mongoose');

const historyLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  userEmail: { type: String, default: null },
  actionType: { type: String, default: 'UNKNOWN' },
  actionDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null },
  timestamp: { type: Date, default: Date.now, index: true }
});

historyLogSchema.index({ userId: 1 });
historyLogSchema.index({ actionType: 1 });

module.exports = mongoose.model('HistoryLog', historyLogSchema);
