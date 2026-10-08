const mongoose = require('mongoose');

const zoneConfigSchema = new mongoose.Schema({
  zone: { type: String, required: true, trim: true },
  capacityKw: { type: Number, required: true, min: 0 },
  tradingStartHour: { type: Number, required: true, min: 0, max: 23 },
  tradingEndHour: { type: Number, required: true, min: 0, max: 23 }
}, { _id: false });

const gridConfigSchema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true, select: false },
  zones: { type: [zoneConfigSchema], default: [] },
  platformFeePercent: { type: Number, required: true, min: 0, max: 100 },
  emissionFactor: { type: Number, required: true, min: 0 }
}, { timestamps: true });

module.exports = mongoose.model('GridConfig', gridConfigSchema);
