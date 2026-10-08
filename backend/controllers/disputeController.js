const mongoose = require('mongoose');
const Dispute = require('../models/Dispute');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const WalletEntry = require('../models/WalletEntry');
const notify = require('../services/notificationService');

const disputeError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

exports.listDisputes = async (req, res, next) => {
  try {
    const { status } = req.query;
    const validStatuses = ['open', 'under_review', 'resolved', 'rejected'];
    if (status && !validStatuses.includes(status))
      return res.status(400).json({ message: 'Invalid dispute status' });

    const page = Number(req.query.page === undefined ? 1 : req.query.page);
    const limit = Number(req.query.limit === undefined ? 20 : req.query.limit);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1)
      return res.status(400).json({ message: 'page and limit must be positive integers' });

    const filter = req.user.role === 'admin'
      ? {}
      : {
        transaction: {
          $in: await Transaction.find({
            $or: [{ buyer: req.user._id }, { seller: req.user._id }]
          }).distinct('_id')
        }
      };
    if (status) filter.status = status;

    const [disputes, total] = await Promise.all([
      Dispute.find(filter)
        .populate({
          path: 'transaction',
          populate: [
            { path: 'buyer', select: 'name email' },
            { path: 'seller', select: 'name email' }
          ]
        })
        .populate('raisedBy', 'name email')
        .populate('comments.user', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Dispute.countDocuments(filter)
    ]);

    res.json({
      data: disputes,
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

exports.getDispute = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: 'Invalid dispute ID' });

    const dispute = await Dispute.findById(id)
      .populate({
        path: 'transaction',
        populate: [
          { path: 'buyer', select: 'name email' },
          { path: 'seller', select: 'name email' }
        ]
      })
      .populate('raisedBy', 'name email')
      .populate('comments.user', 'name email');

    if (!dispute)
      return res.status(404).json({ message: 'Dispute not found' });

    const transaction = dispute.transaction;
    if (
      req.user.role !== 'admin' &&
      !transaction.buyer._id.equals(req.user._id) &&
      !transaction.seller._id.equals(req.user._id)
    ) {
      return res.status(403).json({ message: 'You cannot view this dispute' });
    }

    res.json(dispute);
  } catch (error) {
    next(error);
  }
};

exports.createDispute = async (req, res, next) => {
  const body = req.body || {};
  const { transaction: transactionId, reason } = body;
  let evidence = body.evidence === undefined ? [] : body.evidence;

  if (!mongoose.Types.ObjectId.isValid(transactionId))
    return res.status(400).json({ message: 'A valid transaction ID is required' });
  if (typeof reason !== 'string' || !reason.trim())
    return res.status(400).json({ message: 'reason is required' });
  if (typeof evidence === 'string') evidence = [evidence];
  if (
    !Array.isArray(evidence) ||
    evidence.some(item => typeof item !== 'string' || !item.trim())
  ) {
    return res.status(400).json({
      message: 'evidence must be an array of non-empty strings'
    });
  }

  let session;
  try {
    session = await mongoose.startSession();
    let disputeId;

    await session.withTransaction(async () => {
      const transaction = await Transaction.findById(transactionId).session(session);
      if (!transaction)
        throw disputeError('Transaction not found', 404);
      if (
        !transaction.buyer.equals(req.user._id) &&
        !transaction.seller.equals(req.user._id)
      ) {
        throw disputeError('Only the buyer or seller can raise a dispute', 403);
      }
      if (transaction.status !== 'settled')
        throw disputeError('Only settled transactions can be disputed', 409);

      const activeDispute = await Dispute.findOne({
        transaction: transaction._id,
        status: { $in: ['open', 'under_review'] }
      }).session(session);
      if (activeDispute)
        throw disputeError('An open dispute already exists for this transaction', 409);

      const update = await Transaction.updateOne(
        { _id: transaction._id, status: 'settled' },
        { $set: { status: 'disputed' } },
        { session }
      );
      if (update.modifiedCount !== 1)
        throw disputeError('Transaction is no longer available for dispute', 409);

      const [dispute] = await Dispute.create([{
        transaction: transaction._id,
        raisedBy: req.user._id,
        reason: reason.trim(),
        evidence: evidence.map(item => item.trim()),
        status: 'open'
      }], { session });
      disputeId = dispute._id;
    });

    const dispute = await Dispute.findById(disputeId)
      .populate('transaction')
      .populate('raisedBy', 'name email');
    res.status(201).json(dispute);
  } catch (error) {
    next(error);
  } finally {
    if (session) await session.endSession();
  }
};

