const mongoose = require('mongoose');
module.exports = mongoose.model('Meter', new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serialNo: { type: String, required: true, unique: true },
  type: { type: String, enum: ['generation', 'consumption', 'bidirectional'], required: true },
  capacityKw: { type: Number, default: 0 },          // solar panel capacity (generation meters)
  zone: { type: String, default: 'zone-1' },
  isDemo: { type: Boolean, default: false, select: false },
  solarPanelBrand: { type: String, trim: true, maxlength: 80 },
  solarPanelModel: { type: String, trim: true, maxlength: 80 },
  solarPanelCount: { type: Number, min: 1, max: 10000 },
  solarInstallationYear: { type: Number, min: 1950, max: 2200 },
  solarDescription: { type: String, trim: true, maxlength: 500 },
  solarPhotos: {
    type: [{
      data: { type: String, required: true, select: false },
      contentType: { type: String, enum: ['image/jpeg', 'image/png', 'image/webp'], required: true }
    }],
    default: []
  },
  solarPhotoData: { type: String, select: false },
  solarPhotoContentType: { type: String, enum: ['image/jpeg', 'image/png', 'image/webp'] },
  flagged: { type: Boolean, default: false }          // used later by admin anomaly check
}, { timestamps: true }));
