const express = require('express');
const router = express.Router();
const Worker = require('../models/Worker');

// Save new worker registration
router.post('/', async (req, res) => {
  try {
    const worker = new Worker(req.body);
    await worker.save();
    res.json({ success: true, message: 'Worker registered!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all workers
router.get('/', async (req, res) => {
  try {
    const workers = await Worker.find().sort({ createdAt: -1 });
    res.json(workers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update worker status
router.patch('/:id', async (req, res) => {
  try {
    const worker = await Worker.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json(worker);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;