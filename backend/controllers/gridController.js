const Reading = require('../models/Reading');
const Meter = require('../models/Meter');
const GridConfig = require('../models/GridConfig');

exports.getCurrentLoad = async (req, res, next) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [totals] = await Reading.aggregate([
      {
        $match: {
          timestamp: { $gte: oneHourAgo, $lte: now }
        }
      },
      {
        $group: {
          _id: null,
          totalGenerationKwh: { $sum: '$generatedKwh' },
          totalDemandKwh: { $sum: '$consumedKwh' }
        }
      },
      {
        $project: {
          _id: 0,
          totalGenerationKwh: { $round: ['$totalGenerationKwh', 3] },
          totalDemandKwh: { $round: ['$totalDemandKwh', 3] }
        }
      }
    ]);

    const totalGenerationKwh = totals?.totalGenerationKwh || 0;
    const totalDemandKwh = totals?.totalDemandKwh || 0;
    const netKwh = +(totalGenerationKwh - totalDemandKwh).toFixed(3);
    const status = netKwh > 0
      ? 'surplus'
      : netKwh < 0
        ? 'deficit'
        : 'balanced';

    res.json({
      totalGenerationKwh,
      totalDemandKwh,
      netKwh,
      status
    });
  } catch (error) {
    next(error);
  }
};

const getCurrentLoadSnapshot = async () => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const [totals] = await Reading.aggregate([
    { $match: { timestamp: { $gte: oneHourAgo, $lte: now } } },
    {
      $group: {
        _id: null,
        totalGenerationKwh: { $sum: '$generatedKwh' },
        totalDemandKwh: { $sum: '$consumedKwh' }
      }
    },
    {
      $project: {
        _id: 0,
        totalGenerationKwh: { $round: ['$totalGenerationKwh', 3] },
        totalDemandKwh: { $round: ['$totalDemandKwh', 3] }
      }
    }
  ]);

  const totalGenerationKwh = totals?.totalGenerationKwh || 0;
  const totalDemandKwh = totals?.totalDemandKwh || 0;
  const netKwh = +(totalGenerationKwh - totalDemandKwh).toFixed(3);

  return {
    totalGenerationKwh,
    totalDemandKwh,
    netKwh,
    status: netKwh > 0 ? 'surplus' : netKwh < 0 ? 'deficit' : 'balanced'
  };
};

exports.streamCurrentLoad = (req, res) => {
  res.status(200);
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders();

  let closed = false;
  let sending = false;
  let interval;

  const sendLoad = async () => {
    if (closed || sending) return;
    sending = true;

    try {
      const snapshot = await getCurrentLoadSnapshot();
      if (!closed)
        res.write(`event: load\ndata: ${JSON.stringify(snapshot)}\n\n`);
    } catch (error) {
      console.error('Failed to retrieve current grid load for SSE:', error);
      if (!closed) {
        res.write('event: error\ndata: {"message":"Unable to retrieve current grid load"}\n\n');
        closed = true;
        clearInterval(interval);
        res.end();
      }
    } finally {
      sending = false;
    }
  };

  interval = setInterval(sendLoad, 5000);
  res.on('close', () => {
    closed = true;
    clearInterval(interval);
  });

  sendLoad();
};

exports.getLoadHistory = async (req, res, next) => {
  try {
    const hours = Number(req.query.hours === undefined ? 24 : req.query.hours);
    if (!Number.isInteger(hours) || hours < 1)
      return res.status(400).json({ message: 'hours must be a positive integer' });

    const end = new Date();
    const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
    const hourlyTotals = await Reading.aggregate([
      {
        $match: {
          timestamp: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%dT%H:00:00.000Z',
              date: '$timestamp',
              timezone: 'UTC'
            }
          },
          generation: { $sum: '$generatedKwh' },
          demand: { $sum: '$consumedKwh' }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          period: '$_id',
          generation: { $round: ['$generation', 3] },
          demand: { $round: ['$demand', 3] },
          net: { $round: [{ $subtract: ['$generation', '$demand'] }, 3] }
        }
      }
    ]);

    res.json(hourlyTotals);
  } catch (error) {
    next(error);
  }
};

exports.getZoneLoad = async (req, res, next) => {
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 60 * 60 * 1000);

    const zones = await Reading.aggregate([
      {
        $match: {
          timestamp: { $gte: start, $lte: end }
        }
      },
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
        $group: {
          _id: '$meter.zone',
          generation: { $sum: '$generatedKwh' },
          demand: { $sum: '$consumedKwh' }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          zone: '$_id',
          generation: { $round: ['$generation', 3] },
          demand: { $round: ['$demand', 3] },
          net: { $round: [{ $subtract: ['$generation', '$demand'] }, 3] }
        }
      }
    ]);

    res.json(zones);
  } catch (error) {
    next(error);
  }
};

exports.getGridAlerts = async (req, res, next) => {
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 60 * 60 * 1000);

    const zoneTotals = await Meter.aggregate([
      {
        $lookup: {
          from: 'readings',
          let: { meterId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$meter', '$$meterId'] },
                    { $gte: ['$timestamp', start] },
                    { $lte: ['$timestamp', end] }
                  ]
                }
              }
            },
            {
              $group: {
                _id: null,
                generation: { $sum: '$generatedKwh' },
                demand: { $sum: '$consumedKwh' }
              }
            }
          ],
          as: 'recentReadings'
        }
      },
      {
        $addFields: {
          recentGeneration: {
            $ifNull: [{ $arrayElemAt: ['$recentReadings.generation', 0] }, 0]
          },
          recentDemand: {
            $ifNull: [{ $arrayElemAt: ['$recentReadings.demand', 0] }, 0]
          }
        }
      },
      {
        $group: {
          _id: '$zone',
          capacityLimit: { $sum: '$capacityKw' },
          generation: { $sum: '$recentGeneration' },
          demand: { $sum: '$recentDemand' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const gridConfig = await GridConfig.findOne({ key: 'default' });
    const configuredZones = new Map(
      (gridConfig?.zones || []).map(zone => [zone.zone, zone.capacityKw])
    );
    const zonesByName = new Map(
      zoneTotals.map(zone => [zone._id, {
        ...zone,
        capacityLimit: configuredZones.has(zone._id)
          ? configuredZones.get(zone._id)
          : zone.capacityLimit
      }])
    );
    for (const [zone, capacityKw] of configuredZones) {
      if (!zonesByName.has(zone)) {
        zonesByName.set(zone, {
          _id: zone,
          capacityLimit: capacityKw,
          generation: 0,
          demand: 0
        });
      }
    }

    const alerts = [];
    for (const zone of zonesByName.values()) {
      if (zone.demand > zone.capacityLimit) {
        alerts.push({
          zone: zone._id,
          type: 'capacity_limit_exceeded',
          severity: 'high',
          message: `Demand ${zone.demand} kWh exceeds the zone capacity limit of ${zone.capacityLimit} kW`
        });
      }

      if (zone.generation > zone.demand * 1.3) {
        alerts.push({
          zone: zone._id,
          type: 'generation_surplus',
          severity: 'medium',
          message: `Generation ${zone.generation} kWh is more than 30% above demand of ${zone.demand} kWh`
        });
      }
    }

    res.json(alerts);
  } catch (error) {
    next(error);
  }
};
