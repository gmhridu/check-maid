const express = require('express');
const {
  getServices,
  getService,
  createService,
  updateService,
  deleteService,
  getServicesByCategory,
  getFeaturedServices
} = require('../controllers/serviceController');

const { protect, authorize } = require('../middleware/auth');
const { validateService } = require('../middleware/validation');

const router = express.Router();

// Public routes
router.get('/', getServices);
router.get('/featured', getFeaturedServices);
router.get('/category/:category', getServicesByCategory);
router.get('/:id', getService);

// Protected routes (Admin only)
router.use(protect);
router.use(authorize('admin'));

router.post('/', validateService, createService);
router.patch('/:id', validateService, updateService);
router.delete('/:id', deleteService);

module.exports = router;
