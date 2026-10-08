const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createListing,
  listListings,
  listMyListings,
  getListing,
  updateListing,
  cancelListing,
  getListingPhoto
} = require('../controllers/listingController');

router.post('/', protect, authorize('prosumer'), createListing);
router.get('/', protect, authorize('consumer'), listListings);
router.get('/mine', protect, authorize('prosumer'), listMyListings);
router.get('/:id/photo', getListingPhoto);
router.get('/:id/photos/:index', getListingPhoto);
router.get('/:id', protect, getListing);
router.patch('/:id', protect, authorize('prosumer'), updateListing);
router.delete('/:id', protect, authorize('prosumer'), cancelListing);

module.exports = router;
