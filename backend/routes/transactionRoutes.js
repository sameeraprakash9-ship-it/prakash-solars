const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const {
  listTransactions,
  getTransaction,
  settleMatch
} = require('../controllers/transactionController');

router.get('/', protect, listTransactions);
router.post('/settle/:matchId', protect, authorize('admin'), settleMatch);
router.get('/:id', protect, getTransaction);

module.exports = router;
