const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Booking = require('../models/Booking');
const Worker = require('../models/Worker');

// ─── Admin Login ───────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS
  ) {
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
    return res.json({ success: true, token });
  }
  res.status(401).json({ success: false, message: 'Wrong username or password!' });
});

// ─── Auth middleware (protects all routes below) ───────────────
function adminAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: 'No token' });
  try {
    jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// ─── Dashboard stats ───────────────────────────────────────────
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const [totalBookings, pendingBookings, completedBookings, totalWorkers, pendingWorkers] =
      await Promise.all([
        Booking.countDocuments(),
        Booking.countDocuments({ status: 'pending' }),
        Booking.countDocuments({ status: 'completed' }),
        Worker.countDocuments(),
        Worker.countDocuments({ status: 'pending' }),
      ]);
    res.json({ totalBookings, pendingBookings, completedBookings, totalWorkers, pendingWorkers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Update booking status ─────────────────────────────────────
router.patch('/bookings/:id', adminAuth, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;