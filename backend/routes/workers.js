const express = require('express');
const router = express.Router();
const Worker = require('../models/Worker');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register new worker
router.post('/', async (req, res) => {
  try {
    const worker = new Worker(req.body);
    await worker.save();
    res.json({ success: true, message: 'Worker registered!' });
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
    const isMatch = await bcrypt.compare(password, worker.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Wrong password!' });
    const token = jwt.sign({ id: worker._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, worker: { id: worker._id, full_name: worker.full_name, service: worker.service, area: worker.area } });
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

// Set worker password (called by admin)
router.patch('/:id/password', async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    worker.password = req.body.password;
    await worker.save();
    res.json({ success: true, message: 'Password set!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;