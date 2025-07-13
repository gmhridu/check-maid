const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide service name'],
    trim: true,
    maxlength: [100, 'Service name cannot be more than 100 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  category: {
    type: String,
    required: [true, 'Please specify service category'],
    enum: {
      values: ['commercial', 'residential', 'airbnb', 'pressure-washing', 'window-cleaning', 'specialty'],
      message: 'Invalid service category'
    }
  },
  description: {
    short: {
      type: String,
      required: [true, 'Please provide short description'],
      maxlength: [200, 'Short description cannot be more than 200 characters']
    },
    detailed: {
      type: String,
      required: [true, 'Please provide detailed description']
    }
  },
  features: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    included: {
      type: Boolean,
      default: true
    }
  }],
  pricing: {
    basePrice: {
      type: Number,
      required: [true, 'Please provide base price']
    },
    priceType: {
      type: String,
      enum: ['fixed', 'per_hour', 'per_sqft', 'per_room', 'custom'],
      default: 'fixed'
    },
    currency: {
      type: String,
      default: 'USD'
    },
    minimumCharge: Number,
    additionalCharges: [{
      name: String,
      price: Number,
      unit: String,
      description: String
    }]
  },
  packages: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    price: {
      type: Number,
      required: true
    },
    duration: Number, // in minutes
    features: [String],
    popular: {
      type: Boolean,
      default: false
    }
  }],
  availability: {
    daysOfWeek: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    timeSlots: [{
      startTime: String, // Format: "HH:MM"
      endTime: String,   // Format: "HH:MM"
      available: {
        type: Boolean,
        default: true
      }
    }],
    advanceBookingDays: {
      type: Number,
      default: 1
    },
    maxBookingsPerDay: {
      type: Number,
      default: 10
    }
  },
  requirements: {
    minimumNotice: {
      type: Number,
      default: 24 // hours
    },
    estimatedDuration: {
      min: Number, // minutes
      max: Number  // minutes
    },
    staffRequired: {
      type: Number,
      default: 1
    },
    equipmentNeeded: [String],
    specialRequirements: [String]
  },
  serviceArea: {
    zipCodes: [String],
    cities: [String],
    states: [String],
    maxDistance: Number, // in miles from base location
    travelFee: {
      freeWithinMiles: {
        type: Number,
        default: 10
      },
      feePerMile: {
        type: Number,
        default: 2
      }
    }
  },
  media: {
    images: [{
      url: String,
      alt: String,
      isPrimary: {
        type: Boolean,
        default: false
      }
    }],
    videos: [{
      url: String,
      title: String,
      thumbnail: String
    }]
  },
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  },
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  tags: [String],
  faqs: [{
    question: {
      type: String,
      required: true
    },
    answer: {
      type: String,
      required: true
    }
  }],
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
serviceSchema.index({ category: 1 });
serviceSchema.index({ isActive: 1 });
serviceSchema.index({ isFeatured: 1 });
serviceSchema.index({ 'ratings.average': -1 });
serviceSchema.index({ sortOrder: 1 });
serviceSchema.index({ tags: 1 });

// Text search index
serviceSchema.index({
  name: 'text',
  'description.short': 'text',
  'description.detailed': 'text',
  tags: 'text'
});

// Compound indexes
serviceSchema.index({ category: 1, isActive: 1 });
serviceSchema.index({ isActive: 1, isFeatured: 1, sortOrder: 1 });

// Pre-save middleware to generate slug
serviceSchema.pre('save', function(next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// Virtual for bookings count
serviceSchema.virtual('bookingsCount', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'service',
  count: true
});

// Method to update ratings
serviceSchema.methods.updateRatings = async function() {
  const Booking = mongoose.model('Booking');

  const stats = await Booking.aggregate([
    {
      $match: {
        service: this._id,
        'feedback.rating': { $exists: true, $ne: null }
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$feedback.rating' },
        totalRatings: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    this.ratings.average = Math.round(stats[0].averageRating * 10) / 10;
    this.ratings.count = stats[0].totalRatings;
  } else {
    this.ratings.average = 0;
    this.ratings.count = 0;
  }

  await this.save();
};

// Method to check availability for a specific date and time
serviceSchema.methods.isAvailable = function(date, timeSlot) {
  const dayOfWeek = date.toLocaleLowerCase();

  // Check if service is available on this day
  if (!this.availability.daysOfWeek.includes(dayOfWeek)) {
    return false;
  }

  // Check if the time slot is available
  const availableSlot = this.availability.timeSlots.find(slot =>
    slot.startTime <= timeSlot && slot.endTime >= timeSlot && slot.available
  );

  return !!availableSlot;
};

// Method to calculate price based on parameters
serviceSchema.methods.calculatePrice = function(params = {}) {
  let price = this.pricing.basePrice;

  switch (this.pricing.priceType) {
    case 'per_hour':
      price *= (params.hours || 1);
      break;
    case 'per_sqft':
      price *= (params.squareFootage || 1);
      break;
    case 'per_room':
      price *= (params.rooms || 1);
      break;
  }

  // Add additional charges
  if (params.additionalServices && this.pricing.additionalCharges) {
    params.additionalServices.forEach(serviceId => {
      const charge = this.pricing.additionalCharges.find(c => c._id.toString() === serviceId);
      if (charge) {
        price += charge.price;
      }
    });
  }

  // Apply minimum charge if applicable
  if (this.pricing.minimumCharge && price < this.pricing.minimumCharge) {
    price = this.pricing.minimumCharge;
  }

  return price;
};

// Add pagination plugin
serviceSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Service', serviceSchema);

