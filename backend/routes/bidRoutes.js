const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { createBid, listMyBids } = require('../controllers/bidController');

router.get('/mine', protect, authorize('consumer'), listMyBids);
router.post('/', protect, authorize('consumer'), createBid);

module.exports = router;
