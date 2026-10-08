const mongoose = require('mongoose');
const Bid = require('../models/Bid');
const Listing = require('../models/Listing');
const Match = require('../models/Match');
const notify = require('../services/notificationService');

const windowsOverlap = (bid, listing) =>
  listing.windowStart < bid.windowEnd && listing.windowEnd > bid.windowStart;

exports.listMatches = async (req, res, next) => {
  try {
    const { status } = req.query;
    const validStatuses = ['pending', 'confirmed', 'rejected', 'settled', 'disputed'];

    if (status && !validStatuses.includes(status))
      return res.status(400).json({ message: 'Invalid match status' });

    const page = Number(req.query.page === undefined ? 1 : req.query.page);
    const limit = Number(req.query.limit === undefined ? 20 : req.query.limit);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1)
      return res.status(400).json({ message: 'page and limit must be positive integers' });

    const filter = req.user.role === 'admin'
      ? {}
      : { $or: [{ buyer: req.user._id }, { seller: req.user._id }] };

    if (status) filter.status = status;

    const [matches, total] = await Promise.all([
      Match.find(filter)
        .populate('buyer', 'name email')
        .populate('seller', 'name email')
        .populate('listing')
        .populate('bid')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Match.countDocuments(filter)
    ]);

    res.json({
      data: matches,
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

exports.getMatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: 'Invalid match ID' });

    const match = await Match.findById(id);
    if (!match)
      return res.status(404).json({ message: 'Match not found' });

    if (
      req.user.role !== 'admin' &&
      !match.buyer.equals(req.user._id) &&
      !match.seller.equals(req.user._id)
    ) {
      return res.status(403).json({ message: 'You cannot view this match' });
    }

    await match.populate([
      { path: 'listing' },
      { path: 'bid' },
      { path: 'buyer', select: 'name email' },
      { path: 'seller', select: 'name email' }
    ]);
    res.json(match);
  } catch (error) {
    next(error);
  }
};

exports.confirmMatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: 'Invalid match ID' });

    const match = await Match.findById(id);
    if (!match)
      return res.status(404).json({ message: 'Match not found' });

    let confirmationField;
    if (match.buyer.equals(req.user._id)) {
      confirmationField = 'buyerConfirmed';
    } else if (match.seller.equals(req.user._id)) {
      confirmationField = 'sellerConfirmed';
    } else {
      return res.status(403).json({ message: 'Only the buyer or seller can confirm this match' });
    }

    if (match.status !== 'pending')
      return res.status(400).json({ message: 'Only pending matches can be confirmed' });

    const update = await Match.updateOne(
      { _id: match._id, status: 'pending' },
      { $set: { [confirmationField]: true } }
    );

    if (update.matchedCount === 0) {
      const currentMatch = await Match.findById(id);
      if (!currentMatch)
        return res.status(404).json({ message: 'Match not found' });
      if (currentMatch.status !== 'confirmed')
        return res.status(400).json({ message: 'Only pending matches can be confirmed' });
    } else {
      const confirmation = await Match.updateOne(
        {
          _id: match._id,
          status: 'pending',
          buyerConfirmed: true,
          sellerConfirmed: true
        },
        { $set: { status: 'confirmed' } }
      );
      if (confirmation.modifiedCount === 1) {
        await Promise.all([
          notify(
            match.buyer,
            'match_confirmed',
            `Match ${match._id} for ${match.quantityKwh} kWh has been confirmed.`
          ),
          notify(
            match.seller,
            'match_confirmed',
            `Match ${match._id} for ${match.quantityKwh} kWh has been confirmed.`
          )
        ]);
      }
    }

    const updatedMatch = await Match.findById(id)
      .populate('listing')
      .populate('bid')
      .populate('buyer', 'name email')
      .populate('seller', 'name email');

    res.json(updatedMatch);
  } catch (error) {
    next(error);
  }
};

