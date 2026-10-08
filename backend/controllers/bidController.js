const Bid = require('../models/Bid');

exports.listMyBids = async (req, res, next) => {
  try {
    const { status } = req.query;
    const validStatuses = ['open', 'matched', 'cancelled'];
    if (status && !validStatuses.includes(status))
      return res.status(400).json({ message: 'Invalid bid status' });

    const page = Number(req.query.page === undefined ? 1 : req.query.page);
    const limit = Number(req.query.limit === undefined ? 20 : req.query.limit);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1)
      return res.status(400).json({ message: 'page and limit must be positive integers' });

    const filter = { buyer: req.user._id };
    if (status) filter.status = status;
    const pageSize = Math.min(limit, 100);
    const [bids, total] = await Promise.all([
      Bid.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      Bid.countDocuments(filter)
    ]);

    res.json({
      data: bids,
      pagination: {
        page,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.createBid = async (req, res, next) => {
  try {
    const { quantityKwh, maxPricePerKwh, windowStart, windowEnd } = req.body || {};
    const quantity = Number(quantityKwh);
    const maxPrice = Number(maxPricePerKwh);
    const start = new Date(windowStart);
    const end = new Date(windowEnd);

    if (!Number.isFinite(quantity) || quantity <= 0)
      return res.status(400).json({ message: 'quantityKwh must be greater than 0' });
    if (!Number.isFinite(maxPrice) || maxPrice <= 0)
      return res.status(400).json({ message: 'maxPricePerKwh must be greater than 0' });
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end)
      return res.status(400).json({ message: 'A valid windowStart before windowEnd is required' });

    const requiredBalance = quantity * maxPrice;
    if (req.user.walletBalance < requiredBalance)
      return res.status(400).json({
        message: 'Insufficient wallet balance',
        requiredBalance,
        walletBalance: req.user.walletBalance
      });

    const bid = await Bid.create({
      buyer: req.user._id,
      quantityKwh: quantity,
      remainingKwh: quantity,
      maxPricePerKwh: maxPrice,
      windowStart: start,
      windowEnd: end,
      zone: req.user.zone
    });

    res.status(201).json(bid);
  } catch (error) {
    next(error);
  }
};
