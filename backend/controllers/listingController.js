const mongoose = require('mongoose');
const Meter = require('../models/Meter');
const Reading = require('../models/Reading');
const Listing = require('../models/Listing');
const PricingRule = require('../models/PricingRule');

const populateOfferDetails = query => query
  .populate('seller', 'name')
  .populate(
    'meter',
    'capacityKw zone isDemo solarPanelBrand solarPanelModel solarPanelCount solarInstallationYear solarDescription solarPhotoContentType solarPhotos.contentType'
  );

exports.createListing = async (req, res, next) => {
  try {
    const { meter: meterId, quantityKwh, askPricePerKwh, windowStart, windowEnd } = req.body || {};
    const start = new Date(windowStart);
    const end = new Date(windowEnd);
    const quantity = Number(quantityKwh);
    const price = Number(askPricePerKwh);

    if (!Number.isFinite(quantity) || quantity <= 0)
      return res.status(400).json({ message: 'quantityKwh must be greater than 0' });
    if (!Number.isFinite(price))
      return res.status(400).json({ message: 'askPricePerKwh must be a finite number' });
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end)
      return res.status(400).json({ message: 'A valid windowStart before windowEnd is required' });
    if (!mongoose.Types.ObjectId.isValid(meterId))
      return res.status(400).json({ message: 'A valid meter ID is required' });

    const pricingRule = await PricingRule.findOne({ key: 'default' });
    if (!pricingRule)
      return res.status(503).json({ message: 'Pricing rule has not been configured' });
    if (price < pricingRule.floor || price > pricingRule.ceiling)
      return res.status(400).json({
        message: `askPricePerKwh must be between ${pricingRule.floor} and ${pricingRule.ceiling}`
      });

    const meter = await Meter.findById(meterId);
    if (!meter) return res.status(404).json({ message: 'Meter not found' });
    if (!meter.owner.equals(req.user._id))
      return res.status(403).json({ message: 'Not your meter' });

    const [totals] = await Reading.aggregate([
      { $match: { meter: meter._id, timestamp: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          generatedKwh: { $sum: '$generatedKwh' },
          consumedKwh: { $sum: '$consumedKwh' }
        }
      }
    ]);
    const sellableSurplus = Math.max(
      0,
      (totals?.generatedKwh || 0) - (totals?.consumedKwh || 0)
    );

    if (quantity > sellableSurplus)
      return res.status(400).json({
        message: 'quantityKwh exceeds the sellable surplus for this window',
        sellableSurplusKwh: sellableSurplus
      });

    const listing = await Listing.create({
      seller: req.user._id,
      meter: meter._id,
      quantityKwh: quantity,
      remainingKwh: quantity,
      askPricePerKwh: price,
      windowStart: start,
      windowEnd: end,
      zone: meter.zone
    });

    res.status(201).json(listing);
  } catch (error) {
    next(error);
  }
};

exports.listListings = async (req, res, next) => {
  try {
    const {
      minPrice,
      maxPrice,
      zone,
      from,
      to,
      page = 1,
      limit = 20
    } = req.query;

    const filter = { status: 'open' };

    const minP = Number(minPrice);
    const maxP = Number(maxPrice);
    if (Number.isFinite(minP) || Number.isFinite(maxP)) {
      filter.askPricePerKwh = {};
      if (Number.isFinite(minP)) filter.askPricePerKwh.$gte = minP;
      if (Number.isFinite(maxP)) filter.askPricePerKwh.$lte = maxP;
    }

    if (zone) filter.zone = zone;

    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    if (fromDate && Number.isNaN(fromDate.getTime()))
      return res.status(400).json({ message: 'Invalid from date' });
    if (toDate && Number.isNaN(toDate.getTime()))
      return res.status(400).json({ message: 'Invalid to date' });
    if (fromDate && toDate && fromDate > toDate)
      return res.status(400).json({ message: 'from must be before or equal to to' });

    if (fromDate) filter.windowEnd = { $gte: fromDate };
    if (toDate) filter.windowStart = { $lte: toDate };

    const pageNum = Math.max(1, Number(page));
    const pageSize = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * pageSize;

    const listings = await populateOfferDetails(Listing.find(filter))
      .sort({ askPricePerKwh: 1 })
      .skip(skip)
      .limit(pageSize);

    const total = await Listing.countDocuments(filter);

    res.json({
      data: listings,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getListingPhoto = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ message: 'Invalid listing ID' });

    const photoIndex = req.params.index === undefined ? 0 : Number(req.params.index);
    if (!Number.isInteger(photoIndex) || photoIndex < 0 || photoIndex >= 5)
      return res.status(400).json({ message: 'Invalid solar panel photo number' });

    const listing = await Listing.findOne({ _id: req.params.id, status: 'open' })
      .populate('meter', '+solarPhotoData +solarPhotos.data solarPhotoContentType solarPhotos.contentType');
    const galleryPhoto = listing?.meter?.solarPhotos?.[photoIndex];
    const legacyPhoto = photoIndex === 0 && listing?.meter?.solarPhotoData
      ? { data: listing.meter.solarPhotoData, contentType: listing.meter.solarPhotoContentType }
      : null;
    const photo = galleryPhoto || legacyPhoto;
    if (!photo)
      return res.status(404).json({ message: 'Solar panel photo not found for this offer' });

    res.set({
      'Content-Type': photo.contentType,
      'Content-Length': String(Buffer.byteLength(photo.data, 'base64')),
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff'
    });
    res.send(Buffer.from(photo.data, 'base64'));
  } catch (error) {
    next(error);
  }
};

