// Script to expand service categories for SewaKhoj
const mongoose = require('mongoose');
require('dotenv').config();
const Service = require('./models/Service');

const expandedServices = [
  {
    name: "House Cleaning",
    description: "Professional home cleaning including dusting, mopping, bathroom sanitization, and kitchen deep cleaning.",
    icon: "🧹",
    price: "From Rs. 500/visit",
    display_order: 1,
    is_active: true
  },
  {
    name: "Cooking",
    description: "Daily meal preparation, special occasion cooking, and dietary-specific meal plans.",
    icon: "🍳",
    price: "From Rs. 400/day",
    display_order: 2,
    is_active: true
  },
  {
    name: "Gardening",
    description: "Lawn mowing, plant care, pruning, weeding, and garden maintenance.",
    icon: "🌿",
    price: "From Rs. 300/visit",
    display_order: 3,
    is_active: true
  },
  {
    name: "Baby Care",
    description: "Professional childcare, babysitting, feeding, and developmental activities.",
    icon: "👶",
    price: "From Rs. 600/day",
    display_order: 4,
    is_active: true
  },
  {
    name: "Elderly Care",
    description: "Companionship, medication reminders, mobility assistance, and daily living support.",
    icon: "👴",
    price: "From Rs. 700/day",
    display_order: 5,
    is_active: true
  },
  {
    name: "Laundry",
    description: "Washing, ironing, folding, and dry cleaning pickup/delivery.",
    icon: "🧺",
    price: "From Rs. 200/load",
    display_order: 6,
    is_active: true
  },
  {
    name: "Basic Repairs",
    description: "Minor plumbing, electrical fixes, furniture assembly, and general handyman services.",
    icon: "🔧",
    price: "From Rs. 300/visit",
    display_order: 7,
    is_active: true
  },
  // New expanded services
  {
    name: "Pet Care",
    description: "Pet sitting, dog walking, feeding, grooming, and veterinary visit assistance.",
    icon: "🐕",
    price: "From Rs. 350/day",
    display_order: 8,
    is_active: true
  },
  {
    name: "Car Washing",
    description: "Interior and exterior car cleaning, polishing, and detailing at your location.",
    icon: "🚗",
    price: "From Rs. 600/car",
    display_order: 9,
    is_active: true
  },
  {
    name: "Painting",
    description: "Interior and exterior wall painting, touch-ups, and color consultation.",
    icon: "🎨",
    price: "From Rs. 1500/room",
    display_order: 10,
    is_active: true
  },
  {
    name: "Moving Help",
    description: "Furniture moving, packing, loading/unloading, and transportation assistance.",
    icon: "📦",
    price: "From Rs. 800/hour",
    display_order: 11,
    is_active: true
  },
  {
    name: "Tutoring",
    description: "Academic tutoring for school subjects, homework help, and exam preparation.",
    icon: "📚",
    price: "From Rs. 400/hour",
    display_order: 12,
    is_active: true
  },
  {
    name: "Event Help",
    description: "Party setup, serving, cleanup, and coordination for events and gatherings.",
    icon: "🎉",
    price: "From Rs. 800/event",
    display_order: 13,
    is_active: true
  },
  {
    name: "Grocery Shopping",
    description: "Personalized grocery shopping and delivery to your doorstep.",
    icon: "🛒",
    price: "From Rs. 200/trip",
    display_order: 14,
    is_active: true
  },
  {
    name: "Yoga Instructor",
    description: "Private yoga sessions, meditation guidance, and wellness coaching at home.",
    icon: "🧘",
    price: "From Rs. 800/session",
    display_order: 15,
    is_active: true
  }
];

async function expandServices() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing services (optional - comment out to keep existing)
    // await Service.deleteMany({});
    // console.log('Cleared existing services');

    let addedCount = 0;
    let updatedCount = 0;

    for (const serviceData of expandedServices) {
      const existing = await Service.findOne({ name: serviceData.name });
      
      if (existing) {
        // Update existing service
        await Service.updateOne(
          { _id: existing._id },
          { $set: serviceData }
        );
        updatedCount++;
        console.log(`↻ Updated: ${serviceData.name}`);
      } else {
        // Create new service
        const service = new Service(serviceData);
        await service.save();
        addedCount++;
        console.log(`✓ Added: ${serviceData.name}`);
      }
    }

    console.log(`\n✅ Expansion complete!`);
    console.log(`Added: ${addedCount} new services`);
    console.log(`Updated: ${updatedCount} existing services`);
    
    const totalServices = await Service.countDocuments();
    console.log(`Total services in database: ${totalServices}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

expandServices();