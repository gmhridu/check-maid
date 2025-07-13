const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ],
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Please provide your phone number'],
    trim: true,
    validate: {
      validator: function(v) {
        // Basic US phone number validation
        const cleaned = v.replace(/\D/g, '');
        return cleaned.length === 10 || (cleaned.length === 11 && cleaned.startsWith('1'));
      },
      message: 'Please provide a valid phone number'
    }
  },
  concernType: {
    type: String,
    required: [true, 'Please select a concern type'],
    enum: {
      values: ['complaint', 'feedback', 'service-issue', 'general'],
      message: 'Please select a valid concern type'
    }
  },
  subject: {
    type: String,
    required: [true, 'Please provide a subject'],
    trim: true,
    maxlength: [200, 'Subject cannot be more than 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Please provide a message'],
    trim: true,
    maxlength: [2000, 'Message cannot be more than 2000 characters']
  },
  preferredContact: {
    type: String,
    required: [true, 'Please select preferred contact method'],
    enum: {
      values: ['email', 'phone'],
      message: 'Please select a valid contact method'
    },
    default: 'email'
  },
  serviceDate: {
    type: Date,
    validate: {
      validator: function(v) {
        // Allow null/undefined for optional field
        if (!v) return true;
        // If provided, should not be in the future beyond reasonable limit
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() + 1);
        return v <= maxDate;
      },
      message: 'Service date cannot be more than 1 year in the future'
    }
  },
  serviceLocation: {
    type: String,
    trim: true,
    maxlength: [300, 'Service location cannot be more than 300 characters']
  },
  referenceNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'Reference number cannot be more than 50 characters']
  },
  status: {
    type: String,
    enum: {
      values: ['new', 'in-progress', 'resolved', 'closed'],
      message: 'Please select a valid status'
    },
    default: 'new'
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high', 'urgent'],
      message: 'Please select a valid priority'
    },
    default: function() {
      // Set priority based on concern type
      switch(this.concernType) {
        case 'complaint':
          return 'high';
        case 'service-issue':
          return 'high';
        case 'feedback':
          return 'medium';
        case 'general':
          return 'low';
        default:
          return 'medium';
      }
    }
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  respondedAt: {
    type: Date
  },
  assignedTo: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  smsSent: {
    admin: {
      type: Boolean,
      default: false
    },
    customer: {
      type: Boolean,
      default: false
    }
  },
  emailSent: {
    admin: {
      type: Boolean,
      default: false
    },
    customer: {
      type: Boolean,
      default: false
    }
  },
  notes: [{
    content: {
      type: String,
      required: true,
      trim: true
    },
    addedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create contact number (similar to booking number)
contactSchema.pre('save', async function(next) {
  if (!this.isNew) {
    return next();
  }

  try {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Find the last contact created today
    const lastContact = await this.constructor.findOne({
      submittedAt: {
        $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      }
    }).sort({ submittedAt: -1 });

    let sequence = 1;
    if (lastContact && lastContact.contactNumber) {
      const lastSequence = parseInt(lastContact.contactNumber.split('-').pop());
      sequence = lastSequence + 1;
    }

    this.contactNumber = `CT-${dateStr}-${sequence.toString().padStart(3, '0')}`;
    next();
  } catch (error) {
    next(error);
  }
});

// Add contactNumber field
contactSchema.add({
  contactNumber: {
    type: String,
    unique: true
  }
});

// Virtual for formatted submission date
contactSchema.virtual('formattedSubmittedAt').get(function() {
  return this.submittedAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Virtual for concern type label
contactSchema.virtual('concernTypeLabel').get(function() {
  const labels = {
    'complaint': 'Complaint',
    'feedback': 'Feedback',
    'service-issue': 'Service Issue',
    'general': 'General Inquiry'
  };
  return labels[this.concernType] || this.concernType;
});

// Method to get display info (safe for public API responses)
contactSchema.methods.getDisplayInfo = function() {
  return {
    id: this._id,
    contactNumber: this.contactNumber,
    name: this.name,
    email: this.email,
    phone: this.phone,
    concernType: this.concernType,
    concernTypeLabel: this.concernTypeLabel,
    subject: this.subject,
    message: this.message,
    preferredContact: this.preferredContact,
    serviceDate: this.serviceDate,
    serviceLocation: this.serviceLocation,
    referenceNumber: this.referenceNumber,
    status: this.status,
    priority: this.priority,
    submittedAt: this.submittedAt,
    formattedSubmittedAt: this.formattedSubmittedAt
  };
};

// Index for efficient queries
contactSchema.index({ submittedAt: -1 });
contactSchema.index({ status: 1 });
contactSchema.index({ priority: 1 });
contactSchema.index({ concernType: 1 });
contactSchema.index({ contactNumber: 1 });

module.exports = mongoose.model('Contact', contactSchema);
