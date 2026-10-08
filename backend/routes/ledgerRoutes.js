const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { getLedgerSummary } = require('../controllers/ledgerController');

router.get('/summary', protect, getLedgerSummary);

module.exports = router;
