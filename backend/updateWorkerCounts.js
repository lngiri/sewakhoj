const mongoose = require('mongoose');
require('dotenv').config();

const Worker = require('./models/Worker');
const Service = require('./models/Service');

async function updateWorkerCounts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get all services
    const services = await Service.find({});
    console.log(`📊 Found ${services.length} services`);

    // For each service, count confirmed workers
    for (const service of services) {
      const confirmedWorkerCount = await Worker.countDocuments({
        service: service.name,
        status: 'confirmed'
      });
      
      const pendingWorkerCount = await Worker.countDocuments({
        service: service.name,
        status: 'pending'
      });

      // Update the service with the correct count
      await Service.findByIdAndUpdate(
        service._id,
        { workerCount: confirmedWorkerCount }
      );

      console.log(`✅ Service "${service.name}": ${confirmedWorkerCount} confirmed workers, ${pendingWorkerCount} pending workers`);
    }

    // Also count total workers per service (all statuses except cancelled/rejected)
    const allServices = await Service.find({});
    console.log('\n📋 Final worker counts per service:');
    for (const service of allServices) {
      const totalWorkers = await Worker.countDocuments({
        service: service.name,
        status: { $in: ['pending', 'confirmed'] }
      });
      console.log(`   ${service.icon} ${service.name}: ${service.workerCount} confirmed, ${totalWorkers} total active workers`);
    }

    console.log('\n🎉 Worker counts updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating worker counts:', error);
    process.exit(1);
  }
}

// Run the function
updateWorkerCounts();