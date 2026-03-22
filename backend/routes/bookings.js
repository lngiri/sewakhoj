const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');

// Save new booking
router.post('/', async (req, res) => {
  try {
    const booking = new Booking(req.body);
    await booking.save();
    res.json({ success: true, message: 'Booking saved!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all bookings
router.get('/', async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get bookings for specific worker
router.get('/worker/:workerId', async (req, res) => {
  try {
    const bookings = await Booking.find({ assignedWorker: req.params.workerId }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update booking status
router.patch('/:id', async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;