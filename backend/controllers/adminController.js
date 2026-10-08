const User = require('../models/User');
const mongoose = require('mongoose');
const Meter = require('../models/Meter');
const Reading = require('../models/Reading');
const GridConfig = require('../models/GridConfig');
const Transaction = require('../models/Transaction');
const Dispute = require('../models/Dispute');

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.listUsers = async (req, res, next) => {
  try {
    const { role, status, search } = req.query;
    const validRoles = ['prosumer', 'consumer', 'admin'];
    const validStatuses = ['active', 'suspended'];

    if (role && !validRoles.includes(role))
      return res.status(400).json({ message: 'Invalid role filter' });
    if (status && !validStatuses.includes(status))
      return res.status(400).json({ message: 'Invalid status filter' });
    if (search !== undefined && typeof search !== 'string')
      return res.status(400).json({ message: 'search must be a string' });

    const page = Number(req.query.page === undefined ? 1 : req.query.page);
    const limit = Number(req.query.limit === undefined ? 20 : req.query.limit);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1)
      return res.status(400).json({ message: 'page and limit must be positive integers' });

    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [{ name: searchRegex }, { email: searchRegex }];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter)
    ]);

    res.json({
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.setUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: 'Invalid user ID' });
    if (!['active', 'suspended'].includes(status))
      return res.status(400).json({ message: 'status must be active or suspended' });
    if (status === 'suspended' && req.user._id.equals(id))
      return res.status(400).json({ message: 'You cannot suspend your own account' });

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user)
      return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (error) {
    next(error);
  }
};

exports.listMeters = async (req, res, next) => {
  try {
    const [meters, anomalies] = await Promise.all([
      Meter.find()
        .populate('owner', 'name email role status')
        .sort({ createdAt: -1 }),
      Reading.aggregate([
        {
          $lookup: {
            from: 'meters',
            localField: 'meter',
            foreignField: '_id',
            as: 'meter'
          }
        },
        { $unwind: '$meter' },
        {
          $addFields: {
            capacityExceeded: {
              $gt: ['$generatedKwh', '$meter.capacityKw']
            },
            nightGeneration: {
              $and: [
                { $gt: ['$generatedKwh', 0] },
                {
                  $or: [
                    {
                      $gte: [
                        { $hour: { date: '$timestamp', timezone: 'UTC' } },
                        20
                      ]
                    },
                    {
                      $lt: [
                        { $hour: { date: '$timestamp', timezone: 'UTC' } },
                        5
                      ]
                    }
                  ]
                }
              ]
            }
          }
        },
        {
          $facet: {
            capacity: [
              { $match: { capacityExceeded: true } },
              { $sort: { timestamp: 1 } },
              {
                $group: {
                  _id: '$meter._id',
                  count: { $sum: 1 },
                  example: {
                    $first: {
                      timestamp: '$timestamp',
                      generatedKwh: '$generatedKwh'
                    }
                  }
                }
              }
            ],
            night: [
              { $match: { nightGeneration: true } },
              { $sort: { timestamp: 1 } },
              {
                $group: {
                  _id: '$meter._id',
                  count: { $sum: 1 },
                  example: {
                    $first: {
                      timestamp: '$timestamp',
                      generatedKwh: '$generatedKwh'
                    }
                  }
                }
              }
            ]
          }
        }
      ])
    ]);

    const flagResults = anomalies[0] || { capacity: [], night: [] };
    const anomaliesByMeter = new Map();
    for (const anomaly of flagResults.capacity) {
      anomaliesByMeter.set(anomaly._id.toString(), {
        ...(anomaliesByMeter.get(anomaly._id.toString()) || {}),
        capacity: anomaly
      });
    }
    for (const anomaly of flagResults.night) {
      anomaliesByMeter.set(anomaly._id.toString(), {
        ...(anomaliesByMeter.get(anomaly._id.toString()) || {}),
        night: anomaly
      });
    }

    if (meters.length > 0) {
      await Meter.bulkWrite(meters.map(meter => ({
        updateOne: {
          filter: { _id: meter._id },
          update: {
            $set: { flagged: anomaliesByMeter.has(meter._id.toString()) }
          }
        }
      })));
    }

    const data = meters.map(meter => {
      const anomaly = anomaliesByMeter.get(meter._id.toString());
      const flagReasons = [];

      if (anomaly?.capacity) {
        flagReasons.push(
          `Generated ${anomaly.capacity.example.generatedKwh} kWh above capacity ${meter.capacityKw} kW in ${anomaly.capacity.count} reading(s); example: ${anomaly.capacity.example.timestamp.toISOString()}.`
        );
      }
      if (anomaly?.night) {
        flagReasons.push(
          `Generation recorded between 20:00 and 05:00 UTC in ${anomaly.night.count} reading(s); example: ${anomaly.night.example.timestamp.toISOString()}.`
        );
      }

      return {
        ...meter.toObject(),
        flagged: Boolean(anomaly),
        flagReasons
      };
    });

    res.json(data);
  } catch (error) {
    next(error);
  }
};