exports.addDisputeComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: 'Invalid dispute ID' });
    if (typeof text !== 'string' || !text.trim())
      return res.status(400).json({ message: 'text is required' });

    const dispute = await Dispute.findById(id).populate('transaction');
    if (!dispute)
      return res.status(404).json({ message: 'Dispute not found' });

    const transaction = dispute.transaction;
    const isAdmin = req.user.role === 'admin';
    const isBuyer = transaction.buyer.equals(req.user._id);
    const isSeller = transaction.seller.equals(req.user._id);
    if (!isAdmin && !isBuyer && !isSeller)
      return res.status(403).json({ message: 'You cannot comment on this dispute' });

    if (!['open', 'under_review'].includes(dispute.status))
      return res.status(409).json({ message: 'Closed disputes cannot receive comments' });

    const comment = {
      user: req.user._id,
      text: text.trim(),
      createdAt: new Date()
    };
    const updatedDispute = await Dispute.findOneAndUpdate(
      { _id: id, status: { $in: ['open', 'under_review'] } },
      { $push: { comments: comment } },
      { new: true, runValidators: true }
    );
    if (!updatedDispute)
      return res.status(409).json({ message: 'Closed disputes cannot receive comments' });

    const recipients = isAdmin
      ? [transaction.buyer, transaction.seller]
      : [isBuyer ? transaction.seller : transaction.buyer];
    const uniqueRecipients = [
      ...new Map(recipients.map(userId => [userId.toString(), userId])).values()
    ];

    await Promise.all(uniqueRecipients.map(userId =>
      notify(
        userId,
        'dispute_comment',
        `A new comment was added to dispute ${dispute._id}.`
      )
    ));

    await updatedDispute.populate([
      { path: 'transaction', populate: [
        { path: 'buyer', select: 'name email' },
        { path: 'seller', select: 'name email' }
      ] },
      { path: 'raisedBy', select: 'name email' },
      { path: 'comments.user', select: 'name email' }
    ]);

    res.status(201).json(updatedDispute);
  } catch (error) {
    next(error);
  }
};

