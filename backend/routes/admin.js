const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Booking = require('../models/Booking');
const Worker = require('../models/Worker');
const Rating = require('../models/Rating');
const Service = require('../models/Service');

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
    return res.json({ success: true, token });
  }
  res.status(401).json({ success: false, message: 'Wrong username or password!' });
});

function adminAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: 'No token' });
  try {
    jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

router.get('/stats', adminAuth, async (req, res) => {
  try {
    const [totalBookings, pendingBookings, completedBookings, totalWorkers, pendingWorkers] =
      await Promise.all([
        Booking.countDocuments(),
        Booking.countDocuments({ status: 'pending' }),
        Booking.countDocuments({ status: 'completed' }),
        Worker.countDocuments(),
        Worker.countDocuments({ status: 'pending' }),
      ]);
    res.json({ totalBookings, pendingBookings, completedBookings, totalWorkers, pendingWorkers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/bookings/:id', adminAuth, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Clear all testing data (USE WITH CAUTION!)
router.delete('/clear-testing-data', adminAuth, async (req, res) => {
  try {
    console.log('🧹 Admin requested to clear all testing data...');
    
    // Delete all data from collections
    const bookingResult = await Booking.deleteMany({});
    const workerResult = await Worker.deleteMany({});
    const ratingResult = await Rating.deleteMany({});
    
    console.log(`✅ Deleted ${bookingResult.deletedCount} bookings, ${workerResult.deletedCount} workers, ${ratingResult.deletedCount} ratings`);
    
    res.json({
      success: true,
      message: 'All testing data cleared successfully',
      deleted: {
        bookings: bookingResult.deletedCount,
        workers: workerResult.deletedCount,
        ratings: ratingResult.deletedCount
      }
    });
  } catch (err) {
    console.error('❌ Error clearing testing data:', err);
    res.status(500).json({
      success: false,
      message: 'Error clearing testing data',
      error: err.message
    });
  }
});

// Public homepage statistics (no authentication required)
router.get('/home-stats', async (req, res) => {
  try {
    // Get total number of workers (confirmed status only)
    const totalWorkers = await Worker.countDocuments({ status: 'confirmed' });
    
    // Get total number of active services
    const totalServices = await Service.countDocuments({ is_active: true });
    
    // Get minimum service price from active services
    // First get all active services to parse prices
    const activeServices = await Service.find({ is_active: true });
    let minPrice = null;
    
    // Parse price strings to extract numeric values
    activeServices.forEach(service => {
      if (service.price) {
        // Extract numbers from price string (e.g., "From Rs. 500/visit" -> 500)
        const priceMatch = service.price.match(/\d+/);
        if (priceMatch) {
          const priceNum = parseInt(priceMatch[0]);
          if (minPrice === null || priceNum < minPrice) {
            minPrice = priceNum;
          }
        }
      }
    });
    
    // Default operating hours (could be stored in database in future)
    const operatingHours = '7AM–8PM';
    
    res.json({
      success: true,
      stats: {
        totalWorkers,
        minPrice: minPrice ? `Rs.${minPrice}` : 'Rs.200',
        totalServices,
        operatingHours,
        // Additional stats for the stats bar
        verifiedWorkersPercentage: '100%',
        servingArea: 'Butwal',
        availableDays: '7 Days'
      }
    });
  } catch (err) {
    console.error('Error fetching homepage stats:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: err.message
    });
  }
});

module.exports = router;
