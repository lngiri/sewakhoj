const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Booking = require('../models/Booking');
const Worker = require('../models/Worker');
const Rating = require('../models/Rating');

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

module.exports = router;
