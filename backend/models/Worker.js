const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  phone: { type: String, required: true },
  password: { type: String },
  service: { type: String, required: true },
  area: { type: String, required: true },
  experience: { type: String },
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Worker', workerSchema);