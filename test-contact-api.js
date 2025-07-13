require('dotenv').config();
const mongoose = require('mongoose');

// Test the contact API functionality
const testContactAPI = async () => {
  console.log('🧪 Testing Contact API Functionality...\n');

  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Test Contact Model
    const Contact = require('./src/models/Contact');
    
    // Create a test contact
    const testContactData = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '(555) 123-4567',
      concernType: 'general',
      subject: 'Test Contact Submission',
      message: 'This is a test message to verify the contact form functionality.',
      preferredContact: 'email',
      serviceDate: new Date('2024-01-15'),
      serviceLocation: '123 Test Street, Test City, TC 12345',
      referenceNumber: 'TEST-001'
    };

    console.log('📝 Creating test contact...');
    const contact = await Contact.create(testContactData);
    console.log('✅ Test contact created successfully');
    console.log(`   Contact Number: ${contact.contactNumber}`);
    console.log(`   Priority: ${contact.priority}`);
    console.log(`   Status: ${contact.status}`);

    // Test SMS functionality (if configured)
    console.log('\n📱 Testing SMS functionality...');
    const { sendAdminSMS } = require('./src/utils/sms');
    
    if (process.env.SMS_NOTIFICATIONS_ENABLED === 'true' && 
        process.env.TWILIO_ACCOUNT_SID && 
        process.env.TWILIO_AUTH_TOKEN && 
        process.env.ADMIN_PHONE_NUMBER) {
      
      console.log('🚀 Sending test SMS notification...');
      const smsResult = await sendAdminSMS({
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

      if (smsResult.success) {
        console.log('✅ SMS notification sent successfully');
        console.log(`   Message ID: ${smsResult.messageId}`);
      } else {
        console.log('❌ SMS notification failed');
        console.log(`   Error: ${smsResult.message}`);
      }
    } else {
      console.log('⚠️  SMS notifications not configured or disabled');
      console.log('   Configure Twilio credentials and enable SMS_NOTIFICATIONS_ENABLED to test SMS');
    }

    // Test validation
    console.log('\n🔍 Testing validation...');
    try {
      await Contact.create({
        name: 'A', // Too short
        email: 'invalid-email',
        phone: '123', // Invalid phone
        concernType: 'invalid-type',
        subject: '', // Empty
        message: '' // Empty
      });
      console.log('❌ Validation test failed - invalid data was accepted');
    } catch (validationError) {
      console.log('✅ Validation working correctly');
      console.log(`   Validation errors detected: ${Object.keys(validationError.errors).length}`);
    }

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await Contact.findByIdAndDelete(contact._id);
    console.log('✅ Test contact deleted');

    console.log('\n✅ Contact API functionality test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the test
testContactAPI().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});
