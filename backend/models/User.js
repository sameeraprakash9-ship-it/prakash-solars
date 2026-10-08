const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpires: { type: Date, select: false },
  role: { type: String, enum: ['prosumer', 'consumer', 'admin'], default: 'consumer' },
  zone: { type: String, default: 'zone-1' },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  walletBalance: { type: Number, default: 0 },
  notificationPrefs: {
    match: { type: Boolean, default: true },
    settlement: { type: Boolean, default: true },
    dispute: { type: Boolean, default: true },
    price: { type: Boolean, default: true },
    grid: { type: Boolean, default: true },
    all: { type: Boolean, default: true }
  }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
userSchema.methods.matchPassword = function (p) { return bcrypt.compare(p, this.password); };

module.exports = mongoose.model('User', userSchema);
