require('dotenv').config();
const { sendSMS, sendAdminSMS, validatePhoneNumber, formatPhoneNumber } = require('./src/utils/sms');

// Test SMS functionality without database
const testSMS = async () => {
  console.log('🧪 Testing SMS Functionality...\n');

  // Check environment variables
  console.log('📋 Environment Check:');
  console.log(`- SMS Enabled: ${process.env.SMS_NOTIFICATIONS_ENABLED}`);
  console.log(`- Twilio SID: ${process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing'}`);
  console.log(`- Twilio Token: ${process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing'}`);
  console.log(`- Twilio Phone: ${process.env.TWILIO_PHONE_NUMBER || '❌ Missing'}`);
  console.log(`- Admin Phone: ${process.env.ADMIN_PHONE_NUMBER || '❌ Missing'}\n`);

  // Test phone number validation
  console.log('📞 Phone Number Validation Tests:');
  const testNumbers = [
    '+12345678901',  // Invalid: starts with 1 but area code 234 is invalid
    '2345678901',    // Valid: 10 digits, valid area code
    '(234) 567-8901', // Valid: formatted 10 digits
    '234-567-8901',   // Valid: formatted 10 digits
    '+12345678901',   // Valid: 11 digits with country code
    '5551234567',     // Valid: 10 digits
    'invalid'         // Invalid: not a number
  ];

  testNumbers.forEach(number => {
    const isValid = validatePhoneNumber(number);
    const formatted = formatPhoneNumber(number);
    console.log(`- ${number} → Valid: ${isValid ? '✅' : '❌'}, Formatted: ${formatted}`);
  });

  console.log('\n📱 SMS Template Test:');
  
  // Test new booking SMS template
  const testBookingData = {
    customerName: 'John Doe',
    customerPhone: '+1234567890',
    serviceType: 'residential',
    packageType: 'Standard Cleaning',
    preferredDate: '12/25/2023',
    preferredTime: 'morning',
    address: '123 Main St, Anytown, ST 12345',
    notes: 'Please bring extra supplies for kitchen deep clean',
    bookingNumber: 'BK-20231225-001'
  };

  // Test SMS sending (only if credentials are configured)
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    console.log('\n🚀 Attempting to send test SMS...');
    
    // Test admin SMS
    if (process.env.ADMIN_PHONE_NUMBER) {
      console.log('📤 Sending test SMS to admin...');
      try {
        const adminResult = await sendAdminSMS({
          template: 'newBooking',
          data: testBookingData
        });
        
        if (adminResult.success) {
          console.log('✅ Admin SMS sent successfully!');
          console.log(`   Message ID: ${adminResult.messageId}`);
        } else {
          console.log('❌ Admin SMS failed:', adminResult.message);
        }
      } catch (error) {
        console.log('❌ Admin SMS error:', error.message);
      }
    } else {
      console.log('⚠️  Admin phone number not configured, skipping admin SMS test');
    }

    // Test direct SMS
    console.log('\n📤 Testing direct SMS (you can replace with your phone number)...');
    const testPhoneNumber = process.env.TEST_PHONE_NUMBER || process.env.ADMIN_PHONE_NUMBER;
    
    if (testPhoneNumber) {
      try {
        const directResult = await sendSMS({
          to: testPhoneNumber,
          template: 'newBooking',
          data: testBookingData
        });
        
        if (directResult.success) {
          console.log('✅ Direct SMS sent successfully!');
          console.log(`   To: ${testPhoneNumber}`);
          console.log(`   Message ID: ${directResult.messageId}`);
        } else {
          console.log('❌ Direct SMS failed:', directResult.message);
        }
      } catch (error) {
        console.log('❌ Direct SMS error:', error.message);
      }
    } else {
      console.log('⚠️  No test phone number configured');
      console.log('   Set TEST_PHONE_NUMBER or ADMIN_PHONE_NUMBER in .env to test SMS sending');
    }

  } else {
    console.log('⚠️  Twilio credentials not fully configured');
    console.log('   Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env');
    console.log('   to test actual SMS sending');
  }

  console.log('\n✅ SMS functionality test completed!');
  console.log('\n📖 Next Steps:');
  console.log('1. Configure your Twilio credentials in .env');
  console.log('2. Set up MongoDB and run: node setup-staff.js');
  console.log('3. Start the server and test booking submissions');
  console.log('4. Use the admin API to manage staff SMS preferences');
};

// Run the test
testSMS().catch(error => {
  console.error('❌ SMS test failed:', error);
  process.exit(1);
});
