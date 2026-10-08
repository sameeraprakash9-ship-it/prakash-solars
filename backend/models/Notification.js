const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: [
      'match_created',
      'match_confirmed',
      'match_rejected',
      'settlement_completed',
      'dispute_comment',
      'dispute_resolved'
    ],
    required: true
  },
  message: { type: String, required: true, trim: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
