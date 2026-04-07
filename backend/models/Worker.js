const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  phone: { type: String, required: true },
  password: { type: String },
  service: { type: String, required: true },
  area: { type: String, required: true },
  experience: { type: String },
  photo: { type: String, default: '' }, // URL to uploaded photo
  total_earnings: { type: Number, default: 0 }, // Total earnings in rupees
  commission_rate: { type: Number, default: 20 }, // Commission percentage (default 20%)
  pending_balance: { type: Number, default: 0 }, // Balance awaiting payout
  paid_balance: { type: Number, default: 0 }, // Total paid out
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Worker', workerSchema);