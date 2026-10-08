const router = require('express').Router();
const { protect } = require('../middleware/auth');
const {
  getCarbonCertificates,
  verifyCarbonCertificate,
  getCarbonCertificate,
  downloadCarbonCertificate,
  issueCarbonCertificate
} = require('../controllers/carbonController');

router.get('/verify/:certNo', verifyCarbonCertificate);
router.get('/certificates', protect, getCarbonCertificates);
router.get('/certificates/:id/download', protect, downloadCarbonCertificate);
router.get('/certificates/:id', protect, getCarbonCertificate);
router.post('/certificates', protect, issueCarbonCertificate);

module.exports = router;
