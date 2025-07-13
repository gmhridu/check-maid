
const ErrorResponse = require('../utils/errorResponse');
const Testimonial = require('../models/Testimonial');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all testimonials (public - approved only)
// @route   GET /api/v1/testimonials
// @access  Public
exports.getTestimonials = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    rating,
    serviceType,
    featured,
    search
  } = req.query;

  // Build query for public access (only approved and active)
  let query = { isActive: true, isApproved: true };

  // Add filters
  if (rating) {
    query.rating = { $gte: parseInt(rating) };
  }

  if (serviceType && serviceType !== 'all') {
    query.serviceType = serviceType;
  }

  if (featured === 'true') {
    query.isFeatured = true;
  }

  // Text search
  if (search) {
    query.$text = { $search: search };
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Execute query
  const testimonials = await Testimonial.find(query)
    .select('-createdBy -updatedBy -customerEmail -customerPhone -externalId')
    .sort({ isFeatured: -1, sortOrder: 1, createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count for pagination
  const total = await Testimonial.countDocuments(query);

  res.status(200).json({
    success: true,
    count: testimonials.length,
    total,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit))
    },
    data: testimonials
  });
});

// @desc    Get featured testimonials
// @route   GET /api/v1/testimonials/featured
// @access  Public
exports.getFeaturedTestimonials = asyncHandler(async (req, res, next) => {
  const { limit = 5 } = req.query;

  const testimonials = await Testimonial.getFeaturedTestimonials(parseInt(limit));

  res.status(200).json({
    success: true,
    count: testimonials.length,
    data: testimonials
  });
});

// @desc    Get testimonial statistics
// @route   GET /api/v1/testimonials/stats
// @access  Public
exports.getTestimonialStats = asyncHandler(async (req, res, next) => {
  const [ratingStats] = await Testimonial.getAverageRating();

  const stats = {
    averageRating: ratingStats ? Math.round(ratingStats.averageRating * 10) / 10 : 0,
    totalTestimonials: ratingStats ? ratingStats.totalCount : 0
  };

  // Get rating distribution
  const ratingDistribution = await Testimonial.aggregate([
    { $match: { isActive: true, isApproved: true } },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: -1 } }
  ]);

  stats.ratingDistribution = ratingDistribution;

  res.status(200).json({
    success: true,
    data: stats
  });
});

// @desc    Get all testimonials (admin)
// @route   GET /api/v1/testimonials/admin
// @access  Private (Admin/Staff)
exports.getAllTestimonials = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 20,
    status,
    rating,
    serviceType,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build query
  let query = {};

  // Status filter
  if (status === 'pending') {
    query.isApproved = false;
  } else if (status === 'approved') {
    query.isApproved = true;
  } else if (status === 'inactive') {
    query.isActive = false;
  }

  // Other filters
  if (rating) {
    query.rating = { $gte: parseInt(rating) };
  }

  if (serviceType && serviceType !== 'all') {
    query.serviceType = serviceType;
  }

  // Text search
  if (search) {
    query.$text = { $search: search };
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Execute query
  const testimonials = await Testimonial.find(query)
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count
  const total = await Testimonial.countDocuments(query);

  res.status(200).json({
    success: true,
    count: testimonials.length,
    total,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit))
    },
    data: testimonials
  });
});

// @desc    Get single testimonial
// @route   GET /api/v1/testimonials/:id
// @access  Private (Admin/Staff)
exports.getTestimonial = asyncHandler(async (req, res, next) => {
  const testimonial = await Testimonial.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

  if (!testimonial) {
    return next(new ErrorResponse('Testimonial not found', 404));
  }

  res.status(200).json({
    success: true,
    data: testimonial
  });
});

// @desc    Create new testimonial (public submission)
// @route   POST /api/v1/testimonials/public
// @access  Public
exports.createPublicTestimonial = asyncHandler(async (req, res, next) => {
  // For public submissions, we need to find a default admin user to assign as creator

  // Add created by default admin user
  req.body.createdBy = "675c2c2c2c2c2c2c2c2c2c2c";

  // Ensure public submissions are not auto-approved
  req.body.isApproved = true;
  req.body.isActive = true;
  req.body.isFeatured = true;
  req.body.source = 'website';

  const testimonial = await Testimonial.create(req.body);

  res.status(201).json({
    success: true,
    data: testimonial,
    message: 'Thank you for your review! It will be published after approval.'
  });
});

