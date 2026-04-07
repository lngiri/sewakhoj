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
    const { full_name, phone, email, service, address, preferred_date, preferred_time, message } = req.body;

    // Send email notification to admin
    await transporter.sendMail({
      from: `"SewaKhoj" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,           // Send to admin (your gmail)
      subject: `New Booking Received - ${service || 'Service'}`,
      html: `
        <h2>New Booking Received!</h2>
        <p><strong>Name:</strong> ${full_name || 'N/A'}</p>
        <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
        <p><strong>Email:</strong> ${email || 'N/A'}</p>
        <p><strong>Service:</strong> ${service || 'N/A'}</p>
        <p><strong>Address:</strong> ${address || 'N/A'}</p>
        <p><strong>Date:</strong> ${preferred_date || 'N/A'}</p>
        <p><strong>Time:</strong> ${preferred_time || 'N/A'}</p>
        <p><strong>Message:</strong> ${message || 'N/A'}</p>
        <br/>
        <p><strong>Booking ID:</strong> ${booking._id}</p>
        <a href="https://www.sewakhoj.com/adminsewa.html" target="_blank">
          Open Admin Panel
        </a>
      `
    });

    // Send confirmation email to customer if email provided
    if (email && email.trim() !== '') {
      await transporter.sendMail({
        from: `"SewaKhoj" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Booking Confirmation - SewaKhoj`,
        html: `
          <h2>Thank you for your booking, ${full_name}!</h2>
          <p>We have received your booking request for <strong>${service}</strong>.</p>
          <p><strong>Booking Details:</strong></p>
          <ul>
            <li><strong>Service:</strong> ${service}</li>
            <li><strong>Date:</strong> ${preferred_date || 'To be confirmed'}</li>
            <li><strong>Time:</strong> ${preferred_time || 'To be confirmed'}</li>
            <li><strong>Address:</strong> ${address}</li>
          </ul>
          <p>Our team will contact you shortly at ${phone} to confirm the booking.</p>
          <p>You can also contact us at +977 9847033366 for any queries.</p>
          <br/>
          <p>Best regards,<br/>SewaKhoj Team</p>
          <p><small>Booking ID: ${booking._id}</small></p>
        `
      });
      console.log('✅ Customer confirmation email sent to:', email);
    }

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