const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  bid: { type: mongoose.Schema.Types.ObjectId, ref: 'Bid', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quantityKwh: { type: Number, required: true, min: 0 },
  pricePerKwh: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'rejected', 'settled', 'disputed'],
    default: 'pending'
  },
  sellerConfirmed: { type: Boolean, default: false },
  buyerConfirmed: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Match', matchSchema);
