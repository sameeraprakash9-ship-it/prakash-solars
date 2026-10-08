const Notification = require('../models/Notification');
const User = require('../models/User');
const mongoose = require('mongoose');

const preferenceFields = ['match', 'settlement', 'dispute', 'price', 'grid', 'all'];

exports.listNotifications = async (req, res, next) => {
  try {
    const { unread } = req.query;
    if (unread !== undefined && unread !== 'true' && unread !== 'false')
      return res.status(400).json({ message: 'unread must be true or false' });

    const page = Number(req.query.page === undefined ? 1 : req.query.page);
    const limit = Number(req.query.limit === undefined ? 20 : req.query.limit);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1)
      return res.status(400).json({ message: 'page and limit must be positive integers' });

    const filter = { user: req.user._id };
    if (unread !== undefined) filter.read = unread === 'false' ? true : false;

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments(filter)
    ]);

    res.json({
      data: notifications,
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

exports.markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: 'Invalid notification ID' });

    const notification = await Notification.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { $set: { read: true } },
      { new: true, runValidators: true }
    );

    if (!notification)
      return res.status(404).json({ message: 'Notification not found' });

    res.json(notification);
  } catch (error) {
    next(error);
  }
};

exports.markAllNotificationsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true } }
    );

    res.json({ updatedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: 'Invalid notification ID' });

    const notification = await Notification.findOneAndDelete({
      _id: id,
      user: req.user._id
    });

    if (!notification)
      return res.status(404).json({ message: 'Notification not found' });

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.updateNotificationPreferences = async (req, res, next) => {
  try {
    const preferences = req.body?.notificationPrefs;
    if (
      !preferences ||
      typeof preferences !== 'object' ||
      Array.isArray(preferences)
    ) {
      return res.status(400).json({
        message: 'Provide notificationPrefs with one or more preference booleans'
      });
    }

    const fields = Object.keys(preferences);
    if (
      fields.length === 0 ||
      fields.some(field => !preferenceFields.includes(field)) ||
      fields.some(field => typeof preferences[field] !== 'boolean')
    ) {
      return res.status(400).json({
        message: 'notificationPrefs must contain only boolean match, settlement, dispute, price, grid, or all values'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user)
      return res.status(404).json({ message: 'User not found' });

    for (const field of fields)
      user.notificationPrefs[field] = preferences[field];

    await user.save();
    res.json({ notificationPrefs: user.notificationPrefs });
  } catch (error) {
    next(error);
  }
};
