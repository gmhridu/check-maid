const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./src/models/User');
const Service = require('./src/models/Service');
const { seedTestimonials } = require('./seed-testimonials');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// Create admin user
const createAdminUser = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });

    if (adminExists) {
      console.log('ℹ️ Admin user already exists');
      return;
    }

    const adminUser = await User.create({
      name: 'Admin User',
      email: process.env.ADMIN_EMAIL || 'admin@cleaningservice.com',
      phone: '+1234567890',
      password: process.env.ADMIN_PASSWORD || 'admin123456',
      role: 'admin',
      isActive: true,
      isEmailVerified: true
    });

    console.log('✅ Admin user created:', adminUser.email);
  } catch (error) {
    console.error('❌ Failed to create admin user:', error.message);
  }
};

// Create default services
const createDefaultServices = async () => {
  try {
    const servicesCount = await Service.countDocuments();

    if (servicesCount > 0) {
      console.log('ℹ️ Services already exist');
      return;
    }

    const adminUser = await User.findOne({ role: 'admin' });

    const defaultServices = [
      {
        name: 'Commercial Lawn Maintenance',
        category: 'commercial',
        description: {
          short: 'Professional lawn mowing and maintenance for commercial properties',
          detailed: 'Comprehensive lawn care services including mowing, edging, trimming, weed control, and seasonal cleanups for commercial properties.'
        },
        features: [
          { name: 'Lawn mowing', included: true },
          { name: 'Edging & trimming', included: true },
          { name: 'Blowing sidewalks & lots', included: true },
          { name: 'Weed control', included: true },
          { name: 'Seasonal cleanups', included: true }
        ],
        pricing: {
          basePrice: 200,
          priceType: 'fixed',
          currency: 'USD'
        },
        packages: [
          {
            name: 'Standard Package',
            description: 'Perfect for small businesses',
            price: 550,
            features: ['Weekly service', 'Basic maintenance', 'Debris removal']
          },
          {
            name: 'Premium Package',
            description: 'Ideal for restaurants and medium businesses',
            price: 950,
            features: ['Bi-weekly service', 'Full maintenance', 'Priority support']
          }
        ],
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'Residential House Cleaning',
        category: 'residential',
        description: {
          short: 'Professional home cleaning services for residential properties',
          detailed: 'Complete home cleaning services including regular cleaning, deep cleaning, kitchen and bathroom sanitization.'
        },
        features: [
          { name: 'General dusting and wiping', included: true },
          { name: 'Floor cleaning and vacuuming', included: true },
          { name: 'Bathroom cleaning', included: true },
          { name: 'Kitchen cleaning', included: true }
        ],
        pricing: {
          basePrice: 150,
          priceType: 'fixed',
          currency: 'USD'
        },
        packages: [
          {
            name: 'Regular Cleaning',
            description: 'Weekly or bi-weekly service',
            price: 150,
            features: ['Standard cleaning', 'Flexible scheduling']
          },
          {
            name: 'Deep Cleaning',
            description: 'One-time comprehensive cleaning',
            price: 200,
            features: ['Complete deep clean', 'All rooms included', 'Appliance cleaning']
          }
        ],
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'Airbnb Turnover Cleaning',
        category: 'airbnb',
        description: {
          short: 'Fast and thorough cleaning for Airbnb properties between guests',
          detailed: 'Specialized cleaning service for short-term rental properties including guest turnover cleaning, restocking, and preparation for new guests.'
        },
        features: [
          { name: 'Standard cleaning between guests', included: true },
          { name: 'Fresh linens & towels', included: true },
          { name: 'Restock basic supplies', included: true },
          { name: 'Fast turnaround', included: true }
        ],
        pricing: {
          basePrice: 120,
          priceType: 'fixed',
          currency: 'USD'
        },
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'Pressure Washing Service',
        category: 'pressure-washing',
        description: {
          short: 'Professional pressure washing for driveways, sidewalks, and building exteriors',
          detailed: 'High-pressure cleaning services for various surfaces including driveways, sidewalks, building exteriors, decks, and patios.'
        },
        features: [
          { name: 'Driveway cleaning', included: true },
          { name: 'Sidewalk cleaning', included: true },
          { name: 'Building exterior washing', included: true },
          { name: 'Deck and patio cleaning', included: true }
        ],
        pricing: {
          basePrice: 180,
          priceType: 'per_sqft',
          currency: 'USD'
        },
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'Window Cleaning Service',
        category: 'window-cleaning',
        description: {
          short: 'Professional window cleaning for residential and commercial properties',
          detailed: 'Complete window cleaning services including interior and exterior window cleaning, screen cleaning, and sill wiping.'
        },
        features: [
          { name: 'Interior window cleaning', included: true },
          { name: 'Exterior window cleaning', included: true },
          { name: 'Screen cleaning', included: true },
          { name: 'Sill and frame wiping', included: true }
        ],
        pricing: {
          basePrice: 100,
          priceType: 'per_room',
          currency: 'USD'
        },
        isActive: true,
        createdBy: adminUser._id
      }
    ];

    await Service.insertMany(defaultServices);
    console.log('✅ Default services created');
  } catch (error) {
    console.error('❌ Failed to create default services:', error.message);
  }
};

// Main setup function
const setup = async () => {
  console.log('🚀 Starting setup...');

  await connectDB();
  await createAdminUser();
  await createDefaultServices();

  // Seed testimonials
  console.log('\n🌱 Seeding testimonials...');
  await seedTestimonials();

  console.log('\n✅ Setup completed successfully!');
  console.log('📧 Admin email:', process.env.ADMIN_EMAIL || 'admin@cleaningservice.com');
  console.log('🔑 Admin password:', process.env.ADMIN_PASSWORD || 'admin123456');

  process.exit(0);
};

// Run setup
setup().catch((error) => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});
