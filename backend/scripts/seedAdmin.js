require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const seedAdmin = async () => {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = 'Grid Admin', MONGO_URI } = process.env;
  if (!MONGO_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('MONGO_URI, ADMIN_EMAIL, and ADMIN_PASSWORD are required');
  }
  if (ADMIN_PASSWORD.length < 6)
    throw new Error('ADMIN_PASSWORD must contain at least 6 characters');

  await mongoose.connect(MONGO_URI);
  const email = ADMIN_EMAIL.trim().toLowerCase();
  const existingAdmin = await User.findOne({ email });
  if (existingAdmin) {
    console.log(`Administrator already exists: ${email}`);
    return;
  }

  await User.create({
    name: ADMIN_NAME.trim(),
    email,
    password: ADMIN_PASSWORD,
    role: 'admin'
  });
  console.log(`Administrator created: ${email}`);
};

seedAdmin()
  .catch(error => {
    console.error('Unable to seed administrator:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0)
      await mongoose.disconnect();
  });
