const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  phone: { type: String, required: true },
  service: { type: String, required: true },
  address: { type: String, required: true },
  preferred_date: { type: String, required: true },
  message: { type: String },
  status: { type: String, default: 'pending' },
  assignedWorker: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);