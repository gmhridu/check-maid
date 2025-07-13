const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');

// Protect routes - verify JWT token
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Check for token in cookies (if using cookie-based auth)
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new ErrorResponse('No user found with this token', 401));
    }

    // Check if user is active
    if (!user.isActive) {
      return next(new ErrorResponse('User account is deactivated', 401));
    }

    // Check if account is locked
    if (user.isLocked()) {
      return next(new ErrorResponse('Account is temporarily locked due to too many failed login attempts', 423));
    }

    req.user = user;
    next();
  } catch (error) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }
});

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('Not authorized to access this route', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ErrorResponse(`User role '${req.user.role}' is not authorized to access this route`, 403));
    }

    next();
  };
};

// Optional authentication - doesn't fail if no token
exports.optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.isActive && !user.isLocked()) {
        req.user = user;
      }
    } catch (error) {
      // Token is invalid, but we don't fail the request
      console.log('Invalid token in optional auth:', error.message);
    }
  }

  next();
});

// Check if user owns the resource or is admin
exports.ownerOrAdmin = (resourceUserField = 'user') => {
  return asyncHandler(async (req, res, next) => {
    // Admin can access everything
    if (req.user.role === 'admin') {
      return next();
    }

    // Get the resource to check ownership
    const Model = getModelFromRoute(req.route.path);
    const resource = await Model.findById(req.params.id);

    if (!resource) {
      return next(new ErrorResponse('Resource not found', 404));
    }

    // Check if user owns the resource
    const resourceUserId = resource[resourceUserField];
    if (resourceUserId && resourceUserId.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to access this resource', 403));
    }

    req.resource = resource;
    next();
  });
};

// Helper function to determine model from route
function getModelFromRoute(routePath) {
  if (routePath.includes('booking')) return require('../models/Booking');
  if (routePath.includes('service')) return require('../models/Service');
  if (routePath.includes('user')) return require('../models/User');
  
  throw new Error('Cannot determine model from route');
}

// Rate limiting for sensitive operations
exports.sensitiveOperationLimit = (windowMs = 15 * 60 * 1000, max = 5) => {
  const rateLimit = require('express-rate-limit');
  
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many attempts for this operation, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      return req.user ? req.user.id : req.ip;
    }
  });
};

// Middleware to check email verification
exports.requireEmailVerification = (req, res, next) => {
  if (!req.user.isEmailVerified) {
    return next(new ErrorResponse('Please verify your email address to access this feature', 403));
  }
  next();
};

// Middleware to log user activity
exports.logActivity = (action) => {
  return asyncHandler(async (req, res, next) => {
    if (req.user) {
      // Log user activity (you can implement this based on your needs)
      console.log(`User ${req.user.id} performed action: ${action}`);
      
      // Update last activity
      await User.findByIdAndUpdate(req.user.id, {
        lastActivity: new Date()
      });
    }
    next();
  });
};
