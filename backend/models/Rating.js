const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  worker: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  customer_name: { type: String, required: true },
  stars: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Rating', ratingSchema);