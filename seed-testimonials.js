require('dotenv').config();
const mongoose = require('mongoose');
const Testimonial = require('./src/models/Testimonial');
const User = require('./src/models/User');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// Sample testimonials data
const testimonialsData = [
  {
    name: "Sarah Johnson",
    rating: 5,
    text: "Check Maid did an amazing job before our move-out. Highly recommend! The team was professional, thorough, and left our place spotless.",
    location: "Burlington, WA",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=774&q=80",
    serviceType: "residential",
    isActive: true,
    isApproved: true,
    isFeatured: true,
    sortOrder: 1
  },
  {
    name: "Michael Chen",
    rating: 5,
    text: "I've been using Check Maid's services for my office for over a year now. Consistent quality and great customer service. They're always on time and do a fantastic job.",
    location: "Mount Vernon, WA",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=774&q=80",
    serviceType: "commercial",
    isActive: true,
    isApproved: true,
    isFeatured: true,
    sortOrder: 2
  },
  {
    name: "Emily Rodriguez",
    rating: 5,
    text: "The deep cleaning service was exactly what we needed. They paid attention to every detail and used eco-friendly products. Will definitely book again!",
    location: "Anacortes, WA",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=774&q=80",
    serviceType: "residential",
    isActive: true,
    isApproved: true,
    isFeatured: true,
    sortOrder: 3
  },
  {
    name: "David Wilson",
    rating: 5,
    text: "Professional, efficient, and thorough. Check Maid transformed our new home before move-in. The team was friendly and left everything sparkling clean.",
    location: "Oak Harbor, WA",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=774&q=80",
    serviceType: "residential",
    isActive: true,
    isApproved: true,
    isFeatured: true,
    sortOrder: 4
  },
  {
    name: "Jennifer Martinez",
    rating: 5,
    text: "Outstanding service for our Airbnb property! They always leave it guest-ready and handle last-minute bookings with ease. Highly professional team.",
    location: "Bellingham, WA",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=774&q=80",
    serviceType: "airbnb",
    isActive: true,
    isApproved: true,
    isFeatured: false,
    sortOrder: 5
  },
  {
    name: "Robert Thompson",
    rating: 5,
    text: "The pressure washing service made our driveway and siding look brand new! Excellent attention to detail and fair pricing.",
    location: "Sedro-Woolley, WA",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=774&q=80",
    serviceType: "pressure-washing",
    isActive: true,
    isApproved: true,
    isFeatured: false,
    sortOrder: 6
  },
  {
    name: "Lisa Anderson",
    rating: 4,
    text: "Great window cleaning service! Our office windows are crystal clear and the team was very professional. Will use again.",
    location: "Ferndale, WA",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=774&q=80",
    serviceType: "window-cleaning",
    isActive: true,
    isApproved: true,
    isFeatured: false,
    sortOrder: 7
  },
  {
    name: "Mark Davis",
    rating: 5,
    text: "Check Maid has been cleaning our restaurant for 6 months now. They understand the importance of hygiene in food service and always deliver.",
    location: "Burlington, WA",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=774&q=80",
    serviceType: "commercial",
    isActive: true,
    isApproved: true,
    isFeatured: false,
    sortOrder: 8
  },
  {
    name: "Amanda White",
    rating: 5,
    text: "Fantastic post-construction cleanup! They handled all the dust and debris perfectly. Our new office space was move-in ready.",
    location: "Mount Vernon, WA",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=774&q=80",
    serviceType: "commercial",
    isActive: true,
    isApproved: true,
    isFeatured: false,
    sortOrder: 9
  },
  {
    name: "James Brown",
    rating: 4,
    text: "Reliable and thorough cleaning service. They've been taking care of our home for months and we're very satisfied with their work.",
    location: "Anacortes, WA",
    image: "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=774&q=80",
    serviceType: "residential",
    isActive: true,
    isApproved: true,
    isFeatured: false,
    sortOrder: 10
  }
];

// Seed testimonials
const seedTestimonials = async () => {
  try {
    // Check if testimonials already exist
    const existingCount = await Testimonial.countDocuments();
    if (existingCount > 0) {
      console.log(`ℹ️ ${existingCount} testimonials already exist, skipping seeding`);
      return;
    }

    // Find an admin user to assign as creator
    const adminUser = await User.findOne({ role: 'admin' });

    if (!adminUser) {
      console.log('❌ No admin user found. Please create an admin user first.');
      return;
    }

    console.log(`📝 Found admin user: ${adminUser.name} (${adminUser.email})`);

    // Add createdBy field to each testimonial
    const testimonialsWithCreator = testimonialsData.map(testimonial => ({
      ...testimonial,
      createdBy: adminUser._id
    }));

    // Insert testimonials
    const createdTestimonials = await Testimonial.insertMany(testimonialsWithCreator);

    console.log(`✅ Successfully created ${createdTestimonials.length} testimonials:`);
    createdTestimonials.forEach((testimonial, index) => {
      console.log(`   ${index + 1}. ${testimonial.name} - ${testimonial.rating} stars (${testimonial.serviceType})`);
    });

    // Display statistics
    const stats = await Testimonial.aggregate([
      {
        $group: {
          _id: null,
          totalTestimonials: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          featuredCount: { $sum: { $cond: ['$isFeatured', 1, 0] } },
          approvedCount: { $sum: { $cond: ['$isApproved', 1, 0] } }
        }
      }
    ]);

    if (stats.length > 0) {
      const stat = stats[0];
      console.log('\n📊 Testimonial Statistics:');
      console.log(`   Total: ${stat.totalTestimonials}`);
      console.log(`   Average Rating: ${stat.averageRating.toFixed(1)} stars`);
      console.log(`   Featured: ${stat.featuredCount}`);
      console.log(`   Approved: ${stat.approvedCount}`);
    }

    // Display service type breakdown
    const serviceBreakdown = await Testimonial.aggregate([
      {
        $group: {
          _id: '$serviceType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    console.log('\n🏷️  Service Type Breakdown:');
    serviceBreakdown.forEach(service => {
      console.log(`   ${service._id}: ${service.count} testimonials`);
    });

    console.log('\n🎉 Testimonial seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding testimonials:', error);
  }
};

// Run the seeder
const runSeeder = async () => {
  console.log('🌱 Starting testimonial seeding process...\n');

  await connectDB();
  await seedTestimonials();
};

// Execute if run directly
if (require.main === module) {
  runSeeder();
}

module.exports = { seedTestimonials, testimonialsData };
