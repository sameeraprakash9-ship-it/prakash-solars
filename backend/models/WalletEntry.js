const mongoose = require('mongoose');

const walletEntrySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['topup', 'debit', 'credit', 'fee', 'refund'],
    required: true
  },
  amount: { type: Number, required: true, min: 0 },
  reference: { type: mongoose.Schema.Types.ObjectId },
  balanceAfter: { type: Number, required: true, min: 0 }
}, { timestamps: true });

module.exports = mongoose.model('WalletEntry', walletEntrySchema);
