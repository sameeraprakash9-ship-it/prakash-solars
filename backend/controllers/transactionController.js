const mongoose = require('mongoose');
const Match = require('../models/Match');
const Listing = require('../models/Listing');
const Meter = require('../models/Meter');
const Reading = require('../models/Reading');
const User = require('../models/User');
const WalletEntry = require('../models/WalletEntry');
const Transaction = require('../models/Transaction');
const GridConfig = require('../models/GridConfig');
const notify = require('../services/notificationService');

exports.listTransactions = async (req, res, next) => {
  try {
    const page = Number(req.query.page === undefined ? 1 : req.query.page);
    const limit = Number(req.query.limit === undefined ? 20 : req.query.limit);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1)
      return res.status(400).json({ message: 'page and limit must be positive integers' });

    const filter = req.user.role === 'admin'
      ? {}
      : { $or: [{ buyer: req.user._id }, { seller: req.user._id }] };
    if (req.query.status) filter.status = req.query.status;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('match')
        .populate('buyer', 'name email')
        .populate('seller', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Math.min(limit, 100)),
      Transaction.countDocuments(filter)
    ]);
    const pageSize = Math.min(limit, 100);

    res.json({
      data: transactions,
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

const settlementError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

exports.getTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: 'Invalid transaction ID' });

    const transaction = await Transaction.findById(id)
      .populate('match')
      .populate('buyer', 'name email')
      .populate('seller', 'name email');

    if (!transaction)
      return res.status(404).json({ message: 'Transaction not found' });

    if (
      req.user.role !== 'admin' &&
      !transaction.buyer._id.equals(req.user._id) &&
      !transaction.seller._id.equals(req.user._id)
    ) {
      return res.status(403).json({ message: 'You cannot view this transaction' });
    }

    res.json(transaction);
  } catch (error) {
    next(error);
  }
};

exports.settleMatch = async (req, res, next) => {
  const { matchId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(matchId))
    return res.status(400).json({ message: 'Invalid match ID' });

  let session;

  try {
    session = await mongoose.startSession();
    let transactionId;

    await session.withTransaction(async () => {
      const match = await Match.findById(matchId).session(session);
      if (!match)
        throw settlementError('Match not found', 404);
      if (match.status !== 'confirmed')
        throw settlementError('Only confirmed matches can be settled', 400);

      const listing = await Listing.findById(match.listing).session(session);
      if (!listing)
        throw settlementError('Listing not found', 404);

      const meter = await Meter.findById(listing.meter).session(session);
      if (!meter)
        throw settlementError('Seller meter not found', 404);
      if (!meter.owner.equals(match.seller))
        throw settlementError('Listing meter does not belong to the seller', 400);

      const [generation] = await Reading.aggregate([
        {
          $match: {
            meter: meter._id,
            timestamp: { $gte: listing.windowStart, $lte: listing.windowEnd }
          }
        },
        { $group: { _id: null, generatedKwh: { $sum: '$generatedKwh' } } }
      ]).session(session);

      const deliveredKwh = Math.min(
        match.quantityKwh,
        generation?.generatedKwh || 0
      );
      const amount = deliveredKwh * match.pricePerKwh;
      const gridConfig = await GridConfig.findOne({ key: 'default' }).session(session);
      const platformFeePercent = gridConfig?.platformFeePercent ?? 2;
      const fee = amount * platformFeePercent / 100;

      const [buyer, seller] = await Promise.all([
        User.findById(match.buyer).select('walletBalance').session(session),
        User.findById(match.seller).select('walletBalance').session(session)
      ]);

      if (!buyer || !seller)
        throw settlementError('Buyer or seller account not found', 404);
      if (buyer.walletBalance < amount)
        throw settlementError('Buyer has insufficient wallet balance', 400);

      const buyerBalanceAfter = buyer.walletBalance - amount;
      const sellerBalanceAfterCredit = seller.walletBalance + amount;
      const sellerBalanceAfterFee = sellerBalanceAfterCredit - fee;

      const buyerUpdate = await User.updateOne(
        { _id: buyer._id, walletBalance: { $gte: amount } },
        { $inc: { walletBalance: -amount } },
        { session }
      );
      if (buyerUpdate.matchedCount !== 1)
        throw settlementError('Buyer has insufficient wallet balance', 400);

      const sellerUpdate = await User.updateOne(
        { _id: seller._id },
        { $inc: { walletBalance: amount - fee } },
        { session }
      );
      if (sellerUpdate.matchedCount !== 1)
        throw settlementError('Seller account not found', 404);

      const transaction = new Transaction({
        match: match._id,
        buyer: buyer._id,
        seller: seller._id,
        contractedKwh: match.quantityKwh,
        deliveredKwh,
        amount,
        fee,
        status: 'settled'
      });
      await transaction.save({ session });

      await WalletEntry.create([
        {
          user: buyer._id,
          type: 'debit',
          amount,
          reference: transaction._id,
          balanceAfter: buyerBalanceAfter
        },
        {
          user: seller._id,
          type: 'credit',
          amount,
          reference: transaction._id,
          balanceAfter: sellerBalanceAfterCredit
        },
        {
          user: seller._id,
          type: 'fee',
          amount: fee,
          reference: transaction._id,
          balanceAfter: sellerBalanceAfterFee
        }
      ], { session, ordered: true });

      const matchUpdate = await Match.updateOne(
        { _id: match._id, status: 'confirmed' },
        { $set: { status: 'settled' } },
        { session }
      );
      if (matchUpdate.modifiedCount !== 1)
        throw settlementError('Match is no longer confirmed', 409);

      await notify(
        buyer._id,
        'settlement_completed',
        `Settlement completed for ${deliveredKwh} kWh. Amount: ${amount}.`,
        session
      );
      await notify(
        seller._id,
        'settlement_completed',
        `Settlement completed for ${deliveredKwh} kWh. Amount: ${amount}; fee: ${fee}.`,
        session
      );

      transactionId = transaction._id;
    });

    const transaction = await Transaction.findById(transactionId)
      .populate('match')
      .populate('buyer', 'name email')
      .populate('seller', 'name email');

    res.status(201).json(transaction);
  } catch (error) {
    next(error);
  } finally {
    if (session) await session.endSession();
  }
};
