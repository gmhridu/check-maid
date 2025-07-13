require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

// Sample staff members
const sampleStaff = [
  {
    name: 'John Smith',
    email: 'john.cleaner@cleaningservice.com',
    password: 'password123',
    phone: '+1234567890',
    role: 'staff',
    preferences: {
      serviceTypes: ['residential', 'airbnb'],
      notifications: {
        email: true,
        sms: true,
        marketing: false
      }
    },
    isActive: true,
    isEmailVerified: true
  },
  {
    name: 'Maria Garcia',
    email: 'maria.cleaner@cleaningservice.com',
    password: 'password123',
    phone: '+1234567891',
    role: 'staff',
    preferences: {
      serviceTypes: ['commercial', 'residential'],
      notifications: {
        email: true,
        sms: true,
        marketing: false
      }
    },
    isActive: true,
    isEmailVerified: true
  },
  {
    name: 'David Johnson',
    email: 'david.cleaner@cleaningservice.com',
    password: 'password123',
    phone: '+1234567892',
    role: 'staff',
    preferences: {
      serviceTypes: ['airbnb', 'pressure-washing'],
      notifications: {
        email: true,
        sms: true,
        marketing: false
      }
    },
    isActive: true,
    isEmailVerified: true
  },
  {
    name: 'Sarah Wilson',
    email: 'sarah.cleaner@cleaningservice.com',
    password: 'password123',
    phone: '+1234567893',
    role: 'staff',
    preferences: {
      serviceTypes: ['commercial', 'window-cleaning'],
      notifications: {
        email: true,
        sms: true,
        marketing: false
      }
    },
    isActive: true,
    isEmailVerified: true
  }
];

// Create staff members
const createStaffMembers = async () => {
  try {
    // Check if staff already exist
    const existingStaff = await User.find({ role: 'staff' });
    
    if (existingStaff.length > 0) {
      console.log('Staff members already exist. Skipping creation.');
      console.log(`Found ${existingStaff.length} existing staff members:`);
      existingStaff.forEach(staff => {
        console.log(`- ${staff.name} (${staff.email}) - Services: ${staff.preferences.serviceTypes.join(', ')}`);
      });
      return;
    }

    // Create new staff members
    const createdStaff = await User.insertMany(sampleStaff);
    console.log('✅ Sample staff members created successfully!');
    
    createdStaff.forEach(staff => {
      console.log(`- ${staff.name} (${staff.email}) - Services: ${staff.preferences.serviceTypes.join(', ')}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to create staff members:', error.message);
  }
};

// Main setup function
const setupStaff = async () => {
  console.log('🚀 Setting up staff members...');
  
  await connectDB();
  await createStaffMembers();
  
  console.log('✅ Staff setup completed!');
  console.log('\n📱 SMS Notifications will be sent to staff members when customers book:');
  console.log('- Airbnb cleaning services');
  console.log('- Residential cleaning services');
  console.log('- Commercial cleaning services');
  console.log('\n⚠️  Make sure to update the phone numbers in the staff records with real numbers for testing.');
  
  process.exit(0);
};

// Run setup
setupStaff().catch((error) => {
  console.error('❌ Staff setup failed:', error);
  process.exit(1);
});
