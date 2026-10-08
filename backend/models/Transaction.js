const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  match: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true,
    unique: true
  },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contractedKwh: { type: Number, required: true, min: 0 },
  deliveredKwh: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
  fee: { type: Number, required: true, min: 0 },
  status: { type: String, required: true, default: 'settled' }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
