const express = require('express');
const router = express.Router();
const Rating = require('../models/Rating');

// Submit a rating
router.post('/', async (req, res) => {
  try {
    const rating = new Rating(req.body);
    await rating.save();
    res.json({ success: true, message: 'Rating submitted!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all ratings
router.get('/', async (req, res) => {
  try {
    const ratings = await Rating.find()
      .populate('worker', 'full_name service area')
      .sort({ createdAt: -1 });
    res.json(ratings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get ratings for specific worker
router.get('/worker/:workerId', async (req, res) => {
  try {
    const ratings = await Rating.find({ worker: req.params.workerId })
      .sort({ createdAt: -1 });
    res.json(ratings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;