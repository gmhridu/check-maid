const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const { sendSMS, sendAdminSMS, getStaffPhoneNumbers } = require('../utils/sms');

// @desc    Get dashboard statistics
// @route   GET /api/v1/admin/dashboard
// @access  Private (Admin only)
exports.getDashboardStats = asyncHandler(async (req, res, next) => {
  // Get date ranges
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  // User statistics
  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ isActive: true });
  const newUsersThisMonth = await User.countDocuments({
    createdAt: { $gte: startOfMonth }
  });

  // Booking statistics
  const totalBookings = await Booking.countDocuments();
  const pendingBookings = await Booking.countDocuments({ status: 'pending' });
  const completedBookings = await Booking.countDocuments({ status: 'completed' });
  const cancelledBookings = await Booking.countDocuments({ status: 'cancelled' });
  
  const bookingsThisMonth = await Booking.countDocuments({
    createdAt: { $gte: startOfMonth }
  });

  // Revenue statistics
  const revenueStats = await Booking.aggregate([
    {
      $match: {
        status: 'completed',
        'payment.status': 'paid'
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$pricing.totalAmount' },
        averageBookingValue: { $avg: '$pricing.totalAmount' }
      }
    }
  ]);

  const monthlyRevenue = await Booking.aggregate([
    {
      $match: {
        status: 'completed',
        'payment.status': 'paid',
        createdAt: { $gte: startOfMonth }
      }
    },
    {
      $group: {
        _id: null,
        revenue: { $sum: '$pricing.totalAmount' }
      }
    }
  ]);

  // Service statistics
  const totalServices = await Service.countDocuments();
  const activeServices = await Service.countDocuments({ isActive: true });

  // Popular services
  const popularServices = await Booking.aggregate([
    {
      $group: {
        _id: '$serviceType',
        count: { $sum: 1 },
        revenue: { $sum: '$pricing.totalAmount' }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: 5
    }
  ]);

  // Recent activity
  const recentBookings = await Booking.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('customer', 'name email')
    .select('bookingNumber serviceType status scheduledDate pricing.totalAmount customer guestInfo');

  const recentUsers = await User.find({ role: 'customer' })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('name email createdAt isActive');

  // Monthly trends
  const monthlyTrends = await Booking.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfYear }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        bookings: { $sum: 1 },
        revenue: {
          $sum: {
            $cond: [
              { $eq: ['$status', 'completed'] },
              '$pricing.totalAmount',
              0
            ]
          }
        }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      overview: {
        totalUsers,
        activeUsers,
        newUsersThisMonth,
        totalBookings,
        pendingBookings,
        completedBookings,
        cancelledBookings,
        bookingsThisMonth,
        totalServices,
        activeServices,
        totalRevenue: revenueStats[0]?.totalRevenue || 0,
        monthlyRevenue: monthlyRevenue[0]?.revenue || 0,
        averageBookingValue: revenueStats[0]?.averageBookingValue || 0
      },
      popularServices,
      recentActivity: {
        bookings: recentBookings,
        users: recentUsers
      },
      monthlyTrends
    }
  });
});

// @desc    Get all users
// @route   GET /api/v1/admin/users
// @access  Private (Admin only)
exports.getAllUsers = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    role,
    active,
    search,
    sort = '-createdAt'
  } = req.query;

  // Build query
  const query = {};

  if (role) {
    query.role = role;
  }

  if (active !== undefined) {
    query.isActive = active === 'true';
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort,
    select: '-password'
  };

  const users = await User.paginate(query, options);

  res.status(200).json({
    success: true,
    data: users.docs,
    pagination: {
      page: users.page,
      pages: users.totalPages,
      total: users.totalDocs,
      limit: users.limit
    }
  });
});

// @desc    Get user by ID
// @route   GET /api/v1/admin/users/:id
// @access  Private (Admin only)
exports.getUserById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Get user's booking statistics
  const bookingStats = await Booking.aggregate([
    {
      $match: {
        $or: [
          { customer: user._id },
          { 'guestInfo.email': user.email }
        ]
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$pricing.totalAmount' }
      }
    }
  ]);

  const totalBookings = await Booking.countDocuments({
    $or: [
      { customer: user._id },
      { 'guestInfo.email': user.email }
    ]
  });

  const recentBookings = await Booking.find({
    $or: [
      { customer: user._id },
      { 'guestInfo.email': user.email }
    ]
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('bookingNumber serviceType status scheduledDate pricing.totalAmount');

  res.status(200).json({
    success: true,
    data: {
      user,
      stats: {
        totalBookings,
        bookingsByStatus: bookingStats,
        recentBookings
      }
    }
  });
});

