const express = require('express');
const {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  updatePassword,
  verifyEmail,
  resendVerification
} = require('../controllers/authController');

const { protect, sensitiveOperationLimit } = require('../middleware/auth');
const {
  validateUserRegistration,
  validateUserLogin,
  validatePasswordReset,
  validateNewPassword
} = require('../middleware/validation');

const router = express.Router();

// Public routes
router.post('/register', validateUserRegistration, register);
router.post('/login', sensitiveOperationLimit(), validateUserLogin, login);
router.post('/forgot-password', sensitiveOperationLimit(), validatePasswordReset, forgotPassword);
router.patch('/reset-password/:token', validateNewPassword, resetPassword);
router.get('/verify-email/:token', verifyEmail);

// Protected routes
router.use(protect);

router.get('/me', getMe);
router.post('/logout', logout);
router.patch('/update-password', validateNewPassword, updatePassword);
router.post('/resend-verification', resendVerification);

module.exports = router;
