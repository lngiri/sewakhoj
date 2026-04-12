const mongoose = require('mongoose');
const Service = require('./models/Service');
require('dotenv').config();

const sampleServices = [
  {
    name: 'House Cleaning',
    icon: '🧹',
    description: 'Full home deep cleaning, dusting, mopping and sanitization.',
    price: 'From Rs. 500/visit',
    display_order: 1,
    is_active: true,
    workerCount: 5
  },
  {
    name: 'Cooking',
    icon: '🍳',
    description: 'Experienced cooks for daily meals, Nepali and Indian cuisine.',
    price: 'From Rs. 400/day',
    display_order: 2,
    is_active: true,
    workerCount: 8
  },
  {
    name: 'Gardening',
    icon: '🌿',
    description: 'Lawn maintenance, plant care, and garden cleaning.',
    price: 'From Rs. 300/visit',
    display_order: 3,
    is_active: true,
    workerCount: 3
  },
  {
    name: 'Baby Care',
    icon: '👶',
    description: 'Trusted babysitters and nannies for your little ones.',
    price: 'From Rs. 600/day',
    display_order: 4,
    is_active: true,
    workerCount: 7
  },
  {
    name: 'Elderly Care',
    icon: '👴',
    description: 'Caring helpers for senior family members at home.',
    price: 'From Rs. 700/day',
    display_order: 5,
    is_active: true,
    workerCount: 4
  },
  {
    name: 'Laundry',
    icon: '🧺',
    description: 'Washing, drying and folding done professionally.',
    price: 'From Rs. 200/load',
    display_order: 6,
    is_active: true,
    workerCount: 6
  },
  {
    name: 'Basic Repairs',
    icon: '🔧',
    description: 'Plumbing, electrical, and minor home repairs.',
    price: 'From Rs. 300/visit',
    display_order: 7,
    is_active: true,
    workerCount: 2
  }
];

async function createSampleServices() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sewakhoj');
    console.log('Connected to MongoDB');

    // Clear existing services
    await Service.deleteMany({});
    console.log('Cleared existing services');

    // Insert sample services
    const createdServices = await Service.insertMany(sampleServices);
    console.log(`Created ${createdServices.length} sample services`);

    // Display created services with worker counts
    console.log('\nCreated Services:');
    createdServices.forEach(service => {
      console.log(`- ${service.icon} ${service.name}: ${service.workerCount} workers`);
    });

    // Run the worker count update script to ensure counts are accurate
    console.log('\nRunning worker count update...');
    const Worker = require('./models/Worker');
    
    for (const service of createdServices) {
      const confirmedWorkerCount = await Worker.countDocuments({
        service: service.name,
        status: 'confirmed'
      });
      
      // Update the service with actual count (if different)
      if (confirmedWorkerCount !== service.workerCount) {
        await Service.findByIdAndUpdate(
          service._id,
          { workerCount: confirmedWorkerCount }
        );
        console.log(`Updated ${service.name} worker count: ${service.workerCount} → ${confirmedWorkerCount}`);
      }
    }

    console.log('\n✅ Sample services created successfully!');
    console.log('You can now:');
    console.log('1. Visit the homepage to see worker count badges on service cards');
    console.log('2. Check the admin panel to see worker counts in the services table');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating sample services:', error);
    process.exit(1);
  }
}

createSampleServices();