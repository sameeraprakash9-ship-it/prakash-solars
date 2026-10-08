const crypto = require('crypto');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const GridConfig = require('../models/GridConfig');
const Certificate = require('../models/Certificate');
const CertificateCounter = require('../models/CertificateCounter');
const Transaction = require('../models/Transaction');

exports.getCarbonCertificates = async (req, res, next) => {
  try {
    const page = Number(req.query.page === undefined ? 1 : req.query.page);
    const limit = Number(req.query.limit === undefined ? 20 : req.query.limit);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1)
      return res.status(400).json({ message: 'page and limit must be positive integers' });

    const filter = { owner: req.user._id };
    const [certificates, total, co2Totals] = await Promise.all([
      Certificate.find(filter)
        .populate('transaction')
        .sort({ issuedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Certificate.countDocuments(filter),
      Certificate.aggregate([
        { $match: filter },
        { $group: { _id: null, totalCo2AvoidedKg: { $sum: '$co2AvoidedKg' } } }
      ])
    ]);

    res.json({
      data: certificates,
      totalCo2AvoidedKg: Number((co2Totals[0]?.totalCo2AvoidedKg || 0).toFixed(3)),
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

exports.verifyCarbonCertificate = async (req, res, next) => {
  try {
    const certificate = await Certificate.findOne({ certNo: req.params.certNo })
      .populate('owner', 'name');

    if (!certificate)
      return res.status(404).json({ message: 'Certificate not found' });

    const hashData = {
      certNo: certificate.certNo,
      transaction: certificate.transaction.toString(),
      owner: certificate.owner?._id.toString(),
      kwh: certificate.kwh,
      co2AvoidedKg: certificate.co2AvoidedKg,
      issuedAt: certificate.issuedAt.toISOString()
    };
    const computedHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(hashData))
      .digest('hex');
    const storedHashIsValid = /^[a-f\d]{64}$/i.test(certificate.hash);
    const valid = storedHashIsValid && crypto.timingSafeEqual(
      Buffer.from(computedHash, 'hex'),
      Buffer.from(certificate.hash, 'hex')
    );
    const ownerFirstName = certificate.owner?.name.trim().split(/\s+/)[0] || null;

    res.json({
      valid,
      certificate: {
        certNo: certificate.certNo,
        kwh: certificate.kwh,
        co2AvoidedKg: certificate.co2AvoidedKg,
        issuedAt: certificate.issuedAt,
        ownerFirstName
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getCarbonCertificate = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: 'Invalid certificate ID' });

    const certificate = await Certificate.findById(id)
      .populate('transaction')
      .populate('owner', 'name email role');

    if (!certificate)
      return res.status(404).json({ message: 'Certificate not found' });
    if (
      req.user.role !== 'admin' &&
      !certificate.owner._id.equals(req.user._id)
    ) {
      return res.status(403).json({ message: 'You cannot view this certificate' });
    }

    res.json(certificate);
  } catch (error) {
    next(error);
  }
};

exports.downloadCarbonCertificate = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: 'Invalid certificate ID' });

    const certificate = await Certificate.findById(id).populate('owner', 'name email');
    if (!certificate)
      return res.status(404).json({ message: 'Certificate not found' });
    if (
      req.user.role !== 'admin' &&
      !certificate.owner._id.equals(req.user._id)
    ) {
      return res.status(403).json({ message: 'You cannot download this certificate' });
    }

    const filename = `${certificate.certNo.replace(/[^A-Za-z0-9._-]/g, '_')}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store'
    });

    const document = new PDFDocument({ size: 'A4', margin: 56 });
    document.on('error', error => {
      if (res.headersSent) res.destroy(error);
      else next(error);
    });
    document.pipe(res);

    document
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('Solar Energy Certificate', { align: 'center' });
    document.moveDown(0.5);
    document
      .fontSize(14)
      .font('Helvetica')
      .text(certificate.certNo, { align: 'center' });
    document.moveDown(2);

    const details = [
      ['Owner', certificate.owner.name],
      ['Energy delivered', `${certificate.kwh} kWh`],
      ['CO2 avoided', `${certificate.co2AvoidedKg} kg`],
      ['Issued on', certificate.issuedAt.toISOString()]
    ];
    for (const [label, value] of details) {
      document.font('Helvetica-Bold').text(`${label}:`, { continued: true });
      document.font('Helvetica').text(` ${value}`);
      document.moveDown(0.7);
    }

    document.moveDown();
    document.font('Helvetica-Bold').text('SHA-256 hash:');
    document.moveDown(0.3);
    document.font('Courier').fontSize(9).text(certificate.hash, { width: 480 });
    document.end();
  } catch (error) {
    next(error);
  }
};

const nextCertificateNumber = async year => {
  const key = `certificate-${year}`;
  try {
    const counter = await CertificateCounter.findOneAndUpdate(
      { _id: key },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true }
    );
    return `SOL-${year}-${String(counter.sequence).padStart(6, '0')}`;
  } catch (error) {
    if (error.code !== 11000) throw error;
    const counter = await CertificateCounter.findOneAndUpdate(
      { _id: key },
      { $inc: { sequence: 1 } },
      { new: true }
    );
    if (!counter) throw error;
    return `SOL-${year}-${String(counter.sequence).padStart(6, '0')}`;
  }
};

exports.issueCarbonCertificate = async (req, res, next) => {
  try {
    const { transaction: transactionId } = req.body || {};
    if (!transactionId || !mongoose.Types.ObjectId.isValid(transactionId))
      return res.status(400).json({ message: 'A valid transaction ID is required' });

    const transaction = await Transaction.findById(transactionId);
    if (!transaction)
      return res.status(404).json({ message: 'Transaction not found' });
    if (transaction.status !== 'settled')
      return res.status(409).json({ message: 'Only settled transactions can receive a certificate' });
    if (
      !transaction.buyer.equals(req.user._id) &&
      !transaction.seller.equals(req.user._id)
    ) {
      return res.status(403).json({
        message: 'Only the buyer or seller can request this certificate'
      });
    }

    const existing = await Certificate.findOne({ transaction: transaction._id });
    if (existing)
      return res.status(409).json({
        message: 'A certificate has already been issued for this transaction',
        certificate: existing
      });

    const gridConfig = await GridConfig.findOne({ key: 'default' });
    const emissionFactor = gridConfig?.emissionFactor ?? 0.82;
    const issuedAt = new Date();
    const year = issuedAt.getUTCFullYear();
    const certNo = await nextCertificateNumber(year);
    const kwh = transaction.deliveredKwh;
    const co2AvoidedKg = Number((kwh * emissionFactor).toFixed(3));
    const owner = req.user._id;
    const hashData = {
      certNo,
      transaction: transaction._id.toString(),
      owner: owner.toString(),
      kwh,
      co2AvoidedKg,
      issuedAt: issuedAt.toISOString()
    };
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(hashData))
      .digest('hex');

    const certificate = await Certificate.create({
      ...hashData,
      transaction: transaction._id,
      owner,
      issuedAt,
      hash
    });

    res.status(201).json(certificate);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'A certificate has already been issued for this transaction'
      });
    }
    next(error);
  }
};
