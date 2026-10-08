const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const {
  listDisputes,
  getDispute,
  createDispute,
  addDisputeComment,
  resolveDispute
} = require('../controllers/disputeController');

router.get('/', protect, listDisputes);
router.get('/:id', protect, getDispute);
router.post('/', protect, createDispute);
router.post('/:id/comments', protect, addDisputeComment);
router.patch('/:id/resolve', protect, authorize('admin'), resolveDispute);

module.exports = router;
