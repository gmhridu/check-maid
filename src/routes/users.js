const express = require('express');
const {
  getProfile,
  updateProfile,
  deleteAccount,
  updatePreferences
} = require('../controllers/userController');

const { protect } = require('../middleware/auth');
const { validateProfileUpdate } = require('../middleware/validation');

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/profile', getProfile);
router.patch('/profile', validateProfileUpdate, updateProfile);
router.patch('/preferences', updatePreferences);
router.delete('/account', deleteAccount);

module.exports = router;
