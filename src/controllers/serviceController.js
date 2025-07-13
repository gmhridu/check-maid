const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const Service = require('../models/Service');

// @desc    Get all services
// @route   GET /api/v1/services
// @access  Public
exports.getServices = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    category,
    featured,
    active = true,
    search,
    sort = 'sortOrder'
  } = req.query;

  // Build query
  const query = {};

  if (active !== 'all') {
    query.isActive = active === 'true';
  }

  if (category) {
    query.category = category;
  }

  if (featured) {
    query.isFeatured = featured === 'true';
  }

  if (search) {
    query.$text = { $search: search };
  }

  // Build sort object
  let sortObj = {};
  if (sort) {
    const sortFields = sort.split(',');
    sortFields.forEach(field => {
      if (field.startsWith('-')) {
        sortObj[field.substring(1)] = -1;
      } else {
        sortObj[field] = 1;
      }
    });
  }

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: sortObj,
    select: search ? undefined : '-__v'
  };

  const services = await Service.paginate(query, options);

  res.status(200).json({
    success: true,
    data: services.docs,
    pagination: {
      page: services.page,
      pages: services.totalPages,
      total: services.totalDocs,
      limit: services.limit
    }
  });
});

// @desc    Get single service
// @route   GET /api/v1/services/:id
// @access  Public
exports.getService = asyncHandler(async (req, res, next) => {
  const service = await Service.findById(req.params.id)
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name');

  if (!service) {
    return next(new ErrorResponse('Service not found', 404));
  }

  // Only show active services to public (unless admin)
  if (!service.isActive && (!req.user || req.user.role !== 'admin')) {
    return next(new ErrorResponse('Service not found', 404));
  }

  res.status(200).json({
    success: true,
    data: service
  });
});

// @desc    Create new service
// @route   POST /api/v1/services
// @access  Private (Admin only)
exports.createService = asyncHandler(async (req, res, next) => {
  // Add created by user
  req.body.createdBy = req.user.id;

  const service = await Service.create(req.body);

  res.status(201).json({
    success: true,
    data: service,
    message: 'Service created successfully'
  });
});

// @desc    Update service
// @route   PATCH /api/v1/services/:id
// @access  Private (Admin only)
exports.updateService = asyncHandler(async (req, res, next) => {
  let service = await Service.findById(req.params.id);

  if (!service) {
    return next(new ErrorResponse('Service not found', 404));
  }

  // Add updated by user
  req.body.updatedBy = req.user.id;

  service = await Service.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: service,
    message: 'Service updated successfully'
  });
});

// @desc    Delete service
// @route   DELETE /api/v1/services/:id
// @access  Private (Admin only)
exports.deleteService = asyncHandler(async (req, res, next) => {
  const service = await Service.findById(req.params.id);

  if (!service) {
    return next(new ErrorResponse('Service not found', 404));
  }

  // Check if service has active bookings
  const Booking = require('../models/Booking');
  const activeBookings = await Booking.countDocuments({
    serviceType: service.category,
    status: { $in: ['pending', 'confirmed', 'assigned', 'in-progress'] }
  });

  if (activeBookings > 0) {
    return next(new ErrorResponse('Cannot delete service with active bookings', 400));
  }

  await service.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Service deleted successfully'
  });
});

// @desc    Get services by category
// @route   GET /api/v1/services/category/:category
// @access  Public
exports.getServicesByCategory = asyncHandler(async (req, res, next) => {
  const { category } = req.params;
  const { limit = 10, featured } = req.query;

  const query = {
    category,
    isActive: true
  };

  if (featured) {
    query.isFeatured = featured === 'true';
  }

  const services = await Service.find(query)
    .select('-__v')
    .sort({ sortOrder: 1, createdAt: -1 })
    .limit(parseInt(limit));

  res.status(200).json({
    success: true,
    count: services.length,
    data: services
  });
});

// @desc    Get featured services
// @route   GET /api/v1/services/featured
// @access  Public
exports.getFeaturedServices = asyncHandler(async (req, res, next) => {
  const { limit = 6 } = req.query;

  const services = await Service.find({
    isFeatured: true,
    isActive: true
  })
    .select('-__v')
    .sort({ sortOrder: 1, 'ratings.average': -1 })
    .limit(parseInt(limit));

  res.status(200).json({
    success: true,
    count: services.length,
    data: services
  });
});

// @desc    Get service statistics
// @route   GET /api/v1/services/stats
// @access  Private (Admin only)
exports.getServiceStats = asyncHandler(async (req, res, next) => {
  const stats = await Service.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        averagePrice: { $avg: '$pricing.basePrice' },
        averageRating: { $avg: '$ratings.average' }
      }
    }
  ]);

  const totalServices = await Service.countDocuments();
  const activeServices = await Service.countDocuments({ isActive: true });
  const featuredServices = await Service.countDocuments({ isFeatured: true });

  res.status(200).json({
    success: true,
    data: {
      totalServices,
      activeServices,
      featuredServices,
      categoryStats: stats
    }
  });
});

// @desc    Toggle service status
// @route   PATCH /api/v1/services/:id/toggle-status
// @access  Private (Admin only)
exports.toggleServiceStatus = asyncHandler(async (req, res, next) => {
  const service = await Service.findById(req.params.id);

  if (!service) {
    return next(new ErrorResponse('Service not found', 404));
  }

  service.isActive = !service.isActive;
  service.updatedBy = req.user.id;
  await service.save();

  res.status(200).json({
    success: true,
    data: service,
    message: `Service ${service.isActive ? 'activated' : 'deactivated'} successfully`
  });
});

// @desc    Toggle featured status
// @route   PATCH /api/v1/services/:id/toggle-featured
// @access  Private (Admin only)
exports.toggleFeaturedStatus = asyncHandler(async (req, res, next) => {
  const service = await Service.findById(req.params.id);

  if (!service) {
    return next(new ErrorResponse('Service not found', 404));
  }

  service.isFeatured = !service.isFeatured;
  service.updatedBy = req.user.id;
  await service.save();

  res.status(200).json({
    success: true,
    data: service,
    message: `Service ${service.isFeatured ? 'featured' : 'unfeatured'} successfully`
  });
});

// @desc    Update service pricing
// @route   PATCH /api/v1/services/:id/pricing
// @access  Private (Admin only)
exports.updateServicePricing = asyncHandler(async (req, res, next) => {
  const service = await Service.findById(req.params.id);

  if (!service) {
    return next(new ErrorResponse('Service not found', 404));
  }

  const { basePrice, priceType, minimumCharge, additionalCharges } = req.body;

  if (basePrice !== undefined) service.pricing.basePrice = basePrice;
  if (priceType) service.pricing.priceType = priceType;
  if (minimumCharge !== undefined) service.pricing.minimumCharge = minimumCharge;
  if (additionalCharges) service.pricing.additionalCharges = additionalCharges;

  service.updatedBy = req.user.id;
  await service.save();

  res.status(200).json({
    success: true,
    data: service,
    message: 'Service pricing updated successfully'
  });
});
