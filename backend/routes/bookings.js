const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const nodemailer = require('nodemailer');

// Create transporter once (better practice)
let transporter;
try {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    console.log('✅ Email transporter configured for:', process.env.EMAIL_USER);
  } else {
    console.warn('⚠️ EMAIL_USER or EMAIL_PASS not set. Email notifications will be disabled.');
    console.warn('   Please add EMAIL_USER and EMAIL_PASS to your .env file');
    console.warn('   Example: EMAIL_USER=your-email@gmail.com');
    console.warn('            EMAIL_PASS=your-app-password');
    transporter = null;
  }
} catch (err) {
  console.error('❌ Email transporter creation failed:', err.message);
  console.error('   Check your email credentials and ensure you are using an App Password, not your regular Gmail password.');
  transporter = null;
}

// Save new booking + send email
router.post('/', async (req, res) => {
  try {
    const booking = new Booking(req.body);
    await booking.save();

    // Prepare email content with real data
    const { full_name, phone, email, service, address, preferred_date, preferred_time, message } = req.body;

    // Send email notification to admin (non-blocking, don't fail booking if email fails)
    if (transporter) {
      try {
        await transporter.sendMail({
          from: `"SewaKhoj" <${process.env.EMAIL_USER || 'noreply@sewakhoj.com'}>`,
          to: process.env.EMAIL_USER || process.env.ADMIN_EMAIL || 'admin@sewakhoj.com',
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
        console.log('✅ Admin notification email sent');
      } catch (emailErr) {
        console.warn('⚠️ Admin email failed (booking still saved):', emailErr.message);
      }

      // Send confirmation email to customer if email provided
      if (email && email.trim() !== '') {
        try {
          await transporter.sendMail({
            from: `"SewaKhoj" <${process.env.EMAIL_USER || 'noreply@sewakhoj.com'}>`,
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
        } catch (emailErr) {
          console.warn('⚠️ Customer email failed:', emailErr.message);
        }
      }
    } else {
      console.warn('⚠️ Email transporter not configured. Skipping email notifications.');
      console.warn('   To enable email notifications, add EMAIL_USER and EMAIL_PASS to your .env file');
    }

    console.log('✅ Booking saved successfully!');
    res.json({ success: true, message: 'Booking saved successfully!' });

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

// Get filtered bookings for drill-down functionality
router.get('/filtered', async (req, res) => {
  try {
    const { status, service, dateFrom, dateTo, limit = 50 } = req.query;
    let filter = {};

    // Apply status filter
    if (status) {
      if (status === 'pending') {
        filter.status = 'pending';
      } else if (status === 'completed') {
        filter.status = 'completed';
      } else if (status === 'confirmed') {
        filter.status = 'confirmed';
      }
    }

    // Apply service filter
    if (service) {
      filter.service = service;
    }

    // Apply date range filter
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        filter.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filter.createdAt.$lte = new Date(dateTo);
      }
    }

    const bookings = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Get total count for pagination info
    const totalCount = await Booking.countDocuments(filter);

    res.json({
      success: true,
      data: bookings,
      total: totalCount,
      filtered: bookings.length,
      filters: { status, service, dateFrom, dateTo }
    });
  } catch (err) {
    console.error('❌ Filtered bookings error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch filtered bookings',
      error: err.message
    });
  }
});

module.exports = router;