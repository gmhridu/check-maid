const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');
const Booking = require('../models/Booking');

// @desc    Get user profile
// @route   GET /api/v1/users/profile
// @access  Private
exports.getProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('-password');

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
        count: { $sum: 1 }
      }
    }
  ]);

  const totalBookings = await Booking.countDocuments({
    $or: [
      { customer: user._id },
      { 'guestInfo.email': user.email }
    ]
  });

  res.status(200).json({
    success: true,
    data: {
      user,
      stats: {
        totalBookings,
        bookingsByStatus: bookingStats
      }
    }
  });
});

// @desc    Update user profile
// @route   PATCH /api/v1/users/profile
// @access  Private
exports.updateProfile = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    name: req.body.name,
    phone: req.body.phone,
    address: req.body.address
  };

  // Remove undefined fields
  Object.keys(fieldsToUpdate).forEach(key => {
    if (fieldsToUpdate[key] === undefined) {
      delete fieldsToUpdate[key];
    }
  });

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true
  }).select('-password');

  res.status(200).json({
    success: true,
    data: user,
    message: 'Profile updated successfully'
  });
});

// @desc    Update user preferences
// @route   PATCH /api/v1/users/preferences
// @access  Private
exports.updatePreferences = asyncHandler(async (req, res, next) => {
  const { serviceTypes, notifications } = req.body;

  const updateData = {};
  
  if (serviceTypes) {
    updateData['preferences.serviceTypes'] = serviceTypes;
  }
  
  if (notifications) {
    if (notifications.email !== undefined) {
      updateData['preferences.notifications.email'] = notifications.email;
    }
    if (notifications.sms !== undefined) {
      updateData['preferences.notifications.sms'] = notifications.sms;
    }
    if (notifications.marketing !== undefined) {
      updateData['preferences.notifications.marketing'] = notifications.marketing;
    }
  }

  const user = await User.findByIdAndUpdate(req.user.id, updateData, {
    new: true,
    runValidators: true
  }).select('-password');

  res.status(200).json({
    success: true,
    data: user,
    message: 'Preferences updated successfully'
  });
});

// @desc    Delete user account
// @route   DELETE /api/v1/users/account
// @access  Private
exports.deleteAccount = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Check for active bookings
  const activeBookings = await Booking.countDocuments({
    customer: user._id,
    status: { $in: ['pending', 'confirmed', 'assigned', 'in-progress'] }
  });

  if (activeBookings > 0) {
    return next(new ErrorResponse('Cannot delete account with active bookings. Please cancel or complete all bookings first.', 400));
  }

  // Soft delete - deactivate account instead of hard delete
  user.isActive = false;
  user.email = `deleted_${Date.now()}_${user.email}`;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Account deactivated successfully'
  });
});

// @desc    Get user's dashboard data
// @route   GET /api/v1/users/dashboard
// @access  Private
exports.getDashboard = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('-password');

  // Get recent bookings
  const recentBookings = await Booking.find({
    $or: [
      { customer: user._id },
      { 'guestInfo.email': user.email }
    ]
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('bookingNumber serviceType status scheduledDate pricing.totalAmount');

  // Get upcoming bookings
  const upcomingBookings = await Booking.find({
    $or: [
      { customer: user._id },
      { 'guestInfo.email': user.email }
    ],
    scheduledDate: { $gte: new Date() },
    status: { $in: ['pending', 'confirmed', 'assigned'] }
  })
    .sort({ scheduledDate: 1 })
    .limit(3)
    .select('bookingNumber serviceType scheduledDate scheduledTime address.street address.city');

  // Get booking statistics
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
        _id: null,
        totalBookings: { $sum: 1 },
        totalSpent: { $sum: '$pricing.totalAmount' },
        completedBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        cancelledBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        }
      }
    }
  ]);

  const stats = bookingStats[0] || {
    totalBookings: 0,
    totalSpent: 0,
    completedBookings: 0,
    cancelledBookings: 0
  };

  res.status(200).json({
    success: true,
    data: {
      user,
      recentBookings,
      upcomingBookings,
      stats
    }
  });
});

// @desc    Upload profile picture
// @route   POST /api/v1/users/profile-picture
// @access  Private
exports.uploadProfilePicture = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  if (!req.file) {
    return next(new ErrorResponse('Please upload a file', 400));
  }

  // Here you would typically upload to cloud storage (Cloudinary, AWS S3, etc.)
  // For now, we'll just store the filename
  const profilePictureUrl = `/uploads/profiles/${req.file.filename}`;

  user.profilePicture = profilePictureUrl;
  await user.save();

  res.status(200).json({
    success: true,
    data: {
      profilePicture: profilePictureUrl
    },
    message: 'Profile picture uploaded successfully'
  });
});

// @desc    Get user's favorite services
// @route   GET /api/v1/users/favorites
// @access  Private
exports.getFavorites = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id)
    .populate('preferences.favoriteServices', 'name category pricing.basePrice');

  res.status(200).json({
    success: true,
    data: user.preferences.favoriteServices || []
  });
});

// @desc    Add service to favorites
// @route   POST /api/v1/users/favorites/:serviceId
// @access  Private
exports.addToFavorites = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  const serviceId = req.params.serviceId;

  // Check if service exists
  const Service = require('../models/Service');
  const service = await Service.findById(serviceId);

  if (!service) {
    return next(new ErrorResponse('Service not found', 404));
  }

  // Initialize favorites array if it doesn't exist
  if (!user.preferences.favoriteServices) {
    user.preferences.favoriteServices = [];
  }

  // Check if already in favorites
  if (user.preferences.favoriteServices.includes(serviceId)) {
    return next(new ErrorResponse('Service already in favorites', 400));
  }

  user.preferences.favoriteServices.push(serviceId);
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Service added to favorites'
  });
});

// @desc    Remove service from favorites
// @route   DELETE /api/v1/users/favorites/:serviceId
// @access  Private
exports.removeFromFavorites = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  const serviceId = req.params.serviceId;

  if (!user.preferences.favoriteServices) {
    return next(new ErrorResponse('No favorites found', 404));
  }

  const index = user.preferences.favoriteServices.indexOf(serviceId);
  if (index === -1) {
    return next(new ErrorResponse('Service not in favorites', 404));
  }

  user.preferences.favoriteServices.splice(index, 1);
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Service removed from favorites'
  });
});
