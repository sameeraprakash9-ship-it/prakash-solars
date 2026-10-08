const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quantityKwh: { type: Number, required: true, min: 0 },
  remainingKwh: { type: Number, required: true, min: 0 },
  maxPricePerKwh: { type: Number, required: true, min: 0 },
  windowStart: { type: Date, required: true },
  windowEnd: { type: Date, required: true },
  zone: { type: String, required: true },
  status: {
    type: String,
    enum: ['open', 'matched', 'cancelled'],
    default: 'open'
  }
}, { timestamps: true });

module.exports = mongoose.model('Bid', bidSchema);
