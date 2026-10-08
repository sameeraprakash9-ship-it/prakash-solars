const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const {
  listMatches,
  getMatch,
  confirmMatch,
  rejectMatch,
  runMatching
} = require('../controllers/matchingController');

router.get('/matches', protect, listMatches);
router.get('/matches/:id', protect, getMatch);
router.post('/matches/:id/confirm', protect, confirmMatch);
router.post('/matches/:id/reject', protect, rejectMatch);
router.post('/run', protect, authorize('admin'), runMatching);

module.exports = router;
