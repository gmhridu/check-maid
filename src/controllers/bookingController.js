const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Service = require('../models/Service');
const { sendEmail } = require('../utils/email');
const { sendSMS, sendAdminSMS, getStaffPhoneNumbers, sendBulkSMS } = require('../utils/sms');



// @desc    Create new booking
// @route   POST /api/v1/bookings
// @access  Public (no authentication required)
exports.createBooking = asyncHandler(async (req, res, next) => {
  const {
    contactName,
    contactEmail,
    contactPhone,
    serviceType,
    packageType,
    address,
    preferredDate,
    preferredTime,
    notes,
    submittedAt
  } = req.body;

  // Validate preferred date is not in the past
  const bookingDate = new Date(preferredDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (bookingDate < today) {
    return next(new ErrorResponse('Preferred date cannot be in the past', 400));
  }

  // Create booking data matching frontend structure
  const bookingData = {
    contactName: contactName.trim(),
    contactEmail: contactEmail.toLowerCase().trim(),
    contactPhone: contactPhone.trim(),
    serviceType,
    packageType: packageType || '',
    address: address.trim(),
    preferredDate: preferredDate,
    preferredTime,
    notes: notes ? notes.trim() : '',
    submittedAt: submittedAt ? new Date(submittedAt) : new Date(),
    status: 'pending',
  };

  // Create booking
  const booking = await Booking.create(bookingData);

  // Send confirmation emails
  // let emailResults = {
  //   customer: false,
  //   admin: false
  // };

  // // Send customer confirmation email
  // try {
  //   await sendEmail({
  //     to: booking.contactEmail,
  //     template: 'bookingConfirmation',
  //     data: {
  //       customerName: booking.contactName,
  //       bookingNumber: booking.bookingNumber,
  //       serviceType: booking.serviceType,
  //       packageType: booking.packageType,
  //       preferredDate: booking.preferredDate.toLocaleDateString(),
  //       preferredTime: booking.preferredTime,
  //       address: booking.address,
  //       notes: booking.notes
  //     }
  //   });
  //   emailResults.customer = true;
  //   booking.emailSent.customer = true;

  // } catch (emailError) {
  //   console.error('Failed to send customer confirmation email:', emailError);
  // }

  // // Send admin notification email
  // try {
  //   const adminEmail = process.env.ADMIN_EMAIL || 'admin@cleaningservice.com';
  //   await sendEmail({
  //     to: adminEmail,
  //     template: 'newBookingNotification',
  //     data: {
  //       bookingNumber: booking.bookingNumber,
  //       customerName: booking.contactName,
  //       customerEmail: booking.contactEmail,
  //       customerPhone: booking.contactPhone,
  //       serviceType: booking.serviceType,
  //       packageType: booking.packageType,
  //       preferredDate: booking.preferredDate.toLocaleDateString(),
  //       preferredTime: booking.preferredTime,
  //       address: booking.address,
  //       notes: booking.notes,
  //       submittedAt: booking.submittedAt.toLocaleString()
  //     }
  //   });
  //   emailResults.admin = true;
  //   booking.emailSent.admin = true;
  // } catch (emailError) {
  //   console.error('Failed to send admin notification email:', emailError);
  // }

  // Send SMS notifications for Airbnb, residential, and commercial services
  let smsResults = {
    admin: false,
    customer: false
  };

  // Check if this is one of the service types that should trigger SMS notifications
  const smsEnabledServices = ['airbnb', 'residential', 'commercial'];
  if (smsEnabledServices.includes(booking.serviceType.toLowerCase())) {

    // Send SMS to admin
    try {
      const adminSmsResult = await sendAdminSMS({
        template: 'newBooking',
        data: {
          customerName: booking.contactName,
          customerPhone: booking.contactPhone,
          serviceType: booking.serviceType,
          packageType: booking.packageType,
          preferredDate: booking.preferredDate.toLocaleDateString(),
          preferredTime: booking.preferredTime,
          address: booking.address,
          notes: booking.notes,
          bookingNumber: booking.bookingNumber
        }
      });

      if (adminSmsResult.success) {
        smsResults.admin = true;
        console.log('Admin SMS notification sent successfully');
      } else {
        console.error('Failed to send admin SMS:', adminSmsResult.message);
      }
    } catch (smsError) {
      console.error('Error sending admin SMS:', smsError);
    }

    // Send SMS to customer
    try {
      const customerSmsResult = await sendSMS({
        to: booking.contactPhone,
        template: 'bookingConfirmed',
        data: {
          customerName: booking.contactName,
          bookingNumber: booking.bookingNumber,
          serviceType: booking.serviceType,
          packageType: booking.packageType,
          preferredDate: booking.preferredDate.toLocaleDateString(),
          preferredTime: booking.preferredTime,
          address: booking.address,
          notes: booking.notes
        }

      });

      if (customerSmsResult.success) {
        smsResults.customer = true;
        console.log('Customer SMS notification sent successfully');
      } else {
        console.error('Failed to send customer SMS:', customerSmsResult.message);
      }
    } catch (smsError) {
      console.error('Error sending customer SMS:', smsError);
    }

  }

  booking.emailSent.admin = smsResults.admin;
  booking.emailSent.customer = smsResults.customer;
  booking.smsSent.admin = smsResults.admin;
  booking.smsSent.customer = smsResults.customer;

  // Save email and SMS status
  await booking.save();

  res.status(201).json({
    success: true,
    data: booking.getDisplayInfo(),
    message: 'Booking submitted successfully! We will contact you soon to confirm your appointment.',
  });
});

// @desc    Get all bookings (admin/staff only)
// @route   GET /api/v1/bookings
// @access  Private (Admin/Staff)
exports.getBookings = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    status,
    serviceType,
    startDate,
    endDate,
    search
  } = req.query;

  // Build query
  const query = {};

  if (status) {
    query.status = status;
  }

  if (serviceType) {
    query.serviceType = serviceType;
  }

  if (startDate || endDate) {
    query.scheduledDate = {};
    if (startDate) {
      query.scheduledDate.$gte = new Date(startDate);
    }
    if (endDate) {
      query.scheduledDate.$lte = new Date(endDate);
    }
  }

  if (search) {
    query.$or = [
      { bookingNumber: { $regex: search, $options: 'i' } },
      { 'guestInfo.name': { $regex: search, $options: 'i' } },
      { 'guestInfo.email': { $regex: search, $options: 'i' } },
      { 'address.street': { $regex: search, $options: 'i' } }
    ];
  }

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { createdAt: -1 },
    populate: [
      { path: 'customer', select: 'name email phone' },
      { path: 'assignedStaff.staff', select: 'name email' }
    ]
  };

  const bookings = await Booking.paginate(query, options);

  res.status(200).json({
    success: true,
    data: bookings.docs,
    pagination: {
      page: bookings.page,
      pages: bookings.totalPages,
      total: bookings.totalDocs,
      limit: bookings.limit
    }
  });
});

