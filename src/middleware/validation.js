const { body, validationResult } = require('express-validator');
const ErrorResponse = require('../utils/errorResponse');

// Helper function to handle validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));

    return next(new ErrorResponse('Validation failed', 400, errorMessages));
  }
  next();
};

// Booking validation (updated for frontend form structure)
exports.validateBooking = [
  body('contactName')
    .notEmpty()
    .withMessage('Contact name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Contact name must be between 2 and 50 characters')
    .trim(),

  body('contactEmail')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('contactPhone')
    .notEmpty()
    .withMessage('Contact phone is required')
    .isLength({ min: 10, max: 20 })
    .withMessage('Please provide a valid phone number')
    .trim(),

  body('serviceType')
    .isIn(['commercial', 'residential', 'airbnb', 'pressure-washing', 'window-cleaning', 'other'])
    .withMessage('Invalid service type'),

  body('packageType')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Package type cannot exceed 100 characters'),

  body('address')
    .notEmpty()
    .withMessage('Property address is required')
    .isLength({ min: 10, max: 200 })
    .withMessage('Address must be between 10 and 200 characters')
    .trim(),

  body('preferredDate')
    .isISO8601()
    .withMessage('Please provide a valid date')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Reset time to start of day
      if (date < now) {
        throw new Error('Preferred date cannot be in the past');
      }
      return true;
    }),

  body('preferredTime')
    .isIn(['morning', 'afternoon', 'evening'])
    .withMessage('Invalid preferred time. Must be morning, afternoon, or evening'),

  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
    .trim(),

  handleValidationErrors
];

// Booking update validation
exports.validateBookingUpdate = [
  body('status')
    .optional()
    .isIn(['pending', 'confirmed', 'assigned', 'in-progress', 'completed', 'cancelled', 'no-show', 'rescheduled'])
    .withMessage('Invalid booking status'),

  body('scheduledDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date'),

  body('scheduledTime')
    .optional()
    .isIn(['morning', 'afternoon', 'evening', 'flexible'])
    .withMessage('Invalid scheduled time'),

  body('pricing.totalAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total amount must be a positive number'),

  handleValidationErrors
];

// User registration validation
exports.validateUserRegistration = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),

  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('phone')
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),

  handleValidationErrors
];

// User login validation
exports.validateUserLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors
];

// Service validation
exports.validateService = [
  body('name')
    .notEmpty()
    .withMessage('Service name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Service name must be between 3 and 100 characters'),

  body('category')
    .isIn(['commercial', 'residential', 'airbnb', 'pressure-washing', 'window-cleaning', 'specialty'])
    .withMessage('Invalid service category'),

  body('description.short')
    .notEmpty()
    .withMessage('Short description is required')
    .isLength({ min: 10, max: 200 })
    .withMessage('Short description must be between 10 and 200 characters'),

  body('description.detailed')
    .notEmpty()
    .withMessage('Detailed description is required')
    .isLength({ min: 50 })
    .withMessage('Detailed description must be at least 50 characters'),

  body('pricing.basePrice')
    .isFloat({ min: 0 })
    .withMessage('Base price must be a positive number'),

  body('pricing.priceType')
    .isIn(['fixed', 'per_hour', 'per_sqft', 'per_room', 'custom'])
    .withMessage('Invalid price type'),

  handleValidationErrors
];

// Password reset validation
exports.validatePasswordReset = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  handleValidationErrors
];

// New password validation
exports.validateNewPassword = [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),

  handleValidationErrors
];

// Profile update validation
exports.validateProfileUpdate = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),

  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),

  body('address.street')
    .optional()
    .isLength({ min: 5, max: 200 })
    .withMessage('Street address must be between 5 and 200 characters'),

  body('address.city')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters'),

  body('address.state')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('State must be between 2 and 50 characters'),

  body('address.zipCode')
    .optional()
    .matches(/^\d{5}(-\d{4})?$/)
    .withMessage('Please provide a valid zip code'),

  handleValidationErrors
];

// Feedback validation
exports.validateFeedback = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),

  body('comment')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Comment cannot exceed 1000 characters'),

  handleValidationErrors
];

// Contact form validation
exports.validateContactSubmission = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .trim(),

  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),

  body('concernType')
    .isIn(['complaint', 'feedback', 'service-issue', 'general'])
    .withMessage('Please select a valid concern type'),

  body('subject')
    .notEmpty()
    .withMessage('Subject is required')
    .isLength({ min: 5, max: 200 })
    .withMessage('Subject must be between 5 and 200 characters')
    .trim(),

  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters')
    .trim(),

  body('preferredContact')
    .optional()
    .isIn(['email', 'phone'])
    .withMessage('Preferred contact method must be email or phone'),

  body('serviceDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid service date')
    .custom((value) => {
      if (value) {
        const date = new Date(value);
        const maxPastDate = new Date();
        maxPastDate.setFullYear(maxPastDate.getFullYear() - 1);
        const maxFutureDate = new Date();
        maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 1);

        if (date < maxPastDate || date > maxFutureDate) {
          throw new Error('Service date must be within the last year or next year');
        }
      }
      return true;
    }),

  body('serviceLocation')
    .optional()
    .isLength({ max: 300 })
    .withMessage('Service location cannot exceed 300 characters')
    .trim(),

  body('referenceNumber')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Reference number cannot exceed 50 characters')
    .trim(),

  handleValidationErrors
];
