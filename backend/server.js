const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: ['https://sewakhoj.com', 'https://www.sewakhoj.com', 'http://localhost:5500', 'http://127.0.0.1:5500'],
  methods: ['GET', 'POST', 'PATCH'],
  credentials: true
}));
app.use(express.json());

// Routes
const bookingRoutes = require('./routes/bookings');
const workerRoutes = require('./routes/workers');
const adminRoutes = require('./routes/admin');
const ratingRoutes = require('./routes/ratings');
app.use('/api/bookings', bookingRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ratings', ratingRoutes);
// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected!'))
  .catch(err => console.log('❌ MongoDB Error:', err));

// Start server
const PORT = process.env.PORT || 5000;
// Keep alive ping
setInterval(() => {
  console.log('🔄 Keep alive ping...');
}, 840000); // ping every 14 minutes
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});