exports.getGridConfig = async (req, res, next) => {
  try {
    const config = await GridConfig.findOne({ key: 'default' });
    if (!config)
      return res.status(404).json({ message: 'Grid configuration has not been set' });

    res.json(config);
  } catch (error) {
    next(error);
  }
};

exports.updateGridConfig = async (req, res, next) => {
  try {
    const body = req.body || {};
    const allowedFields = ['zones', 'platformFeePercent', 'emissionFactor'];
    const fields = Object.keys(body);
    if (
      fields.length !== allowedFields.length ||
      fields.some(field => !allowedFields.includes(field))
    ) {
      return res.status(400).json({
        message: 'Provide zones, platformFeePercent, and emissionFactor'
      });
    }

    if (
      !Array.isArray(body.zones) ||
      !Number.isFinite(body.platformFeePercent) ||
      body.platformFeePercent < 0 ||
      body.platformFeePercent > 100 ||
      !Number.isFinite(body.emissionFactor) ||
      body.emissionFactor < 0
    ) {
      return res.status(400).json({
        message: 'Invalid zones, platformFeePercent, or emissionFactor'
      });
    }

    const zoneNames = new Set();
    for (const zone of body.zones) {
      if (
        !zone ||
        typeof zone.zone !== 'string' ||
        !zone.zone.trim() ||
        !Number.isFinite(zone.capacityKw) ||
        zone.capacityKw < 0 ||
        !Number.isInteger(zone.tradingStartHour) ||
        zone.tradingStartHour < 0 ||
        zone.tradingStartHour > 23 ||
        !Number.isInteger(zone.tradingEndHour) ||
        zone.tradingEndHour < 0 ||
        zone.tradingEndHour > 23 ||
        zoneNames.has(zone.zone.trim())
      ) {
        return res.status(400).json({
          message: 'Each zone needs a unique name, non-negative capacityKw, and trading hours from 0 through 23'
        });
      }
      zoneNames.add(zone.zone.trim());
    }

    const config = await GridConfig.findOneAndUpdate(
      { key: 'default' },
      {
        $set: {
          zones: body.zones.map(zone => ({
            ...zone,
            zone: zone.zone.trim()
          })),
          platformFeePercent: body.platformFeePercent,
          emissionFactor: body.emissionFactor
        },
        $setOnInsert: { key: 'default' }
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.json(config);
  } catch (error) {
    next(error);
  }
};

exports.getAdminReports = async (req, res, next) => {
  try {
    const [roleCounts, transactionReport, openDisputes] = await Promise.all([
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      Transaction.aggregate([
        { $match: { status: 'settled' } },
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  totalKwhTraded: { $sum: '$deliveredKwh' },
                  totalRevenue: { $sum: '$amount' },
                  platformFeeIncome: { $sum: '$fee' }
                }
              },
              { $project: { _id: 0 } }
            ],
            topProsumers: [
              {
                $group: {
                  _id: '$seller',
                  kwhSold: { $sum: '$deliveredKwh' }
                }
              },
              {
                $lookup: {
                  from: 'users',
                  localField: '_id',
                  foreignField: '_id',
                  as: 'prosumer'
                }
              },
              { $unwind: '$prosumer' },
              { $match: { 'prosumer.role': 'prosumer' } },
              { $sort: { kwhSold: -1, _id: 1 } },
              { $limit: 5 },
              {
                $project: {
                  _id: 0,
                  userId: '$prosumer._id',
                  name: '$prosumer.name',
                  email: '$prosumer.email',
                  kwhSold: { $round: ['$kwhSold', 3] }
                }
              }
            ]
          }
        }
      ]),
      Dispute.aggregate([
        { $match: { status: { $in: ['open', 'under_review'] } } },
        { $count: 'count' }
      ])
    ]);

    const usersByRole = { prosumer: 0, consumer: 0, admin: 0 };
    for (const item of roleCounts) {
      if (Object.prototype.hasOwnProperty.call(usersByRole, item._id))
        usersByRole[item._id] = item.count;
    }

    const transactionData = transactionReport[0] || {};
    const disputeCount = openDisputes[0]?.count || 0;
    const totals = transactionData.totals?.[0] || {
      totalKwhTraded: 0,
      totalRevenue: 0,
      platformFeeIncome: 0
    };

    res.json({
      usersByRole,
      totalKwhTraded: Number(totals.totalKwhTraded.toFixed(3)),
      totalRevenue: Number(totals.totalRevenue.toFixed(3)),
      platformFeeIncome: Number(totals.platformFeeIncome.toFixed(3)),
      openDisputes: disputeCount,
      topProsumersByKwhSold: transactionData.topProsumers || []
    });
  } catch (error) {
    next(error);
  }
};