// @desc    Get single booking
// @route   GET /api/v1/bookings/:id
// @access  Private
exports.getBooking = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id)
    .populate('customer', 'name email phone address')
    .populate('assignedStaff.staff', 'name email phone');

  if (!booking) {
    return next(new ErrorResponse('Booking not found', 404));
  }

  // Check if user can access this booking
  if (req.user.role === 'customer') {
    if (booking.customer && booking.customer._id.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to access this booking', 403));
    }
    if (!booking.customer && booking.guestInfo.email !== req.user.email) {
      return next(new ErrorResponse('Not authorized to access this booking', 403));
    }
  }

  res.status(200).json({
    success: true,
    data: booking
  });
});

// @desc    Update booking
// @route   PATCH /api/v1/bookings/:id
// @access  Private (Admin/Staff)
exports.updateBooking = asyncHandler(async (req, res, next) => {
  let booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(new ErrorResponse('Booking not found', 404));
  }

  // Add history entry for the update
  const oldStatus = booking.status;

  booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).populate('customer', 'name email phone');

  // Add history entry if status changed
  if (oldStatus !== booking.status) {
    await booking.addHistory(
      `Status changed from ${oldStatus} to ${booking.status}`,
      req.user._id,
      { oldStatus, newStatus: booking.status }
    );
  }

  res.status(200).json({
    success: true,
    data: booking,
    message: 'Booking updated successfully'
  });
});

// @desc    Delete booking
// @route   DELETE /api/v1/bookings/:id
// @access  Private (Admin only)
exports.deleteBooking = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(new ErrorResponse('Booking not found', 404));
  }

  await booking.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Booking deleted successfully'
  });
});

// @desc    Get current user's bookings
// @route   GET /api/v1/bookings/my-bookings
// @access  Private (Customer)
exports.getMyBookings = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, status } = req.query;

  const query = {
    $or: [
      { customer: req.user._id },
      { 'guestInfo.email': req.user.email }
    ]
  };

  if (status) {
    query.status = status;
  }

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { createdAt: -1 },
    populate: [
      { path: 'assignedStaff.staff', select: 'name phone' }
    ]
  };

  const bookings = await Booking.paginate(query, options);

  res.status(200).json({
    success: true,
    data: bookings.docs,
    pagination: {
      page: bookings.page,
      pages: bookings.totalPages,
      total: bookings.totalDocs,
      limit: bookings.limit
    }
  });
});

