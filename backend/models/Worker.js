const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const workerSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String },
  service: { type: String, required: true },
  area: { type: String, required: true },
  experience: { type: String },
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
workerSchema.pre('save', async function(next) {
  if(!this.isModified('password')) return next();
  if(this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

module.exports = mongoose.model('Worker', workerSchema);