// @desc    Update user role
// @route   PATCH /api/v1/admin/users/:id/role
// @access  Private (Admin only)
exports.updateUserRole = asyncHandler(async (req, res, next) => {
  const { role } = req.body;

  if (!['customer', 'staff', 'admin'].includes(role)) {
    return next(new ErrorResponse('Invalid role', 400));
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Prevent changing own role
  if (user._id.toString() === req.user.id) {
    return next(new ErrorResponse('Cannot change your own role', 400));
  }

  user.role = role;
  await user.save();

  res.status(200).json({
    success: true,
    data: user,
    message: `User role updated to ${role}`
  });
});

// @desc    Deactivate/Activate user
// @route   PATCH /api/v1/admin/users/:id/deactivate
// @access  Private (Admin only)
exports.deactivateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Prevent deactivating own account
  if (user._id.toString() === req.user.id) {
    return next(new ErrorResponse('Cannot deactivate your own account', 400));
  }

  user.isActive = !user.isActive;
  await user.save();

  res.status(200).json({
    success: true,
    data: user,
    message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`
  });
});

// @desc    Get system logs (placeholder)
// @route   GET /api/v1/admin/logs
// @access  Private (Admin only)
exports.getSystemLogs = asyncHandler(async (req, res, next) => {
  // This is a placeholder for system logs
  // In a real application, you would implement proper logging
  const logs = [
    {
      id: 1,
      timestamp: new Date(),
      level: 'info',
      message: 'User login successful',
      userId: req.user.id
    },
    {
      id: 2,
      timestamp: new Date(Date.now() - 60000),
      level: 'warning',
      message: 'Failed login attempt',
      ip: '192.168.1.1'
    }
  ];

  res.status(200).json({
    success: true,
    data: logs,
    message: 'System logs retrieved (placeholder implementation)'
  });
});

// @desc    Get all staff members
// @route   GET /api/v1/admin/staff
// @access  Private (Admin only)
exports.getStaffMembers = asyncHandler(async (req, res, next) => {
  const staff = await User.find({ role: 'staff' })
    .select('name email phone preferences.serviceTypes preferences.notifications isActive createdAt')
    .sort({ name: 1 });

  res.status(200).json({
    success: true,
    data: staff,
    count: staff.length
  });
});

// @desc    Update staff member service types and SMS preferences
// @route   PATCH /api/v1/admin/staff/:id
// @access  Private (Admin only)
exports.updateStaffMember = asyncHandler(async (req, res, next) => {
  const { serviceTypes, smsNotifications, phone } = req.body;

  const staff = await User.findById(req.params.id);

  if (!staff) {
    return next(new ErrorResponse('Staff member not found', 404));
  }

  if (staff.role !== 'staff') {
    return next(new ErrorResponse('User is not a staff member', 400));
  }

  // Update service types if provided
  if (serviceTypes && Array.isArray(serviceTypes)) {
    staff.preferences.serviceTypes = serviceTypes;
  }

  // Update SMS notification preference if provided
  if (typeof smsNotifications === 'boolean') {
    staff.preferences.notifications.sms = smsNotifications;
  }

  // Update phone number if provided
  if (phone) {
    staff.phone = phone;
  }

  await staff.save();

  res.status(200).json({
    success: true,
    data: {
      id: staff._id,
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      serviceTypes: staff.preferences.serviceTypes,
      smsNotifications: staff.preferences.notifications.sms
    },
    message: 'Staff member updated successfully'
  });
});

// @desc    Test SMS notification system
// @route   POST /api/v1/admin/test-sms
// @access  Private (Admin only)
exports.testSMSNotification = asyncHandler(async (req, res, next) => {
  const { serviceType, message } = req.body;

  if (!serviceType) {
    return next(new ErrorResponse('Please provide a service type', 400));
  }

  const testMessage = message || `🧹 TEST SMS: This is a test notification for ${serviceType} service bookings. SMS system is working correctly!`;

  let results = {
    admin: false,
    staff: []
  };

  // Send test SMS to admin
  try {
    const adminResult = await sendAdminSMS({
      message: testMessage
    });
    results.admin = adminResult.success;
  } catch (error) {
    console.error('Error sending test SMS to admin:', error);
  }

  // Send test SMS to staff
  try {
    const staffPhones = await getStaffPhoneNumbers(serviceType);

    if (staffPhones.length > 0) {
      for (const staff of staffPhones) {
        const staffResult = await sendSMS({
          to: staff.phone,
          message: `Hi ${staff.name}! ${testMessage}`
        });

        results.staff.push({
          name: staff.name,
          phone: staff.phone,
          success: staffResult.success,
          message: staffResult.message
        });
      }
    }
  } catch (error) {
    console.error('Error sending test SMS to staff:', error);
  }

  res.status(200).json({
    success: true,
    data: results,
    message: 'SMS test completed'
  });
});