// @desc    Cancel booking
// @route   PATCH /api/v1/bookings/:id/cancel
// @access  Private
exports.cancelBooking = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(new ErrorResponse('Booking not found', 404));
  }

  // Check authorization
  if (req.user.role === 'customer') {
    if (booking.customer && booking.customer.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to cancel this booking', 403));
    }
  }

  // Check if booking can be cancelled
  if (['completed', 'cancelled'].includes(booking.status)) {
    return next(new ErrorResponse('Cannot cancel a booking that is already completed or cancelled', 400));
  }

  // Check cancellation policy (24 hours before scheduled time)
  const scheduledDateTime = new Date(booking.scheduledDate);
  const now = new Date();
  const hoursUntilBooking = (scheduledDateTime - now) / (1000 * 60 * 60);

  if (hoursUntilBooking < 24 && req.user.role === 'customer') {
    return next(new ErrorResponse('Bookings can only be cancelled at least 24 hours in advance', 400));
  }

  booking.status = 'cancelled';
  await booking.addHistory('Booking cancelled', req.user._id, {
    reason: req.body.reason || 'No reason provided'
  });

  await booking.save();

  res.status(200).json({
    success: true,
    data: booking,
    message: 'Booking cancelled successfully'
  });
});

// @desc    Reschedule booking
// @route   PATCH /api/v1/bookings/:id/reschedule
// @access  Private
exports.rescheduleBooking = asyncHandler(async (req, res, next) => {
  const { scheduledDate, scheduledTime } = req.body;

  if (!scheduledDate || !scheduledTime) {
    return next(new ErrorResponse('Please provide new scheduled date and time', 400));
  }

  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(new ErrorResponse('Booking not found', 404));
  }

  // Check authorization
  if (req.user.role === 'customer') {
    if (booking.customer && booking.customer.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to reschedule this booking', 403));
    }
  }

  // Validate new date is in the future
  const newDate = new Date(scheduledDate);
  if (newDate <= new Date()) {
    return next(new ErrorResponse('New scheduled date must be in the future', 400));
  }

  const oldDate = booking.scheduledDate;
  const oldTime = booking.scheduledTime;

  booking.scheduledDate = newDate;
  booking.scheduledTime = scheduledTime;
  booking.status = 'rescheduled';

  await booking.addHistory('Booking rescheduled', req.user._id, {
    oldDate: oldDate.toISOString(),
    oldTime,
    newDate: newDate.toISOString(),
    newTime: scheduledTime
  });

  await booking.save();

  res.status(200).json({
    success: true,
    data: booking,
    message: 'Booking rescheduled successfully'
  });
});

// @desc    Add feedback to booking
// @route   POST /api/v1/bookings/:id/feedback
// @access  Private (Customer)
exports.addBookingFeedback = asyncHandler(async (req, res, next) => {
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return next(new ErrorResponse('Please provide a rating between 1 and 5', 400));
  }

  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(new ErrorResponse('Booking not found', 404));
  }

  // Check authorization
  if (booking.customer && booking.customer.toString() !== req.user.id) {
    return next(new ErrorResponse('Not authorized to add feedback to this booking', 403));
  }

  // Check if booking is completed
  if (booking.status !== 'completed') {
    return next(new ErrorResponse('Feedback can only be added to completed bookings', 400));
  }

  // Check if feedback already exists
  if (booking.feedback.rating) {
    return next(new ErrorResponse('Feedback has already been provided for this booking', 400));
  }

  booking.feedback = {
    rating,
    comment: comment || '',
    submittedAt: new Date()
  };

  await booking.save();

  res.status(200).json({
    success: true,
    data: booking.feedback,
    message: 'Feedback added successfully'
  });
});

// @desc    Get booking statistics
// @route   GET /api/v1/bookings/stats
// @access  Private (Admin/Staff)
exports.getBookingStats = asyncHandler(async (req, res, next) => {
  const stats = await Booking.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$pricing.totalAmount' }
      }
    }
  ]);

  const serviceTypeStats = await Booking.aggregate([
    {
      $group: {
        _id: '$serviceType',
        count: { $sum: 1 },
        averagePrice: { $avg: '$pricing.totalAmount' }
      }
    }
  ]);

  const monthlyStats = await Booking.aggregate([
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        count: { $sum: 1 },
        revenue: { $sum: '$pricing.totalAmount' }
      }
    },
    {
      $sort: { '_id.year': -1, '_id.month': -1 }
    },
    {
      $limit: 12
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      statusStats: stats,
      serviceTypeStats,
      monthlyStats
    }
  });
});
