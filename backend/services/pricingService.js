const PricingRule = require('../models/PricingRule');
const PriceSnapshot = require('../models/PriceSnapshot');
const Reading = require('../models/Reading');

const calculatePrice = (rule, supply, demand, hour) => {
  let price;

  if (supply === 0) {
    price = demand > 0 ? rule.ceiling : rule.basePrice;
  } else {
    price = rule.basePrice *
      (1 + rule.sensitivityK * (demand - supply) / supply);
  }

  if (rule.peakHours.includes(hour))
    price *= rule.peakMultiplier;

  return Number(Math.min(rule.ceiling, Math.max(rule.floor, price)).toFixed(3));
};

const createCurrentPriceSnapshot = async () => {
  const rule = await PricingRule.findOne({ key: 'default' });
  if (!rule) {
    const error = new Error('Pricing rule has not been configured');
    error.status = 503;
    throw error;
  }

  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const [totals] = await Reading.aggregate([
    { $match: { timestamp: { $gte: hourAgo, $lte: now } } },
    {
      $group: {
        _id: null,
        supply: { $sum: '$generatedKwh' },
        demand: { $sum: '$consumedKwh' }
      }
    }
  ]);

  const supply = totals?.supply || 0;
  const demand = totals?.demand || 0;
  const price = calculatePrice(rule, supply, demand, now.getUTCHours());

  return PriceSnapshot.create({ price, supply, demand });
};

module.exports = {
  calculatePrice,
  createCurrentPriceSnapshot
};
