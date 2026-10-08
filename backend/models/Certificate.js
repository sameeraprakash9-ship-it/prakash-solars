const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  certNo: { type: String, required: true, unique: true },
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true,
    unique: true
  },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  kwh: { type: Number, required: true, min: 0 },
  co2AvoidedKg: { type: Number, required: true, min: 0 },
  hash: { type: String, required: true },
  issuedAt: { type: Date, required: true, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Certificate', certificateSchema);
