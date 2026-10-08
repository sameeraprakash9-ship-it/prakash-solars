const mongoose = require('mongoose');

const disputeCommentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now }
});

const disputeSchema = new mongoose.Schema({
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true,
    index: true
  },
  raisedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: { type: String, required: true, trim: true },
  evidence: { type: [String], default: [] },
  status: {
    type: String,
    enum: ['open', 'under_review', 'resolved', 'rejected'],
    default: 'open'
  },
  resolution: { type: String, trim: true, default: '' },
  comments: { type: [disputeCommentSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Dispute', disputeSchema);
