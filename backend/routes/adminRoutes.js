const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const {
  listUsers,
  setUserStatus,
  listMeters,
  getGridConfig,
  updateGridConfig,
  getAdminReports
} = require('../controllers/adminController');

router.get('/reports', protect, authorize('admin'), getAdminReports);
router.get('/grid/config', protect, authorize('admin'), getGridConfig);
router.put('/grid/config', protect, authorize('admin'), updateGridConfig);
router.get('/users', protect, authorize('admin'), listUsers);
router.patch('/users/:id/status', protect, authorize('admin'), setUserStatus);
router.get('/meters', protect, authorize('admin'), listMeters);

module.exports = router;
