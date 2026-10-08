const router = require('express').Router();
const c = require('../controllers/meterController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.route('/').post(authorize('prosumer', 'consumer'), c.createMeter).get(c.listMeters);
router.patch('/:id/solar-profile', authorize('prosumer'), c.updateSolarProfile);
router.get('/:id/solar-photo', c.getSolarPhoto);
router.get('/:id/solar-photos/:index', c.getSolarPhoto);
router.post('/:id/readings', authorize('prosumer', 'consumer'), c.addReading);
router.post('/:id/simulate', c.simulate);
router.get('/:id/readings', c.getReadings);
router.get('/:id/surplus', c.getSurplus);
module.exports = router;
