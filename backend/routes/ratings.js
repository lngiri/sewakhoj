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

// Get filtered ratings for drill-down functionality
router.get('/filtered', async (req, res) => {
  try {
    const { minRating, maxRating, workerId, dateFrom, dateTo, limit = 50 } = req.query;
    let filter = {};

    // Apply rating range filter
    if (minRating || maxRating) {
      filter.rating = {};
      if (minRating) {
        filter.rating.$gte = parseFloat(minRating);
      }
      if (maxRating) {
        filter.rating.$lte = parseFloat(maxRating);
      }
    }

    // Apply worker filter
    if (workerId) {
      filter.worker = workerId;
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

    const ratings = await Rating.find(filter)
      .populate('worker', 'full_name service area')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Get total count for pagination info
    const totalCount = await Rating.countDocuments(filter);

    // Calculate average rating for the filtered set
    const averageRating = ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: ratings,
      total: totalCount,
      filtered: ratings.length,
      averageRating: parseFloat(averageRating),
      filters: { minRating, maxRating, workerId, dateFrom, dateTo }
    });
  } catch (err) {
    console.error('❌ Filtered ratings error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch filtered ratings',
      error: err.message
    });
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