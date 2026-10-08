const router = require('express').Router();
const {
  protect,
  protectEventSource,
  authorize
} = require('../middleware/auth');
const {
  getCurrentLoad,
  getLoadHistory,
  getZoneLoad,
  getGridAlerts,
  streamCurrentLoad
} = require('../controllers/gridController');

router.get('/stream', protectEventSource, streamCurrentLoad);
router.get('/load/current', protect, getCurrentLoad);
router.get('/load/history', protect, authorize('admin'), getLoadHistory);
router.get('/zones', protect, authorize('admin'), getZoneLoad);
router.get('/alerts', protect, authorize('admin'), getGridAlerts);

module.exports = router;