exports.resolveDispute = async (req, res, next) => {
  const { id } = req.params;
  const { decision, amount, note } = req.body || {};
  const validDecisions = ['full_refund', 'partial_refund', 'reject'];

  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ message: 'Invalid dispute ID' });
  if (!validDecisions.includes(decision))
    return res.status(400).json({
      message: 'decision must be full_refund, partial_refund, or reject'
    });
  if (typeof note !== 'string' || !note.trim())
    return res.status(400).json({ message: 'A resolution note is required' });
  if (
    decision === 'partial_refund' &&
    (!Number.isFinite(amount) || amount <= 0)
  ) {
    return res.status(400).json({
      message: 'amount must be a positive number for a partial refund'
    });
  }
  if (decision !== 'partial_refund' && amount !== undefined)
    return res.status(400).json({
      message: 'amount is only accepted for a partial_refund decision'
    });

  let session;
  try {
    session = await mongoose.startSession();
    let disputeId;

    await session.withTransaction(async () => {
      const dispute = await Dispute.findById(id).session(session);
      if (!dispute)
        throw disputeError('Dispute not found', 404);
      if (!['open', 'under_review'].includes(dispute.status))
        throw disputeError('Only open disputes can be resolved', 409);

      const transaction = await Transaction.findById(dispute.transaction).session(session);
      if (!transaction)
        throw disputeError('Related transaction not found', 404);
      if (transaction.status !== 'disputed')
        throw disputeError('Related transaction is not disputed', 409);

      let refundAmount = 0;
      let disputeStatus = 'rejected';
      let transactionStatus = 'settled';

      if (decision === 'full_refund' || decision === 'partial_refund') {
        refundAmount = decision === 'full_refund'
          ? transaction.amount
          : amount;
        if (refundAmount > transaction.amount)
          throw disputeError('Refund amount cannot exceed the transaction amount', 400);

        const [buyer, seller] = await Promise.all([
          User.findById(transaction.buyer).select('walletBalance').session(session),
          User.findById(transaction.seller).select('walletBalance').session(session)
        ]);
        if (!buyer || !seller)
          throw disputeError('Buyer or seller account not found', 404);
        if (seller.walletBalance < refundAmount)
          throw disputeError('Seller has insufficient wallet balance for this refund', 409);

        const sellerBalanceAfter = seller.walletBalance - refundAmount;
        const buyerBalanceAfter = buyer.walletBalance + refundAmount;
        const sellerUpdate = await User.updateOne(
          { _id: seller._id, walletBalance: { $gte: refundAmount } },
          { $inc: { walletBalance: -refundAmount } },
          { session }
        );
        if (sellerUpdate.modifiedCount !== 1)
          throw disputeError('Seller has insufficient wallet balance for this refund', 409);

        const buyerUpdate = await User.updateOne(
          { _id: buyer._id },
          { $inc: { walletBalance: refundAmount } },
          { session }
        );
        if (buyerUpdate.modifiedCount !== 1)
          throw disputeError('Buyer account not found', 404);

        await WalletEntry.create([
          {
            user: seller._id,
            type: 'debit',
            amount: refundAmount,
            reference: dispute._id,
            balanceAfter: sellerBalanceAfter
          },
          {
            user: buyer._id,
            type: 'refund',
            amount: refundAmount,
            reference: dispute._id,
            balanceAfter: buyerBalanceAfter
          }
        ], { session });

        disputeStatus = 'resolved';
        transactionStatus = 'refunded';
      }

      const disputeUpdate = await Dispute.updateOne(
        { _id: dispute._id, status: { $in: ['open', 'under_review'] } },
        {
          $set: {
            status: disputeStatus,
            resolution: note.trim()
          }
        },
        { session }
      );
      if (disputeUpdate.modifiedCount !== 1)
        throw disputeError('Dispute is no longer open', 409);

      const transactionUpdate = await Transaction.updateOne(
        { _id: transaction._id, status: 'disputed' },
        { $set: { status: transactionStatus } },
        { session }
      );
      if (transactionUpdate.modifiedCount !== 1)
        throw disputeError('Transaction is no longer disputed', 409);

      await notify(
        transaction.buyer,
        'dispute_resolved',
        `Dispute ${dispute._id} was ${decision === 'reject' ? 'rejected' : 'resolved'}. ${note.trim()}`,
        session
      );
      await notify(
        transaction.seller,
        'dispute_resolved',
        `Dispute ${dispute._id} was ${decision === 'reject' ? 'rejected' : 'resolved'}. ${note.trim()}`,
        session
      );

      disputeId = dispute._id;
    });

    const dispute = await Dispute.findById(disputeId)
      .populate({
        path: 'transaction',
        populate: [
          { path: 'buyer', select: 'name email' },
          { path: 'seller', select: 'name email' }
        ]
      })
      .populate('raisedBy', 'name email')
      .populate('comments.user', 'name email');
    res.json(dispute);
  } catch (error) {
    next(error);
  } finally {
    if (session) await session.endSession();
  }
};
