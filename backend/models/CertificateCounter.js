const mongoose = require('mongoose');

const certificateCounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  sequence: { type: Number, required: true, default: 0 }
}, { versionKey: false });

module.exports = mongoose.model('CertificateCounter', certificateCounterSchema);