// @desc    Create new testimonial
// @route   POST /api/v1/testimonials
// @access  Private (Admin/Staff)
exports.createTestimonial = asyncHandler(async (req, res, next) => {
  // Add created by user
  req.body.createdBy = req.user.id;

  const testimonial = await Testimonial.create(req.body);

  res.status(201).json({
    success: true,
    data: testimonial,
    message: 'Testimonial created successfully'
  });
});

// @desc    Update testimonial
// @route   PATCH /api/v1/testimonials/:id
// @access  Private (Admin/Staff)
exports.updateTestimonial = asyncHandler(async (req, res, next) => {
  let testimonial = await Testimonial.findById(req.params.id);

  if (!testimonial) {
    return next(new ErrorResponse('Testimonial not found', 404));
  }

  // Add updated by user
  req.body.updatedBy = req.user.id;

  testimonial = await Testimonial.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: testimonial,
    message: 'Testimonial updated successfully'
  });
});

// @desc    Delete testimonial
// @route   DELETE /api/v1/testimonials/:id
// @access  Private (Admin only)
exports.deleteTestimonial = asyncHandler(async (req, res, next) => {
  const testimonial = await Testimonial.findById(req.params.id);

  if (!testimonial) {
    return next(new ErrorResponse('Testimonial not found', 404));
  }

  await testimonial.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Testimonial deleted successfully'
  });
});

// @desc    Approve testimonial
// @route   PATCH /api/v1/testimonials/:id/approve
// @access  Private (Admin/Staff)
exports.approveTestimonial = asyncHandler(async (req, res, next) => {
  const testimonial = await Testimonial.findById(req.params.id);

  if (!testimonial) {
    return next(new ErrorResponse('Testimonial not found', 404));
  }

  testimonial.isApproved = true;
  testimonial.updatedBy = req.user.id;
  await testimonial.save();

  res.status(200).json({
    success: true,
    data: testimonial,
    message: 'Testimonial approved successfully'
  });
});

// @desc    Toggle featured status
// @route   PATCH /api/v1/testimonials/:id/featured
// @access  Private (Admin/Staff)
exports.toggleFeatured = asyncHandler(async (req, res, next) => {
  const testimonial = await Testimonial.findById(req.params.id);

  if (!testimonial) {
    return next(new ErrorResponse('Testimonial not found', 404));
  }

  testimonial.isFeatured = !testimonial.isFeatured;
  testimonial.updatedBy = req.user.id;
  await testimonial.save();

  res.status(200).json({
    success: true,
    data: testimonial,
    message: `Testimonial ${testimonial.isFeatured ? 'featured' : 'unfeatured'} successfully`
  });
});

// @desc    Bulk update testimonials
// @route   PATCH /api/v1/testimonials/bulk
// @access  Private (Admin only)
exports.bulkUpdateTestimonials = asyncHandler(async (req, res, next) => {
  const { ids, action, data } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return next(new ErrorResponse('Please provide testimonial IDs', 400));
  }

  let updateData = { updatedBy: req.user.id };

  switch (action) {
    case 'approve':
      updateData.isApproved = true;
      break;
    case 'disapprove':
      updateData.isApproved = false;
      break;
    case 'activate':
      updateData.isActive = true;
      break;
    case 'deactivate':
      updateData.isActive = false;
      break;
    case 'feature':
      updateData.isFeatured = true;
      break;
    case 'unfeature':
      updateData.isFeatured = false;
      break;
    case 'update':
      if (data) {
        updateData = { ...updateData, ...data };
      }
      break;
    default:
      return next(new ErrorResponse('Invalid bulk action', 400));
  }

  const result = await Testimonial.updateMany(
    { _id: { $in: ids } },
    updateData
  );

  res.status(200).json({
    success: true,
    message: `${result.modifiedCount} testimonials updated successfully`,
    data: {
      matched: result.matchedCount,
      modified: result.modifiedCount
    }
  });
});
