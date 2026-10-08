const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getPricingRule,
  getCurrentPrice,
  getPriceHistory,
  getPriceForecast,
  setPricingRule,
  recalculatePrice
} = require('../controllers/pricingController');

router.get('/rules', protect, authorize('admin'), getPricingRule);
router.get('/current', protect, getCurrentPrice);
router.get('/history', protect, getPriceHistory);
router.get('/forecast', protect, getPriceForecast);
router.post('/recalculate', protect, authorize('admin'), recalculatePrice);
router.put('/rules', protect, authorize('admin'), setPricingRule);
router.put('/rule', protect, authorize('admin'), setPricingRule);

module.exports = router;
