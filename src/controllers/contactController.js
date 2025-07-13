const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const Contact = require('../models/Contact');
const { sendSMS, sendAdminSMS, formatPhoneNumber, validatePhoneNumber } = require('../utils/sms');

// @desc    Submit contact form
// @route   POST /api/v1/contact
// @access  Public
exports.submitContactForm = asyncHandler(async (req, res, next) => {
  const {
    name,
    email,
    phone,
    concernType,
    subject,
    message,
    preferredContact,
    serviceDate,
    serviceLocation,
    referenceNumber
  } = req.body;

  // Validate required fields
  if (!name || !email || !phone || !concernType || !subject || !message) {
    return next(new ErrorResponse('Please provide all required fields', 400));
  }

  // Validate phone number format
  if (!validatePhoneNumber(phone)) {
    return next(new ErrorResponse('Please provide a valid phone number', 400));
  }

  // Format phone number for consistency
  const formattedPhone = formatPhoneNumber(phone);

  // Validate service date if provided
  if (serviceDate) {
    const date = new Date(serviceDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Allow past dates for service issues/complaints
    const maxPastDate = new Date();
    maxPastDate.setFullYear(maxPastDate.getFullYear() - 1);
    
    if (date < maxPastDate) {
      return next(new ErrorResponse('Service date cannot be more than 1 year in the past', 400));
    }
  }

  // Create contact submission
  const contactData = {
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone: formattedPhone,
    concernType,
    subject: subject.trim(),
    message: message.trim(),
    preferredContact: preferredContact || 'email',
    serviceDate: serviceDate ? new Date(serviceDate) : undefined,
    serviceLocation: serviceLocation ? serviceLocation.trim() : undefined,
    referenceNumber: referenceNumber ? referenceNumber.trim() : undefined
  };

  const contact = await Contact.create(contactData);

  // Send SMS notifications
  let smsResults = {
    admin: false,
    customer: false
  };

  // Send SMS to admin
  try {
    const adminSmsResult = await sendAdminSMS({
      template: 'contactForm',
      data: {
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        concernType: contact.concernType,
        concernTypeLabel: contact.concernTypeLabel,
        subject: contact.subject,
        message: contact.message,
        preferredContact: contact.preferredContact,
        serviceDate: contact.serviceDate ? contact.serviceDate.toLocaleDateString() : null,
        serviceLocation: contact.serviceLocation,
        referenceNumber: contact.referenceNumber,
        contactNumber: contact.contactNumber,
        priority: contact.priority
      }
    });

    if (adminSmsResult.success) {
      smsResults.admin = true;
      console.log('Admin SMS notification sent successfully for contact:', contact.contactNumber);
    } else {
      console.error('Failed to send admin SMS for contact:', contact.contactNumber, adminSmsResult.message);
    }
  } catch (smsError) {
    console.error('Error sending admin SMS for contact:', contact.contactNumber, smsError);
  }

  // Send confirmation SMS to customer (only if they prefer phone contact or it's urgent)
  const shouldSendCustomerSMS = contact.preferredContact === 'phone' || 
                                contact.priority === 'urgent' || 
                                contact.concernType === 'complaint';

  if (shouldSendCustomerSMS) {
    try {
      const customerSmsResult = await sendSMS({
        to: contact.phone,
        template: 'contactConfirmation',
        data: {
          name: contact.name,
          concernTypeLabel: contact.concernTypeLabel,
          contactNumber: contact.contactNumber,
          subject: contact.subject,
          preferredContact: contact.preferredContact
        }
      });

      if (customerSmsResult.success) {
        smsResults.customer = true;
        console.log('Customer SMS confirmation sent successfully for contact:', contact.contactNumber);
      } else {
        console.error('Failed to send customer SMS for contact:', contact.contactNumber, customerSmsResult.message);
      }
    } catch (smsError) {
      console.error('Error sending customer SMS for contact:', contact.contactNumber, smsError);
    }
  }

  // Update SMS status
  contact.smsSent.admin = smsResults.admin;
  contact.smsSent.customer = smsResults.customer;
  await contact.save();

  res.status(201).json({
    success: true,
    data: contact.getDisplayInfo(),
    message: 'Contact form submitted successfully! We will respond within 24 hours.',
    smsNotifications: {
      adminNotified: smsResults.admin,
      customerConfirmed: smsResults.customer
    }
  });
});

// @desc    Get all contact submissions (Admin only)
// @route   GET /api/v1/contact
// @access  Private (Admin/Staff)
exports.getContactSubmissions = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;

  // Build query
  let query = {};

  // Filter by status
  if (req.query.status) {
    query.status = req.query.status;
  }

  // Filter by concern type
  if (req.query.concernType) {
    query.concernType = req.query.concernType;
  }

  // Filter by priority
  if (req.query.priority) {
    query.priority = req.query.priority;
  }

  // Date range filter
  if (req.query.startDate || req.query.endDate) {
    query.submittedAt = {};
    if (req.query.startDate) {
      query.submittedAt.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      query.submittedAt.$lte = new Date(req.query.endDate);
    }
  }

  // Search by name, email, or contact number
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    query.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { contactNumber: searchRegex },
      { subject: searchRegex }
    ];
  }

  const contacts = await Contact.find(query)
    .populate('assignedTo', 'name email')
    .sort({ submittedAt: -1 })
    .limit(limit)
    .skip(startIndex);

  const total = await Contact.countDocuments(query);

  // Pagination result
  const pagination = {};

  if (startIndex + limit < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  res.status(200).json({
    success: true,
    count: contacts.length,
    total,
    pagination,
    data: contacts
  });
});

