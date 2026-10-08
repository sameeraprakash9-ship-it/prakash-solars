const PricingRule = require('../models/PricingRule');
const PriceSnapshot = require('../models/PriceSnapshot');
const Reading = require('../models/Reading');
const {
  calculatePrice,
  createCurrentPriceSnapshot
} = require('../services/pricingService');

const ruleFields = [
  'basePrice',
  'floor',
  'ceiling',
  'peakHours',
  'peakMultiplier',
  'sensitivityK'
];

exports.getPricingRule = async (req, res, next) => {
  try {
    const rule = await PricingRule.findOne({ key: 'default' });
    if (!rule)
      return res.status(404).json({ message: 'Pricing rule has not been configured' });

    res.json(rule);
  } catch (error) {
    next(error);
  }
};

exports.setPricingRule = async (req, res, next) => {
  try {
    const body = req.body || {};
    const fields = Object.keys(body);
    if (
      fields.length !== ruleFields.length ||
      fields.some(field => !ruleFields.includes(field))
    ) {
      return res.status(400).json({
        message: 'Provide basePrice, floor, ceiling, peakHours, peakMultiplier, and sensitivityK'
      });
    }

    const { basePrice, floor, ceiling, peakHours, peakMultiplier, sensitivityK } = body;
    const numericValues = [basePrice, floor, ceiling, peakMultiplier, sensitivityK];
    if (!numericValues.every(value => Number.isFinite(Number(value))))
      return res.status(400).json({ message: 'Pricing values must be finite numbers' });
    if (
      Number(basePrice) <= 0 ||
      Number(floor) <= 0 ||
      Number(ceiling) <= 0 ||
      Number(floor) >= Number(ceiling) ||
      Number(basePrice) < Number(floor) ||
      Number(basePrice) > Number(ceiling) ||
      Number(peakMultiplier) <= 0 ||
      Number(sensitivityK) <= 0
    ) {
      return res.status(400).json({ message: 'Pricing values are outside valid ranges' });
    }
    if (
      !Array.isArray(peakHours) ||
      peakHours.some(hour => !Number.isInteger(hour) || hour < 0 || hour > 23) ||
      new Set(peakHours).size !== peakHours.length
    ) {
      return res.status(400).json({
        message: 'peakHours must contain unique UTC hours from 0 through 23'
      });
    }

    const rule = await PricingRule.findOneAndUpdate(
      { key: 'default' },
      {
        $set: {
          basePrice: Number(basePrice),
          floor: Number(floor),
          ceiling: Number(ceiling),
          peakHours,
          peakMultiplier: Number(peakMultiplier),
          sensitivityK: Number(sensitivityK)
        },
        $setOnInsert: { key: 'default' }
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.json(rule);
  } catch (error) {
    next(error);
  }
};

exports.getCurrentPrice = async (req, res, next) => {
  try {
    res.json(await createCurrentPriceSnapshot());
  } catch (error) {
    next(error);
  }
};

exports.recalculatePrice = async (req, res, next) => {
  try {
    const snapshot = await createCurrentPriceSnapshot();
    res.status(201).json(snapshot);
  } catch (error) {
    next(error);
  }
};

exports.getPriceForecast = async (req, res, next) => {
  try {
    const rule = await PricingRule.findOne({ key: 'default' });
    if (!rule)
      return res.status(503).json({ message: 'Pricing rule has not been configured' });

    const hourlyAverages = await Reading.aggregate([
      {
        $group: {
          _id: {
            $dateTrunc: {
              date: '$timestamp',
              unit: 'hour',
              timezone: 'UTC'
            }
          },
          supply: { $sum: '$generatedKwh' },
          demand: { $sum: '$consumedKwh' }
        }
      },
      {
        $group: {
          _id: { $hour: { date: '$_id', timezone: 'UTC' } },
          supply: { $avg: '$supply' },
          demand: { $avg: '$demand' }
        }
      }
    ]);

    const averagesByHour = new Map(
      hourlyAverages.map(item => [item._id, item])
    );
    const firstHour = new Date();
    firstHour.setUTCMinutes(0, 0, 0);
    firstHour.setUTCHours(firstHour.getUTCHours() + 1);

    const forecast = Array.from({ length: 24 }, (_, index) => {
      const period = new Date(firstHour.getTime() + index * 60 * 60 * 1000);
      const historicalAverage = averagesByHour.get(period.getUTCHours());
      const supply = historicalAverage?.supply || 0;
      const demand = historicalAverage?.demand || 0;

      return {
        period,
        supply: Number(supply.toFixed(3)),
        demand: Number(demand.toFixed(3)),
        price: calculatePrice(rule, supply, demand, period.getUTCHours())
      };
    });

    res.json(forecast);
  } catch (error) {
    next(error);
  }
};

exports.getPriceHistory = async (req, res, next) => {
  try {
    const hours = Number(req.query.hours === undefined ? 24 : req.query.hours);
    if (!Number.isInteger(hours) || hours < 1)
      return res.status(400).json({ message: 'hours must be a positive integer' });

    const now = new Date();
    const from = new Date(now.getTime() - hours * 60 * 60 * 1000);
    const snapshots = await PriceSnapshot.find({
      createdAt: { $gte: from, $lte: now }
    }).sort({ createdAt: 1 });

    res.json(snapshots);
  } catch (error) {
    next(error);
  }
};
