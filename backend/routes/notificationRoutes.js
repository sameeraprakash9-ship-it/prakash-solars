const router = require('express').Router();
const { protect } = require('../middleware/auth');
const {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  updateNotificationPreferences
} = require('../controllers/notificationController');

router.get('/', protect, listNotifications);
router.put('/preferences', protect, updateNotificationPreferences);
router.patch('/read-all', protect, markAllNotificationsRead);
router.patch('/:id/read', protect, markNotificationRead);
router.delete('/:id', protect, deleteNotification);

module.exports = router;
