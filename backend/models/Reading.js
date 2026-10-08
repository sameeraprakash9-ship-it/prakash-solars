const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  meter: { type: mongoose.Schema.Types.ObjectId, ref: 'Meter', required: true, index: true },
  timestamp: { type: Date, required: true },
  generatedKwh: { type: Number, default: 0, min: 0 },
  consumedKwh: { type: Number, default: 0, min: 0 },
  source: { type: String, enum: ['manual', 'simulated'], default: 'manual' }
});
schema.index({ meter: 1, timestamp: 1 }, { unique: true });
module.exports = mongoose.model('Reading', schema);
