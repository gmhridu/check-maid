const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Email templates
const emailTemplates = {
  bookingConfirmation: (data) => ({
    subject: 'Booking Request Received - Cleaning Service',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Booking Request Received</h2>
        <p>Dear ${data.customerName},</p>
        <p>Thank you for your interest in our cleaning services! We have received your booking request and will contact you soon to confirm the details.</p>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Your Booking Request:</h3>
          <p><strong>Booking Number:</strong> ${data.bookingNumber}</p>
          <p><strong>Service Type:</strong> ${data.serviceType}</p>
          ${data.packageType ? `<p><strong>Package:</strong> ${data.packageType}</p>` : ''}
          <p><strong>Preferred Date:</strong> ${data.preferredDate}</p>
          <p><strong>Preferred Time:</strong> ${data.preferredTime}</p>
          <p><strong>Address:</strong> ${data.address}</p>
          ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
        </div>

        <p><strong>What happens next?</strong></p>
        <ul>
          <li>We will review your request within 24 hours</li>
          <li>Our team will contact you to confirm the appointment details</li>
          <li>We'll provide you with a detailed quote for the service</li>
          <li>Once confirmed, we'll send you a final confirmation with all details</li>
        </ul>

        <p>If you have any questions or need to make changes, please contact us at:</p>
        <p>📞 Phone: ${process.env.ADMIN_PHONE}<br>
        📧 Email: ${process.env.ADMIN_EMAIL}</p>

        <p>Thank you for choosing our cleaning service!</p>
        <p>Best regards,<br>Cleaning Service Team</p>
      </div>
    `
  }),

  newBookingNotification: (data) => ({
    subject: `New Booking Request - ${data.bookingNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">New Booking Request</h2>
        <p>A new booking request has been submitted and requires your attention.</p>

        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <h3 style="margin-top: 0; color: #dc2626;">Booking Details:</h3>
          <p><strong>Booking Number:</strong> ${data.bookingNumber}</p>
          <p><strong>Submitted:</strong> ${data.submittedAt}</p>
        </div>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Customer Information:</h3>
          <p><strong>Name:</strong> ${data.customerName}</p>
          <p><strong>Email:</strong> ${data.customerEmail}</p>
          <p><strong>Phone:</strong> ${data.customerPhone}</p>
        </div>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Service Details:</h3>
          <p><strong>Service Type:</strong> ${data.serviceType}</p>
          ${data.packageType ? `<p><strong>Package:</strong> ${data.packageType}</p>` : ''}
          <p><strong>Preferred Date:</strong> ${data.preferredDate}</p>
          <p><strong>Preferred Time:</strong> ${data.preferredTime}</p>
          <p><strong>Address:</strong> ${data.address}</p>
          ${data.notes ? `<p><strong>Customer Notes:</strong> ${data.notes}</p>` : ''}
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <p><strong>Action Required:</strong> Please contact the customer within 24 hours to confirm the booking details.</p>
        </div>

        <p>Best regards,<br>Cleaning Service System</p>
      </div>
    `
  }),

  bookingReminder: (data) => ({
    subject: 'Booking Reminder - Tomorrow',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Booking Reminder</h2>
        <p>Dear ${data.customerName},</p>
        <p>This is a friendly reminder that you have a cleaning service scheduled for tomorrow.</p>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Booking Details:</h3>
          <p><strong>Booking Number:</strong> ${data.bookingNumber}</p>
          <p><strong>Service Type:</strong> ${data.serviceType}</p>
          <p><strong>Date:</strong> ${data.scheduledDate}</p>
          <p><strong>Time:</strong> ${data.scheduledTime}</p>
          <p><strong>Address:</strong> ${data.address}</p>
        </div>

        <p>Please ensure someone is available at the property during the scheduled time.</p>
        <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>

        <p>Best regards,<br>Cleaning Service Team</p>
      </div>
    `
  }),

  passwordReset: (data) => ({
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Password Reset Request</h2>
        <p>Dear ${data.name},</p>
        <p>You have requested to reset your password. Click the button below to reset it:</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.resetUrl}"
             style="background-color: #10b981; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>

        <p>This link will expire in 1 hour for security reasons.</p>
        <p>If you didn't request this password reset, please ignore this email.</p>

        <p>Best regards,<br>Cleaning Service Team</p>
      </div>
    `
  }),

  emailVerification: (data) => ({
    subject: 'Verify Your Email Address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Welcome to Cleaning Service!</h2>
        <p>Dear ${data.name},</p>
        <p>Thank you for registering with us. Please verify your email address by clicking the button below:</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.verificationUrl}"
             style="background-color: #10b981; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify Email
          </a>
        </div>

        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create this account, please ignore this email.</p>

        <p>Best regards,<br>Cleaning Service Team</p>
      </div>
    `
  }),

  bookingStatusUpdate: (data) => ({
    subject: `Booking ${data.status} - ${data.bookingNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Booking Status Update</h2>
        <p>Dear ${data.customerName},</p>
        <p>Your booking status has been updated.</p>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Booking Details:</h3>
          <p><strong>Booking Number:</strong> ${data.bookingNumber}</p>
          <p><strong>New Status:</strong> <span style="color: #10b981; font-weight: bold;">${data.status}</span></p>
          <p><strong>Service Type:</strong> ${data.serviceType}</p>
          <p><strong>Scheduled Date:</strong> ${data.scheduledDate}</p>
        </div>

        ${data.message ? `<p><strong>Message:</strong> ${data.message}</p>` : ''}

        <p>If you have any questions, please don't hesitate to contact us.</p>

        <p>Best regards,<br>Cleaning Service Team</p>
      </div>
    `
  })
};

// Send email function
exports.sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    let emailContent;

    // Check if using a template
    if (options.template && emailTemplates[options.template]) {
      emailContent = emailTemplates[options.template](options.data);
    } else {
      emailContent = {
        subject: options.subject,
        html: options.html || options.text
      };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: options.to,
      subject: emailContent.subject,
      html: emailContent.html
    };

    // Add CC and BCC if provided
    if (options.cc) mailOptions.cc = options.cc;
    if (options.bcc) mailOptions.bcc = options.bcc;

    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent successfully:', info.messageId);
    return info;

  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error('Email could not be sent');
  }
};

// Send bulk emails
exports.sendBulkEmail = async (recipients, options) => {
  try {
    const transporter = createTransporter();
    const promises = [];

    for (const recipient of recipients) {
      let emailContent;

      if (options.template && emailTemplates[options.template]) {
        emailContent = emailTemplates[options.template]({
          ...options.data,
          ...recipient.data
        });
      } else {
        emailContent = {
          subject: options.subject,
          html: options.html || options.text
        };
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: recipient.email,
        subject: emailContent.subject,
        html: emailContent.html
      };

      promises.push(transporter.sendMail(mailOptions));
    }

    const results = await Promise.allSettled(promises);

    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;

    console.log(`Bulk email results: ${successful} successful, ${failed} failed`);

    return { successful, failed, results };

  } catch (error) {
    console.error('Bulk email sending failed:', error);
    throw new Error('Bulk emails could not be sent');
  }
};

// Verify email configuration
exports.verifyEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email configuration is valid');
    return true;
  } catch (error) {
    console.error('❌ Email configuration is invalid:', error.message);
    return false;
  }
};
