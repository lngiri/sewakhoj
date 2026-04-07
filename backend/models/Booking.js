const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, default: '' },
  service: { type: String, required: true },
  address: { type: String, required: true },
  preferred_date: { type: String, required: true },
  preferred_time: { type: String, default: '' },
  message: { type: String },
  status: { type: String, default: 'pending' },
  assignedWorker: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);