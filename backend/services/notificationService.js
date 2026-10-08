const Notification = require('../models/Notification');
const User = require('../models/User');

const preferenceForType = type => {
  if (type.startsWith('match_')) return 'match';
  if (type.startsWith('settlement_')) return 'settlement';
  if (type.startsWith('dispute_')) return 'dispute';
  if (type.startsWith('price_')) return 'price';
  if (type.startsWith('grid_')) return 'grid';
  return null;
};

const notify = async (userId, type, message, session) => {
  const userQuery = User.findById(userId).select('notificationPrefs');
  if (session) userQuery.session(session);
  const user = await userQuery;
  if (!user) throw new Error(`Cannot notify missing user ${userId}`);

  const preference = preferenceForType(type);
  if (
    !user.notificationPrefs?.all ||
    (preference && !user.notificationPrefs[preference])
  ) {
    return null;
  }

  const notification = new Notification({ user: userId, type, message });
  await notification.save(session ? { session } : undefined);
  return notification;
};

module.exports = notify;
