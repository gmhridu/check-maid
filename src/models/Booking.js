const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const bookingSchema = new mongoose.Schema({
  bookingNumber: {
    type: String,
    unique: true,
  },
  // Contact Information (from frontend form)
  contactName: {
    type: String,
    required: [true, 'Contact name is required'],
    trim: true
  },
  contactEmail: {
    type: String,
    required: [true, 'Contact email is required'],
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  contactPhone: {
    type: String,
    required: [true, 'Contact phone is required'],
    trim: true
  },
  serviceType: {
    type: String,
    required: [true, 'Please specify service type'],
    enum: {
      values: ['commercial', 'residential', 'airbnb'],
      message: 'Invalid service type'
    }
  },
  packageType: {
    type: String,
    required: false
  },
  // Address as single field (from frontend)
  address: {
    type: String,
    required: [true, 'Please provide property address'],
    trim: true
  },
  // Preferred date and time (from frontend)
  preferredDate: {
    type: Date,
    required: [true, 'Please provide preferred date']
  },
  preferredTime: {
    type: String,
    required: [true, 'Please provide preferred time'],
    enum: ['morning', 'afternoon', 'evening']
  },
  // Notes from frontend
  notes: {
    type: String,
    trim: true
  },
  // Submission timestamp
  submittedAt: {
    type: Date,
    default: Date.now
  },
  // Status for admin tracking
  status: {
    type: String,
    enum: {
      values: [
        'pending',      // Initial status
        'confirmed',    // Booking confirmed
        'completed',    // Service completed
        'cancelled'     // Cancelled
      ],
      message: 'Invalid booking status'
    },
    default: 'pending'
  },
  // Admin notes
  adminNotes: {
    type: String,
    trim: true
  },
  // Email confirmation status
  emailSent: {
    customer: {
      type: Boolean,
      default: false
    },
    admin: {
      type: Boolean,
      default: false
    }
  },
  // SMS confirmation status
  smsSent: {
    customer: {
      type: Boolean,
      default: false
    },
    admin: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
});


// Pre-save middleware to generate booking number
bookingSchema.pre('save', async function(next) {
  if (this.isNew && !this.bookingNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    // Find the last booking number for today
    const lastBooking = await this.constructor
      .findOne({
        bookingNumber: new RegExp(`^BK${year}${month}${day}`)
      })
      .sort({ bookingNumber: -1 });

    let sequence = 1;
    if (lastBooking) {
      const lastSequence = parseInt(lastBooking.bookingNumber.slice(-4));
      sequence = lastSequence + 1;
    }

    this.bookingNumber = `BK${year}${month}${day}${sequence.toString().padStart(4, '0')}`;
  }
  next();
});

// Method to format booking for display
bookingSchema.methods.getDisplayInfo = function() {
  return {
    bookingNumber: this.bookingNumber,
    contactName: this.contactName,
    contactEmail: this.contactEmail,
    contactPhone: this.contactPhone,
    serviceType: this.serviceType,
    packageType: this.packageType,
    address: this.address,
    preferredDate: this.preferredDate,
    preferredTime: this.preferredTime,
    notes: this.notes,
    status: this.status,
    submittedAt: this.submittedAt
  };
};

// Add pagination plugin
bookingSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Booking', bookingSchema);

