const mongoose = require('mongoose');

const pricingRuleSchema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true, select: false },
  basePrice: { type: Number, required: true, min: 0 },
  floor: { type: Number, required: true, min: 0 },
  ceiling: { type: Number, required: true, min: 0 },
  peakHours: {
    type: [{ type: Number, min: 0, max: 23 }],
    required: true
  },
  peakMultiplier: { type: Number, required: true, min: 0 },
  sensitivityK: { type: Number, required: true, min: 0 }
}, { timestamps: true });

module.exports = mongoose.model('PricingRule', pricingRuleSchema);
