const express = require('express');
const {
  createBooking,
  getBookings,
  getBooking,
  updateBooking,
  deleteBooking,
  getBookingStats
} = require('../controllers/bookingController');

const { protect, authorize } = require('../middleware/auth');
const { validateBooking, validateBookingUpdate } = require('../middleware/validation');

const router = express.Router();

// Public routes (no authentication required)
router.post('/', createBooking);

// Admin/Staff routes (require authentication)
router.get('/stats', protect, authorize('admin', 'staff'), getBookingStats);
router.get('/', protect, authorize('admin', 'staff'), getBookings);
router.get('/:id', protect, authorize('admin', 'staff'), getBooking);
router.patch('/:id', protect, authorize('admin', 'staff'), validateBookingUpdate, updateBooking);
router.delete('/:id', protect, authorize('admin'), deleteBooking);

module.exports = router;
