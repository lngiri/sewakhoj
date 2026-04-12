const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Worker = require('../models/Worker');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// Email transporter configuration (reuse same as bookings)
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
    console.log('✅ Email transporter configured for worker registration');
  } else {
    console.warn('⚠️ EMAIL_USER or EMAIL_PASS not set. Worker registration emails will be disabled.');
    transporter = null;
  }
} catch (err) {
  console.error('❌ Email transporter creation failed:', err.message);
  transporter = null;
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/worker-photos/';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'worker-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files (jpeg, jpg, png, gif) are allowed!'));
  }
});

// Register new worker with optional photo
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const workerData = req.body;
    
    // If photo was uploaded, add photo URL to worker data
    if (req.file) {
      workerData.photo = `/uploads/worker-photos/${req.file.filename}`;
    }
    
    const worker = new Worker(workerData);
    await worker.save();

    // Prepare email content with worker data
    const { full_name, phone, email, service, area, experience } = req.body;

    // Send email notification to admin (non-blocking, don't fail registration if email fails)
    if (transporter) {
      try {
        await transporter.sendMail({
          from: `"SewaKhoj" <${process.env.EMAIL_USER || 'noreply@sewakhoj.com'}>`,
          to: process.env.EMAIL_USER || process.env.ADMIN_EMAIL || 'admin@sewakhoj.com',
          subject: `New Worker Registration - ${full_name || 'New Worker'}`,
          html: `
            <h2>New Worker Registration Received!</h2>
            <p><strong>Name:</strong> ${full_name || 'N/A'}</p>
            <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
            <p><strong>Email:</strong> ${email || 'N/A'}</p>
            <p><strong>Service:</strong> ${service || 'N/A'}</p>
            <p><strong>Area:</strong> ${area || 'N/A'}</p>
            <p><strong>Experience:</strong> ${experience || 'N/A'}</p>
            <br/>
            <p><strong>Worker ID:</strong> ${worker._id}</p>
            <p><strong>Status:</strong> ${worker.status || 'pending'}</p>
            <a href="https://www.sewakhoj.com/adminsewa.html" target="_blank">
              Open Admin Panel to Review
            </a>
          `
        });
        console.log('✅ Admin notification email sent for new worker registration');
      } catch (emailErr) {
        console.warn('⚠️ Admin email failed (worker still registered):', emailErr.message);
      }

      // Send confirmation email to worker if email provided
      if (email && email.trim() !== '') {
        try {
          await transporter.sendMail({
            from: `"SewaKhoj" <${process.env.EMAIL_USER || 'noreply@sewakhoj.com'}>`,
            to: email,
            subject: `Registration Received - SewaKhoj`,
            html: `
              <h2>Thank you for registering as a worker, ${full_name}!</h2>
              <p>We have received your registration for <strong>${service}</strong> service.</p>
              <p><strong>Registration Details:</strong></p>
              <ul>
                <li><strong>Service:</strong> ${service}</li>
                <li><strong>Area:</strong> ${area || 'Not specified'}</li>
                <li><strong>Experience:</strong> ${experience || 'Not specified'}</li>
                <li><strong>Phone:</strong> ${phone}</li>
              </ul>
              <p>Our admin team will review your application and contact you shortly.</p>
              <p>Once approved, you will be able to log in to the worker portal and start receiving bookings.</p>
              <br/>
              <p>Best regards,<br/>SewaKhoj Team</p>
              <p><small>Worker ID: ${worker._id}</small></p>
            `
          });
          console.log('✅ Worker confirmation email sent to:', email);
        } catch (emailErr) {
          console.warn('⚠️ Worker email failed:', emailErr.message);
        }
      }
    } else {
      console.warn('⚠️ Email transporter not configured. Skipping worker registration email notifications.');
    }

    res.json({ success: true, message: 'Worker registered!', worker });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Worker login
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const worker = await Worker.findOne({ phone });
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found!' });
    if (worker.status !== 'confirmed') return res.status(403).json({ success: false, message: 'Account not approved yet!' });
    if (!worker.password) return res.status(401).json({ success: false, message: 'Password not set yet! Contact admin.' });
    const isMatch = await bcrypt.compare(password, worker.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Wrong password!' });
    const token = jwt.sign({ id: worker._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ 
      success: true, 
      token, 
      worker: { 
        id: worker._id, 
        full_name: worker.full_name, 
        service: worker.service, 
        area: worker.area,
        photo: worker.photo,
        total_earnings: worker.total_earnings,
        pending_balance: worker.pending_balance
      } 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all workers with average ratings
router.get('/', async (req, res) => {
  try {
    const workers = await Worker.find().sort({ createdAt: -1 });
    
    // Get ratings for each worker to calculate average
    const Rating = require('../models/Rating');
    const ratings = await Rating.aggregate([
      {
        $group: {
          _id: '$worker',
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    // Create a map of workerId -> rating data
    const ratingMap = {};
    ratings.forEach(r => {
      ratingMap[r._id.toString()] = {
        averageRating: r.averageRating.toFixed(1),
        totalRatings: r.totalRatings
      };
    });

    // Add rating data to workers
    const workersWithRatings = workers.map(worker => {
      const workerObj = worker.toObject();
      const ratingData = ratingMap[worker._id.toString()] || { averageRating: 'N/A', totalRatings: 0 };
      return {
        ...workerObj,
        averageRating: ratingData.averageRating,
        totalRatings: ratingData.totalRatings
      };
    });

    res.json(workersWithRatings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get filtered workers for drill-down functionality
router.get('/filtered', async (req, res) => {
  try {
    const { status, service, experience, limit = 50 } = req.query;
    let filter = {};

    // Apply status filter
    if (status) {
      if (status === 'pending') {
        filter.status = 'pending';
      } else if (status === 'approved') {
        filter.status = 'approved';
      } else if (status === 'active') {
        filter.status = 'active';
      }
    }

    // Apply service filter
    if (service) {
      filter.service = service;
    }

    // Apply experience filter
    if (experience) {
      filter.experience = experience;
    }

    const workers = await Worker.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Get total count for pagination info
    const totalCount = await Worker.countDocuments(filter);

    // Get ratings for each worker
    const Rating = require('../models/Rating');
    const ratings = await Rating.aggregate([
      {
        $group: {
          _id: '$worker',
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    const ratingMap = {};
    ratings.forEach(r => {
      ratingMap[r._id.toString()] = {
        averageRating: r.averageRating ? r.averageRating.toFixed(1) : 'N/A',
        totalRatings: r.totalRatings
      };
    });

    // Add rating data to workers
    const workersWithRatings = workers.map(worker => {
      const workerObj = worker.toObject();
      const ratingData = ratingMap[worker._id.toString()] || { averageRating: 'N/A', totalRatings: 0 };
      return {
        ...workerObj,
        averageRating: ratingData.averageRating,
        totalRatings: ratingData.totalRatings
      };
    });

    res.json({
      success: true,
      data: workersWithRatings,
      total: totalCount,
      filtered: workers.length,
      filters: { status, service, experience }
    });
  } catch (err) {
    console.error('❌ Filtered workers error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch filtered workers',
      error: err.message
    });
  }
});

// Update worker status
router.patch('/:id', async (req, res) => {
  try {
    const worker = await Worker.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(worker);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update worker photo
router.patch('/:id/photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No photo uploaded' });
    }

    const photoUrl = `/uploads/worker-photos/${req.file.filename}`;
    const worker = await Worker.findByIdAndUpdate(
      req.params.id,
      { photo: photoUrl },
      { new: true }
    );
    
    res.json({ success: true, message: 'Photo updated!', photo: photoUrl, worker });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update worker earnings (admin only)
router.patch('/:id/earnings', async (req, res) => {
  try {
    const { amount, type } = req.body; // type: 'add', 'deduct', 'payout'
    const worker = await Worker.findById(req.params.id);
    
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    if (type === 'add') {
      worker.total_earnings += amount;
      worker.pending_balance += amount;
    } else if (type === 'deduct') {
      worker.pending_balance -= amount;
    } else if (type === 'payout') {
      worker.paid_balance += worker.pending_balance;
      worker.pending_balance = 0;
    }

    await worker.save();
    res.json({ success: true, message: 'Earnings updated!', worker });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get worker by ID with detailed info
router.get('/:id', async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }
    
    // Get ratings for this worker
    const Rating = require('../models/Rating');
    const ratings = await Rating.find({ worker: req.params.id }).sort({ createdAt: -1 });
    const averageRating = ratings.length > 0 
      ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
      : 'N/A';
    
    res.json({
      ...worker.toObject(),
      ratings,
      averageRating,
      totalRatings: ratings.length
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;