exports.listMyListings = async (req, res, next) => {
  try {
    const { status } = req.query;
    const validStatuses = ['open', 'matched', 'cancelled', 'expired'];

    if (status && !validStatuses.includes(status))
      return res.status(400).json({ message: 'Invalid listing status' });

    const filter = { seller: req.user._id };
    if (status) filter.status = status;

    const listings = await Listing.find(filter)
      .populate('seller', 'name email')
      .sort({ createdAt: -1 });

    res.json(listings);
  } catch (error) {
    next(error);
  }
};

exports.getListing = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid listing ID' });
    }

    const listing = await Listing.findById(id).populate('seller', 'name email');

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    res.json(listing);
  } catch (error) {
    next(error);
  }
};

exports.updateListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: 'Invalid listing ID' });

    const updates = req.body || {};
    const allowedFields = ['askPricePerKwh', 'quantityKwh'];
    const fields = Object.keys(updates);
    if (fields.length === 0 || fields.some(field => !allowedFields.includes(field)))
      return res.status(400).json({
        message: 'Only askPricePerKwh and quantityKwh can be updated'
      });

    const listing = await Listing.findById(id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    if (!listing.seller.equals(req.user._id))
      return res.status(403).json({ message: 'Not your listing' });
    if (listing.status !== 'open')
      return res.status(400).json({ message: 'Only open listings can be updated' });

    if (Object.prototype.hasOwnProperty.call(updates, 'askPricePerKwh')) {
      const price = Number(updates.askPricePerKwh);
      if (!Number.isFinite(price))
        return res.status(400).json({ message: 'askPricePerKwh must be a finite number' });

      const pricingRule = await PricingRule.findOne({ key: 'default' });
      if (!pricingRule)
        return res.status(503).json({ message: 'Pricing rule has not been configured' });
      if (price < pricingRule.floor || price > pricingRule.ceiling)
        return res.status(400).json({
          message: `askPricePerKwh must be between ${pricingRule.floor} and ${pricingRule.ceiling}`
        });

      listing.askPricePerKwh = price;
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'quantityKwh')) {
      const quantity = Number(updates.quantityKwh);
      if (!Number.isFinite(quantity) || quantity <= 0)
        return res.status(400).json({ message: 'quantityKwh must be greater than 0' });

      const alreadyMatched = listing.quantityKwh - listing.remainingKwh;
      if (quantity < alreadyMatched)
        return res.status(400).json({
          message: 'quantityKwh cannot be less than the amount already matched'
        });

      const meter = await Meter.findById(listing.meter);
      if (!meter) return res.status(404).json({ message: 'Meter not found' });

      const [totals] = await Reading.aggregate([
        {
          $match: {
            meter: meter._id,
            timestamp: { $gte: listing.windowStart, $lte: listing.windowEnd }
          }
        },
        {
          $group: {
            _id: null,
            generatedKwh: { $sum: '$generatedKwh' },
            consumedKwh: { $sum: '$consumedKwh' }
          }
        }
      ]);
      const sellableSurplus = Math.max(
        0,
        (totals?.generatedKwh || 0) - (totals?.consumedKwh || 0)
      );

      if (quantity > sellableSurplus)
        return res.status(400).json({
          message: 'quantityKwh exceeds the sellable surplus for this window',
          sellableSurplusKwh: sellableSurplus
        });

      listing.quantityKwh = quantity;
      listing.remainingKwh = quantity - alreadyMatched;
    }

    await listing.save();
    res.json(await listing.populate('seller', 'name email'));
  } catch (error) {
    next(error);
  }
};

exports.cancelListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: 'Invalid listing ID' });

    const listing = await Listing.findById(id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    if (!listing.seller.equals(req.user._id))
      return res.status(403).json({ message: 'Not your listing' });
    if (listing.status !== 'open')
      return res.status(400).json({ message: 'Only open listings can be cancelled' });

    listing.status = 'cancelled';
    await listing.save();

    res.json(await listing.populate('seller', 'name email'));
  } catch (error) {
    next(error);
  }
};
