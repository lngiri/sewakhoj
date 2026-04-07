const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Worker = require('../models/Worker');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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