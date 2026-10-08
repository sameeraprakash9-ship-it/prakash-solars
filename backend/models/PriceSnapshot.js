const mongoose = require('mongoose');

const priceSnapshotSchema = new mongoose.Schema({
  price: { type: Number, required: true, min: 0 },
  supply: { type: Number, required: true, min: 0 },
  demand: { type: Number, required: true, min: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PriceSnapshot', priceSnapshotSchema);
