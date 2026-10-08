const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  meter: { type: mongoose.Schema.Types.ObjectId, ref: 'Meter', required: true },
  quantityKwh: { type: Number, required: true, min: 0 },
  remainingKwh: { type: Number, required: true, min: 0 },
  askPricePerKwh: { type: Number, required: true, min: 0 },
  windowStart: { type: Date, required: true },
  windowEnd: { type: Date, required: true },
  zone: { type: String, required: true },
  status: {
    type: String,
    enum: ['open', 'matched', 'cancelled', 'expired'],
    default: 'open'
  }
}, { timestamps: true });

module.exports = mongoose.model('Listing', listingSchema);
