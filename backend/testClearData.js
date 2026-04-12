#!/usr/bin/env node

/**
 * Test Clear Data Script
 * This script tests the database connection and counts records without deleting
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Booking = require('./models/Booking');
const Worker = require('./models/Worker');
const Rating = require('./models/Rating');

async function testClearData() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected!');

    // Count records in collections
    console.log('📊 Counting records in collections...');
    
    const bookingCount = await Booking.countDocuments({});
    const workerCount = await Worker.countDocuments({});
    const ratingCount = await Rating.countDocuments({});
    
    console.log(`📈 Current data counts:`);
    console.log(`   Bookings: ${bookingCount}`);
    console.log(`   Workers: ${workerCount}`);
    console.log(`   Ratings: ${ratingCount}`);
    
    console.log('\n⚠️  This is a TEST RUN - no data was deleted.');
    console.log('To actually delete data, run: node clearTestingData.js');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the function
testClearData();