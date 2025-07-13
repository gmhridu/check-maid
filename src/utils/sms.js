const twilio = require('twilio');

// Initialize Twilio client
const createTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    console.warn('Twilio credentials not configured. SMS notifications will be disabled.');
    return null;
  }

  return twilio(accountSid, authToken);
};

// SMS templates
const smsTemplates = {
  newBooking: (data) => {
    return `🧹 NEW BOOKING ALERT!

Service: ${data.serviceType.toUpperCase()}
Customer: ${data.customerName}
Phone: ${data.customerPhone}
Date: ${data.preferredDate}
Time: ${data.preferredTime}
Address: ${data.address}
Booking #: ${data.bookingNumber}

${data.notes ? `Notes: ${data.notes}` : ''}

Please check admin panel for full details.`;
  },

  bookingConfirmed: (data) => {
    return `✅ Booking Confirmed!

Hi ${data.customerName}, your ${data.serviceType} cleaning service has been confirmed for ${data.preferredTime} at ${data.preferredDate}.

Booking #: ${data.bookingNumber}
Address: ${data.address}

We'll contact you if any changes are needed. Thank you!`;
  },

  bookingReminder: (data) => {
    return `⏰ Reminder: Your ${data.serviceType} cleaning service is scheduled for tomorrow (${data.scheduledDate}) at ${data.scheduledTime}.

Address: ${data.address}
Booking #: ${data.bookingNumber}

Please ensure someone is available. Contact us if you need to reschedule.`;
  },

  staffAssignment: (data) => {
    return `📋 NEW JOB ASSIGNMENT

Service: ${data.serviceType}
Date: ${data.scheduledDate}
Time: ${data.scheduledTime}
Address: ${data.address}
Customer: ${data.customerName} (${data.customerPhone})
Booking #: ${data.bookingNumber}

${data.notes ? `Special Notes: ${data.notes}` : ''}

Check your schedule and confirm availability.`;
  },

  contactForm: (data) => {
    return `📞 NEW CONTACT FORM SUBMISSION

Type: ${data.concernTypeLabel}
Name: ${data.name}
Phone: ${data.phone}
Email: ${data.email}
Contact #: ${data.contactNumber}

Subject: ${data.subject}

${data.serviceDate ? `Service Date: ${data.serviceDate}` : ''}
${data.serviceLocation ? `Service Location: ${data.serviceLocation}` : ''}
${data.referenceNumber ? `Reference #: ${data.referenceNumber}` : ''}

Message: ${data.message}

Preferred Contact: ${data.preferredContact}
Priority: ${data.priority.toUpperCase()}

Please respond promptly.`;
  },

  contactConfirmation: (data) => {
    return `✅ Contact Form Received

Hi ${data.name}, we've received your ${data.concernTypeLabel.toLowerCase()} and will respond within 24 hours.

Contact #: ${data.contactNumber}
Subject: ${data.subject}

We'll contact you via ${data.preferredContact === 'phone' ? 'phone' : 'email'} as requested.

Thank you for contacting us!`;
  }
};

// Send SMS function
exports.sendSMS = async (options) => {
  try {
    // Check if SMS notifications are enabled
    if (process.env.SMS_NOTIFICATIONS_ENABLED !== 'true') {
      console.log('SMS notifications are disabled');
      return { success: false, message: 'SMS notifications disabled' };
    }

    const client = createTwilioClient();
    if (!client) {
      return { success: false, message: 'Twilio client not configured' };
    }

    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!fromNumber) {
      return { success: false, message: 'Twilio phone number not configured' };
    }

    let messageBody;

    // Check if using a template
    if (options.template && smsTemplates[options.template]) {
      messageBody = smsTemplates[options.template](options.data);
    } else {
      messageBody = options.message;
    }

    // Ensure message is not too long (SMS limit is 1600 characters)
    if (messageBody.length > 3600) {
      messageBody = messageBody.substring(0, 1597) + '...';
    }

    const message = await client.messages.create({
      body: messageBody,
      from: fromNumber,
      to: options.to
    });

    console.log(`SMS sent successfully to ${options.to}. SID: ${message.sid}`);

    return {
      success: true,
      messageId: message.sid,
      to: options.to,
      message: 'SMS sent successfully'
    };

  } catch (error) {
    console.error('Failed to send SMS:', error);

    return {
      success: false,
      error: error.message,
      message: 'Failed to send SMS'
    };
  }
};

// Send SMS to multiple recipients
exports.sendBulkSMS = async (recipients, options) => {
  const results = [];

  for (const recipient of recipients) {
    const smsOptions = {
      ...options,
      to: recipient.phone,
      data: {
        ...options.data,
        ...recipient.data
      }
    };

    const result = await exports.sendSMS(smsOptions);
    results.push({
      phone: recipient.phone,
      ...result
    });

    // Add small delay between messages to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
};

// Get staff phone numbers for specific service types
exports.getStaffPhoneNumbers = async (serviceType) => {
  try {
    const User = require('../models/User');

    // Get staff members who handle the specific service type
    const staff = await User.find({
      role: 'staff',
      isActive: true,
      phone: { $exists: true, $ne: '' },
      'preferences.serviceTypes': serviceType
    }).select('name phone preferences.serviceTypes');

    return staff.map(member => ({
      name: member.name,
      phone: member.phone,
      serviceTypes: member.preferences.serviceTypes
    }));
  } catch (error) {
    console.error('Error getting staff phone numbers:', error);
    return [];
  }
};

// Send notification to admin
exports.sendAdminSMS = async (options) => {
  const adminPhone = process.env.ADMIN_PHONE_NUMBER;

  if (!adminPhone) {
    console.warn('Admin phone number not configured');
    return { success: false, message: 'Admin phone number not configured' };
  }

  return await exports.sendSMS({
    ...options,
    to: adminPhone
  });
};

// Validate phone number format
exports.validatePhoneNumber = (phone) => {
  // Basic validation for US phone numbers
  // Remove all non-digit characters first
  const cleaned = phone.replace(/\D/g, '');

  // Check for valid US phone number patterns
  if (cleaned.length === 10) {
    // 10 digits: 2345678901
    return /^[2-9]\d{2}[2-9]\d{2}\d{4}$/.test(cleaned);
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    // 11 digits starting with 1: 12345678901
    return /^1[2-9]\d{2}[2-9]\d{2}\d{4}$/.test(cleaned);
  }

  return false;
};

// Format phone number for Twilio (ensure it starts with +1)
exports.formatPhoneNumber = (phone) => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Add +1 if it's a 10-digit US number
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }

  // Add + if it starts with 1 and is 11 digits
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }

  // Return as is if already formatted
  if (phone.startsWith('+')) {
    return phone;
  }

  return `+${cleaned}`;
};
