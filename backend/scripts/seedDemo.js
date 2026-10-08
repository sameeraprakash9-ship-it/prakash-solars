require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Meter = require('../models/Meter');
const Reading = require('../models/Reading');
const WalletEntry = require('../models/WalletEntry');
const PricingRule = require('../models/PricingRule');
const GridConfig = require('../models/GridConfig');
const Listing = require('../models/Listing');

const demoAccounts = [
  { name: 'Sunwise Demo Admin', email: 'admin@sunwise.test', role: 'admin' },
  { name: 'Sunwise Demo Consumer', email: 'consumer@sunwise.test', role: 'consumer' },
  { name: 'Sunwise Demo Prosumer', email: 'prosumer@sunwise.test', role: 'prosumer' }
];

async function seedUser({ name, email, role }, password) {
  let user = await User.findOne({ email });
  if (!user) {
    user = new User({
      name,
      email,
      role,
      password,
      zone: 'zone-1',
      walletBalance: role === 'consumer' ? 250 : 0
    });
    await user.save();
    if (role === 'consumer') {
      await WalletEntry.create({
        user: user._id,
        type: 'topup',
        amount: 250,
        balanceAfter: 250
      });
    }
    return user;
  }

  user.name = name;
  user.role = role;
  user.zone = 'zone-1';
  if (!(await user.matchPassword(password))) {
    user.password = password;
  }
  await user.save();
  return user;
}

async function seedProsumerReadings(user, dayOffset = 0) {
  const meter = await Meter.findOneAndUpdate(
    { serialNo: 'SUNWISE-DEMO-PROSUMER-001' },
    {
      $set: {
        owner: user._id,
        type: 'generation',
        capacityKw: 8,
        zone: 'zone-1',
        isDemo: true,
        solarPanelModel: 'Illustrative 500 W panel · demo sample',
        solarPanelCount: 16,
        solarDescription: 'DEMO ONLY — this is simulated offer data, not a real seller or solar installation. Sample calculation: 16 illustrative 500 W panels = 8 kW. The example quantity, price, and generation readings are not real-world offers or measurements.'
      }
    },
    { upsert: true, new: true, runValidators: true }
  );

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + dayOffset);
  const operations = Array.from({ length: 24 }, (_, hour) => {
    const solarShape = hour >= 6 && hour <= 18
      ? Math.sin(Math.PI * (hour - 6) / 12)
      : 0;
    const generatedKwh = Number((meter.capacityKw * solarShape * 0.8).toFixed(3));
    return {
      updateOne: {
        filter: { meter: meter._id, timestamp: new Date(start.getTime() + hour * 3600000) },
        update: { $set: { generatedKwh, consumedKwh: 0, source: 'simulated' } },
        upsert: true
      }
    };
  });
  await Reading.bulkWrite(operations);
  return meter;
}

async function seedMarketplaceListing(user, meter) {
  const windowStart = new Date();
  windowStart.setHours(0, 0, 0, 0);
  windowStart.setDate(windowStart.getDate() + 1);
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + 1);

  const existing = await Listing.findOne({
    seller: user._id,
    meter: meter._id,
    windowStart,
    windowEnd
  });
  if (existing) return;

  const [totals] = await Reading.aggregate([
    { $match: { meter: meter._id, timestamp: { $gte: windowStart, $lt: windowEnd } } },
    {
      $group: {
        _id: null,
        generatedKwh: { $sum: '$generatedKwh' },
        consumedKwh: { $sum: '$consumedKwh' }
      }
    }
  ]);
  const availableSurplus = Math.max(
    0,
    (totals?.generatedKwh || 0) - (totals?.consumedKwh || 0)
  );
  const quantityKwh = Math.min(10, Number(availableSurplus.toFixed(3)));
  if (!quantityKwh) return;

  await Listing.create({
    seller: user._id,
    meter: meter._id,
    quantityKwh,
    remainingKwh: quantityKwh,
    askPricePerKwh: 0.15,
    windowStart,
    windowEnd,
    zone: meter.zone
  });
}

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo accounts may only be created outside production.');
  }
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error('Set DEMO_PASSWORD to at least 12 characters in backend/.env.');
  }
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required.');
  }

  await mongoose.connect(process.env.MONGO_URI);
  const users = new Map();
  for (const account of demoAccounts) {
    users.set(account.role, await seedUser(account, password));
  }

  await PricingRule.findOneAndUpdate(
    { key: 'default' },
    {
      $setOnInsert: {
        key: 'default',
        basePrice: 0.15,
        floor: 0.05,
        ceiling: 0.5,
        peakHours: [17, 18, 19, 20],
        peakMultiplier: 1.25,
        sensitivityK: 0.2
      }
    },
    { upsert: true, runValidators: true }
  );

  await GridConfig.findOneAndUpdate(
    { key: 'default' },
    {
      $setOnInsert: {
        key: 'default',
        zones: [{ zone: 'zone-1', capacityKw: 500, tradingStartHour: 0, tradingEndHour: 23 }],
        platformFeePercent: 2,
        emissionFactor: 0.4
      }
    },
    { upsert: true, runValidators: true }
  );

  const prosumer = users.get('prosumer');
  await seedProsumerReadings(prosumer);
  const marketplaceMeter = await seedProsumerReadings(prosumer, 1);
  await seedMarketplaceListing(prosumer, marketplaceMeter);
  console.log('Local demo accounts, pricing, grid settings, solar readings, and marketplace surplus are ready.');
}

seed()
  .catch(error => {
    console.error(`Unable to prepare local demo data: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