exports.rejectMatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: 'Invalid match ID' });

    const match = await Match.findById(id);
    if (!match)
      return res.status(404).json({ message: 'Match not found' });

    if (!match.buyer.equals(req.user._id) && !match.seller.equals(req.user._id))
      return res.status(403).json({
        message: 'Only the buyer or seller can reject this match'
      });

    if (match.status !== 'pending')
      return res.status(400).json({
        message: 'Only pending matches can be rejected'
      });

    const rejection = await Match.updateOne(
      { _id: match._id, status: 'pending' },
      { $set: { status: 'rejected' } }
    );
    if (rejection.matchedCount === 0)
      return res.status(400).json({
        message: 'Only pending matches can be rejected'
      });

    await Promise.all([
      Listing.updateOne(
        { _id: match.listing },
        {
          $inc: { remainingKwh: match.quantityKwh },
          $set: { status: 'open' }
        }
      ),
      Bid.updateOne(
        { _id: match.bid },
        {
          $inc: { remainingKwh: match.quantityKwh },
          $set: { status: 'open' }
        }
      )
    ]);

    await Promise.all([
      notify(
        match.buyer,
        'match_rejected',
        `Match ${match._id} for ${match.quantityKwh} kWh was rejected.`
      ),
      notify(
        match.seller,
        'match_rejected',
        `Match ${match._id} for ${match.quantityKwh} kWh was rejected.`
      )
    ]);

    const rejectedMatch = await Match.findById(id)
      .populate('listing')
      .populate('bid')
      .populate('buyer', 'name email')
      .populate('seller', 'name email');

    res.json(rejectedMatch);
  } catch (error) {
    next(error);
  }
};

exports.runMatching = async (req, res, next) => {
  try {
    const bids = await Bid.find({ status: 'open', remainingKwh: { $gt: 0 } })
      .sort({ maxPricePerKwh: -1, createdAt: 1 });
    const listings = await Listing.find({ status: 'open', remainingKwh: { $gt: 0 } })
      .sort({ askPricePerKwh: 1, createdAt: 1 });

    let matchesCreated = 0;

    for (const bid of bids) {
      while (bid.remainingKwh > 0) {
        const candidates = listings
          .filter(listing =>
            listing.remainingKwh > 0 &&
            !listing.seller.equals(bid.buyer) &&
            bid.maxPricePerKwh >= listing.askPricePerKwh &&
            windowsOverlap(bid, listing)
          )
          .sort((a, b) => {
            const aZonePriority = a.zone === bid.zone ? 0 : 1;
            const bZonePriority = b.zone === bid.zone ? 0 : 1;
            return aZonePriority - bZonePriority ||
              a.askPricePerKwh - b.askPricePerKwh ||
              a.createdAt - b.createdAt;
          });

        const listing = candidates[0];
        if (!listing) break;

        const quantityKwh = Math.min(bid.remainingKwh, listing.remainingKwh);
        const [match] = await Match.create([{
          listing: listing._id,
          bid: bid._id,
          seller: listing.seller,
          buyer: bid.buyer,
          quantityKwh,
          pricePerKwh: (bid.maxPricePerKwh + listing.askPricePerKwh) / 2
        }]);

        bid.remainingKwh -= quantityKwh;
        listing.remainingKwh -= quantityKwh;

        if (bid.remainingKwh === 0) bid.status = 'matched';
        if (listing.remainingKwh === 0) listing.status = 'matched';

        await Promise.all([bid.save(), listing.save()]);
        await Promise.all([
          notify(
            match.buyer,
            'match_created',
            `A match for ${quantityKwh} kWh has been created and needs confirmation.`
          ),
          notify(
            match.seller,
            'match_created',
            `A match for ${quantityKwh} kWh has been created and needs confirmation.`
          )
        ]);
        matchesCreated += 1;
      }
    }

    res.json({ matchesCreated });
  } catch (error) {
    next(error);
  }
};
