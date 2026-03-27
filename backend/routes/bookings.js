const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const nodemailer = require('nodemailer');

// Create transporter once (better practice)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Save new booking + send email
router.post('/', async (req, res) => {
  try {
    const booking = new Booking(req.body);
    await booking.save();

    // Prepare email content with real data
    const { name, phone, service, address, date, message } = req.body;

    // Send email notification
    await transporter.sendMail({
      from: `"SewaKhoj" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,           // Send to admin (your gmail)
      subject: `New Booking Received - ${service || 'Service'}`,
      html: `
        <h2>New Booking Received!</h2>
        <p><strong>Name:</strong> ${name || 'N/A'}</p>
        <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
        <p><strong>Service:</strong> ${service || 'N/A'}</p>
        <p><strong>Address:</strong> ${address || 'N/A'}</p>
        <p><strong>Date:</strong> ${date || 'N/A'}</p>
        <p><strong>Message:</strong> ${message || 'N/A'}</p>
        <br/>
        <p><strong>Booking ID:</strong> ${booking._id}</p>
        <a href="https://www.sewakhoj.com/adminsewa.html" target="_blank">
          Open Admin Panel
        </a>
      `
    });

    console.log('✅ Booking saved and email sent successfully!');
    res.json({ success: true, message: 'Booking saved and notification sent!' });

  } catch (err) {
    console.error('❌ Booking/Email Error:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Something went wrong', 
      error: err.message 
    });
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
    const bookings = await Booking.find({ assignedWorker: req.params.workerId })
      .sort({ createdAt: -1 });
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