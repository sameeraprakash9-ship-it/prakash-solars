const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { getWallet, topUpWallet } = require('../controllers/walletController');

router.get('/', protect, getWallet);
router.post('/topup', protect, authorize('consumer'), topUpWallet);

module.exports = router;
