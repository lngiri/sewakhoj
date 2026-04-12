const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const jwt = require('jsonwebtoken');

// Admin authentication middleware (same as admin.js)
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

// GET all services (public - for frontend display)
router.get('/', async (req, res) => {
  try {
    const services = await Service.find({ is_active: true })
      .sort({ display_order: 1, createdAt: 1 });
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET all services with admin auth (includes inactive)
router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const services = await Service.find()
      .sort({ display_order: 1, createdAt: 1 });
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET single service
router.get('/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json(service);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// CREATE new service (admin only)
router.post('/', adminAuth, async (req, res) => {
  try {
    const { name, description, icon, price, display_order, is_active } = req.body;
    
    if (!name || !description || !icon) {
      return res.status(400).json({ message: 'Name, description, and icon are required' });
    }
    
    const newService = new Service({
      name,
      description,
      icon,
      price: price || '',
      display_order: display_order || 0,
      is_active: is_active !== undefined ? is_active : true
    });
    
    await newService.save();
    res.status(201).json({ 
      success: true, 
      message: 'Service created successfully',
      service: newService 
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// UPDATE service (admin only)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { name, description, icon, price, display_order, is_active } = req.body;
    
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    // Update fields
    if (name !== undefined) service.name = name;
    if (description !== undefined) service.description = description;
    if (icon !== undefined) service.icon = icon;
    if (price !== undefined) service.price = price;
    if (display_order !== undefined) service.display_order = display_order;
    if (is_active !== undefined) service.is_active = is_active;
    
    service.updatedAt = Date.now();
    
    await service.save();
    res.json({ 
      success: true, 
      message: 'Service updated successfully',
      service 
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE service (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    // Instead of hard delete, we can soft delete by marking as inactive
    // Or we can check if service is being used in bookings/workers before deleting
    
    // Check if service is being used
    const Booking = require('../models/Booking');
    const Worker = require('../models/Worker');
    
    const bookingCount = await Booking.countDocuments({ service: service.name });
    const workerCount = await Worker.countDocuments({ service: service.name });
    
    if (bookingCount > 0 || workerCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete service. It is being used in bookings or worker registrations.',
        bookingCount,
        workerCount
      });
    }
    
    // Hard delete
    await Service.findByIdAndDelete(req.params.id);
    
    res.json({ 
      success: true, 
      message: 'Service deleted successfully',
      deletedService: service 
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;