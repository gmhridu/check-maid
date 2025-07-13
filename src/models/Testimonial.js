const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be a whole number'
    }
  },
  text: {
    type: String,
    required: [true, 'Testimonial text is required'],
    trim: true,
    minlength: [1, 'Testimonial must be at least 10 characters'],
    maxlength: [1000, 'Testimonial cannot exceed 1000 characters']
  },
  location: {
    type: String,
    required: [true, 'Customer location is required'],
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  image: {
    type: String,
    required: [true, 'Customer image is required'],
    validate: {
      validator: function(v) {
        // More flexible URL validation that allows query parameters
        return /^https?:\/\/.+/i.test(v) && (
          /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(v) || // Direct image URLs with optional query params
          /unsplash\.com/i.test(v) || // Unsplash URLs
          /images\.unsplash\.com/i.test(v) || // Unsplash image URLs
          /gravatar\.com/i.test(v) || // Gravatar URLs
          /cloudinary\.com/i.test(v) || // Cloudinary URLs
          /amazonaws\.com/i.test(v) // AWS S3 URLs
        );
      },
      message: 'Please provide a valid image URL'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  serviceType: {
    type: String,
    enum: ['commercial', 'residential', 'airbnb', 'pressure-washing', 'window-cleaning', 'general'],
    default: 'general'
  },
  customerEmail: {
    type: String,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  customerPhone: {
    type: String,
    trim: true
  },
  source: {
    type: String,
    enum: ['website', 'google', 'facebook', 'yelp', 'manual'],
    default: 'manual'
  },
  externalId: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
testimonialSchema.index({ isActive: 1 });
testimonialSchema.index({ isApproved: 1 });
testimonialSchema.index({ isFeatured: 1 });
testimonialSchema.index({ rating: -1 });
testimonialSchema.index({ sortOrder: 1 });
testimonialSchema.index({ serviceType: 1 });
testimonialSchema.index({ createdAt: -1 });

// Text search index
testimonialSchema.index({
  name: 'text',
  text: 'text',
  location: 'text'
});

// Virtual for display name
testimonialSchema.virtual('displayName').get(function() {
  return this.name || 'Anonymous Customer';
});

// Pre-save middleware
testimonialSchema.pre('save', function(next) {
  // Auto-approve testimonials with 4+ stars from trusted sources
  if (this.rating >= 4 && ['google', 'facebook', 'yelp'].includes(this.source)) {
    this.isApproved = true;
  }
  next();
});

// Static methods
testimonialSchema.statics.getApprovedTestimonials = function(limit = 10) {
  return this.find({
    isActive: true,
    isApproved: true
  })
  .sort({ isFeatured: -1, sortOrder: 1, createdAt: -1 })
  .limit(limit)
  .select('-createdBy -updatedBy -customerEmail -customerPhone -externalId');
};

testimonialSchema.statics.getFeaturedTestimonials = function(limit = 5) {
  return this.find({
    isActive: true,
    isApproved: true,
    isFeatured: true
  })
  .sort({ sortOrder: 1, createdAt: -1 })
  .limit(limit)
  .select('-createdBy -updatedBy -customerEmail -customerPhone -externalId');
};

testimonialSchema.statics.getAverageRating = function() {
  return this.aggregate([
    { $match: { isActive: true, isApproved: true } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalCount: { $sum: 1 }
      }
    }
  ]);
};

module.exports = mongoose.model('Testimonial', testimonialSchema);
