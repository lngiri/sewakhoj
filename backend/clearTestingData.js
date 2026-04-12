#!/usr/bin/env node

/**
 * Clear Testing Data Script
 * This script deletes all data from the database collections
 * Use with caution as it will permanently delete all data
 */

const mongoose = require('mongoose');
require('dotenv').config();
const readline = require('readline');

// Import models
const Booking = require('./models/Booking');
const Worker = require('./models/Worker');
const Rating = require('./models/Rating');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function countRecords() {
  const bookingCount = await Booking.countDocuments({});
  const workerCount = await Worker.countDocuments({});
  const ratingCount = await Rating.countDocuments({});
  return { bookingCount, workerCount, ratingCount };
}

async function clearAllData() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected!');

    // Count current records
    console.log('📊 Counting current records...');
    const counts = await countRecords();
    console.log(`📈 Current data counts:`);
    console.log(`   Bookings: ${counts.bookingCount}`);
    console.log(`   Workers: ${counts.workerCount}`);
    console.log(`   Ratings: ${counts.ratingCount}`);
    
    if (counts.bookingCount === 0 && counts.workerCount === 0 && counts.ratingCount === 0) {
      console.log('✅ Database is already empty. No action needed.');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Ask for confirmation
    rl.question('\n⚠️  WARNING: This will DELETE ALL DATA permanently!\nType "DELETE" to confirm: ', async (answer) => {
      if (answer.trim() === 'DELETE') {
        console.log('🧹 Clearing all testing data...');
        
        const bookingResult = await Booking.deleteMany({});
        console.log(`✅ Deleted ${bookingResult.deletedCount} bookings`);
        
        const workerResult = await Worker.deleteMany({});
        console.log(`✅ Deleted ${workerResult.deletedCount} workers`);
        
        const ratingResult = await Rating.deleteMany({});
        console.log(`✅ Deleted ${ratingResult.deletedCount} ratings`);
        
        console.log('🎉 All testing data cleared successfully!');
      } else {
        console.log('❌ Operation cancelled. No data was deleted.');
      }
      
      // Close connection and exit
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed');
      rl.close();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    process.exit(1);
  }
}

// Run the function
clearAllData();