// @desc    Get single contact submission
// @route   GET /api/v1/contact/:id
// @access  Private (Admin/Staff)
exports.getContactSubmission = asyncHandler(async (req, res, next) => {
  const contact = await Contact.findById(req.params.id)
    .populate('assignedTo', 'name email phone')
    .populate('notes.addedBy', 'name email');

  if (!contact) {
    return next(new ErrorResponse('Contact submission not found', 404));
  }

  res.status(200).json({
    success: true,
    data: contact
  });
});

// @desc    Update contact submission status
// @route   PATCH /api/v1/contact/:id
// @access  Private (Admin/Staff)
exports.updateContactSubmission = asyncHandler(async (req, res, next) => {
  const { status, assignedTo, priority, notes } = req.body;

  const contact = await Contact.findById(req.params.id);

  if (!contact) {
    return next(new ErrorResponse('Contact submission not found', 404));
  }

  // Update fields if provided
  if (status) contact.status = status;
  if (assignedTo) contact.assignedTo = assignedTo;
  if (priority) contact.priority = priority;

  // Add note if provided
  if (notes) {
    contact.notes.push({
      content: notes,
      addedBy: req.user.id
    });
  }

  // Set responded date if status is changed to in-progress or resolved
  if (status && ['in-progress', 'resolved'].includes(status) && !contact.respondedAt) {
    contact.respondedAt = new Date();
  }

  await contact.save();

  // Populate the updated contact
  await contact.populate('assignedTo', 'name email phone');
  await contact.populate('notes.addedBy', 'name email');

  res.status(200).json({
    success: true,
    data: contact,
    message: 'Contact submission updated successfully'
  });
});

// @desc    Delete contact submission
// @route   DELETE /api/v1/contact/:id
// @access  Private (Admin only)
exports.deleteContactSubmission = asyncHandler(async (req, res, next) => {
  const contact = await Contact.findById(req.params.id);

  if (!contact) {
    return next(new ErrorResponse('Contact submission not found', 404));
  }

  await contact.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Contact submission deleted successfully'
  });
});

// @desc    Get contact statistics
// @route   GET /api/v1/contact/stats
// @access  Private (Admin/Staff)
exports.getContactStats = asyncHandler(async (req, res, next) => {
  const stats = await Contact.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        newCount: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
        inProgressCount: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
        resolvedCount: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        closedCount: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
        urgentCount: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } },
        highCount: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
        complaintCount: { $sum: { $cond: [{ $eq: ['$concernType', 'complaint'] }, 1, 0] } },
        serviceIssueCount: { $sum: { $cond: [{ $eq: ['$concernType', 'service-issue'] }, 1, 0] } }
      }
    }
  ]);

  const result = stats[0] || {
    total: 0,
    newCount: 0,
    inProgressCount: 0,
    resolvedCount: 0,
    closedCount: 0,
    urgentCount: 0,
    highCount: 0,
    complaintCount: 0,
    serviceIssueCount: 0
  };

  res.status(200).json({
    success: true,
    data: result
  });
});
