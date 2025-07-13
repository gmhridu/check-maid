# SMS Notification Setup Guide

This guide explains how to set up and use the SMS notification system with Twilio for your cleaning service application.

## Overview

The SMS notification system automatically sends text messages to cleaners/staff when customers book the following services:
- **Airbnb** cleaning
- **Residential** cleaning  
- **Commercial** cleaning

## Prerequisites

1. **Twilio Account**: Sign up at [twilio.com](https://www.twilio.com)
2. **Twilio Phone Number**: Purchase a phone number from Twilio
3. **Environment Variables**: Configure Twilio credentials

## Setup Steps

### 1. Configure Environment Variables

Update your `.env` file with your Twilio credentials:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_actual_twilio_account_sid
TWILIO_AUTH_TOKEN=your_actual_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# SMS Notification Settings
SMS_NOTIFICATIONS_ENABLED=true
ADMIN_PHONE_NUMBER=+1234567890
```

### 2. Install Dependencies

The Twilio package has already been installed. If you need to reinstall:

```bash
cd backend
npm install twilio
```

### 3. Create Staff Members

Run the staff setup script to create sample staff members:

```bash
cd backend
node setup-staff.js
```

This creates 4 sample staff members with different service specializations:
- **John Smith**: Residential & Airbnb
- **Maria Garcia**: Commercial & Residential  
- **David Johnson**: Airbnb & Pressure Washing
- **Sarah Wilson**: Commercial & Window Cleaning

### 4. Update Staff Phone Numbers

**Important**: Update the phone numbers in the database with real numbers for testing.

You can do this through:
- The admin API endpoints (see API section below)
- Direct database update
- Admin dashboard (if implemented)

## How It Works

### Automatic SMS Notifications

When a customer submits a booking form for Airbnb, residential, or commercial services:

1. **Admin SMS**: Sent to the admin phone number with booking details
2. **Staff SMS**: Sent to all staff members who handle that service type

### SMS Message Format

**New Booking Alert:**
```
🧹 NEW BOOKING ALERT!

Service: RESIDENTIAL
Customer: John Doe
Phone: +1234567890
Date: 12/25/2023
Time: morning
Address: 123 Main St, City, State
Booking #: BK-20231225-001

Notes: Please bring extra supplies

Please check admin panel for full details.
```

## API Endpoints

### Get All Staff Members
```
GET /api/v1/admin/staff
Authorization: Bearer <admin_token>
```

### Update Staff Member
```
PATCH /api/v1/admin/staff/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "serviceTypes": ["residential", "airbnb"],
  "smsNotifications": true,
  "phone": "+1234567890"
}
```

### Test SMS System
```
POST /api/v1/admin/test-sms
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "serviceType": "residential",
  "message": "This is a test message"
}
```

## Configuration Options

### Service Types

Staff members can be assigned to handle these service types:
- `commercial`
- `residential` 
- `airbnb`
- `pressure-washing`
- `window-cleaning`

### SMS Preferences

Each staff member has SMS notification preferences:
- `preferences.notifications.sms`: Boolean to enable/disable SMS
- `preferences.serviceTypes`: Array of service types they handle

## Testing

### 1. Test SMS System
Use the admin test endpoint to verify SMS delivery:

```bash
curl -X POST http://localhost:5000/api/v1/admin/test-sms \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"serviceType": "residential"}'
```

### 2. Test Booking Flow
1. Submit a booking through the frontend for residential/airbnb/commercial service
2. Check that SMS notifications are sent to admin and relevant staff
3. Verify SMS delivery in Twilio console

## Troubleshooting

### Common Issues

1. **SMS Not Sending**
   - Check Twilio credentials in `.env`
   - Verify `SMS_NOTIFICATIONS_ENABLED=true`
   - Check Twilio account balance
   - Verify phone number format (+1XXXXXXXXXX)

2. **Staff Not Receiving SMS**
   - Verify staff has `preferences.notifications.sms: true`
   - Check staff `serviceTypes` includes the booking service type
   - Verify staff phone number is valid

3. **Invalid Phone Number**
   - Phone numbers must be in E.164 format (+1XXXXXXXXXX)
   - Use the `formatPhoneNumber` utility function

### Logs

Check console logs for SMS delivery status:
```bash
# Success
SMS sent successfully to +1234567890. SID: SM1234567890abcdef

# Error
Failed to send SMS: [Error details]
```

## Security Notes

1. **Environment Variables**: Never commit real Twilio credentials to version control
2. **Phone Numbers**: Validate phone numbers before storing
3. **Rate Limiting**: Twilio has rate limits - the system includes delays between bulk SMS
4. **Opt-out**: Implement SMS opt-out functionality for compliance

## Cost Considerations

- SMS costs vary by destination country
- US/Canada SMS typically costs $0.0075 per message
- Monitor usage in Twilio console
- Consider implementing daily/monthly SMS limits

## Next Steps

1. **Admin Dashboard**: Create a web interface for managing staff SMS preferences
2. **SMS Templates**: Add more SMS templates for different scenarios
3. **Scheduling**: Add SMS reminders for upcoming appointments
4. **Two-way SMS**: Implement SMS responses from staff
5. **Analytics**: Track SMS delivery rates and engagement
