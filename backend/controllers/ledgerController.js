const Transaction = require('../models/Transaction');

exports.getLedgerSummary = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const createdAt = {};

    if (from) {
      createdAt.$gte = new Date(from);
      if (Number.isNaN(createdAt.$gte.getTime()))
        return res.status(400).json({ message: 'Invalid from date' });
    }
    if (to) {
      createdAt.$lte = new Date(to);
      if (Number.isNaN(createdAt.$lte.getTime()))
        return res.status(400).json({ message: 'Invalid to date' });
    }
    if (createdAt.$gte && createdAt.$lte && createdAt.$gte > createdAt.$lte)
      return res.status(400).json({ message: 'from must be before or equal to to' });

    const matchFilter = { status: 'settled' };
    if (Object.keys(createdAt).length > 0)
      matchFilter.createdAt = createdAt;

    let roleFilter;
    let resultFields;

    if (req.user.role === 'prosumer') {
      roleFilter = { seller: req.user._id };
      resultFields = {
        totalEarned: { $sum: { $subtract: ['$amount', '$fee'] } },
        totalKwhSold: { $sum: '$deliveredKwh' },
        feesPaid: { $sum: '$fee' }
      };
    } else if (req.user.role === 'consumer') {
      roleFilter = { buyer: req.user._id };
      resultFields = {
        totalSpent: { $sum: '$amount' },
        totalKwhBought: { $sum: '$deliveredKwh' }
      };
    } else if (req.user.role === 'admin') {
      roleFilter = {};
      resultFields = {
        totalVolume: { $sum: '$amount' },
        totalKwhTraded: { $sum: '$deliveredKwh' },
        feeIncome: { $sum: '$fee' }
      };
    } else {
      return res.status(403).json({ message: 'Forbidden for your role' });
    }

    const [summary] = await Transaction.aggregate([
      { $match: { ...matchFilter, ...roleFilter } },
      { $group: { _id: null, ...resultFields } },
      { $project: { _id: 0 } }
    ]);

    res.json(summary || Object.fromEntries(
      Object.keys(resultFields).map(field => [field, 0])
    ));
  } catch (error) {
    next(error);
  }
};
