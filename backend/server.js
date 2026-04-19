const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: ['https://sewakhoj.com', 'https://www.sewakhoj.com', 'http://localhost:5500', 'http://127.0.0.1:5500'],
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const bookingRoutes = require('./routes/bookings');
const workerRoutes = require('./routes/workers');
const adminRoutes = require('./routes/admin');
const ratingRoutes = require('./routes/ratings');
const serviceRoutes = require('./routes/services');
app.use('/api/bookings', bookingRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/services', serviceRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected!'))
  .catch(err => console.log('❌ MongoDB Error:', err));

// Import WebSocket server
const WebSocketServer = require('./websocket');

// Create HTTP server
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize WebSocket server
const wss = new WebSocketServer(server);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected!');
    
    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔌 WebSocket server ready at ws://localhost:${PORT}`);
    });
    
    // Keep alive ping
    setInterval(() => {
      console.log('🔄 Keep alive ping...');
    }, 840000); // ping every 14 minutes
  })
  .catch(err => console.log('❌ MongoDB Error:', err));