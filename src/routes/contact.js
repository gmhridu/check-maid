const express = require('express');
const {
  submitContactForm,
  getContactSubmissions,
  getContactSubmission,
  updateContactSubmission,
  deleteContactSubmission,
  getContactStats
} = require('../controllers/contactController');

const { protect, authorize } = require('../middleware/auth');
const { validateContactSubmission } = require('../middleware/validation');

const router = express.Router();

// Public route - Contact form submission
router.post('/', submitContactForm);

// Protected routes - Admin/Staff only
router.use(protect);
router.use(authorize('admin', 'staff'));

// Contact management routes
router.get('/stats', getContactStats);
router.get('/', getContactSubmissions);
router.get('/:id', getContactSubmission);
router.patch('/:id', updateContactSubmission);

// Admin only routes
router.delete('/:id', authorize('admin'), deleteContactSubmission);

module.exports = router;
