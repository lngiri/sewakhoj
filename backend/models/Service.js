const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true }, // Emoji or icon code
  price: { type: String, default: '' }, // e.g., "From Rs. 500/visit"
  display_order: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  workerCount: { type: Number, default: 0 }, // Number of active workers in this service
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
serviceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Service', serviceSchema);