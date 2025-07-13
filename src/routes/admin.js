const express = require('express');
const {
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUserRole,
  deactivateUser,
  getSystemLogs,
  getStaffMembers,
  updateStaffMember,
  testSMSNotification
} = require('../controllers/adminController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require admin access
router.use(protect);
router.use(authorize('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/role', updateUserRole);
router.patch('/users/:id/deactivate', deactivateUser);
router.get('/logs', getSystemLogs);

// Staff management routes
router.get('/staff', getStaffMembers);
router.patch('/staff/:id', updateStaffMember);

// SMS testing route
router.post('/test-sms', testSMSNotification);

module.exports = router;
