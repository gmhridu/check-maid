const express = require('express');
const {
  getTestimonials,
  getFeaturedTestimonials,
  getTestimonialStats,
  getAllTestimonials,
  getTestimonial,
  createTestimonial,
  createPublicTestimonial,
  updateTestimonial,
  deleteTestimonial,
  approveTestimonial,
  toggleFeatured,
  bulkUpdateTestimonials
} = require('../controllers/testimonialController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getTestimonials);
router.get('/featured', getFeaturedTestimonials);
router.get('/stats', getTestimonialStats);
router.post('/public', createPublicTestimonial);

// Protected routes - Admin/Staff only
router.use(protect);
router.use(authorize('admin', 'staff'));

// Admin testimonial management routes
router.get('/admin', getAllTestimonials);
router.post('/', createTestimonial);
router.get('/:id', getTestimonial);
router.patch('/:id', updateTestimonial);
router.patch('/:id/approve', approveTestimonial);
router.patch('/:id/featured', toggleFeatured);

// Admin only routes
router.delete('/:id', authorize('admin'), deleteTestimonial);
router.patch('/bulk', authorize('admin'), bulkUpdateTestimonials);

module.exports = router;
