const mongoose = require('mongoose');
const DiningMonth = require('./models/DiningMonth');
const DiningDay = require('./models/DiningDay');

require('dotenv').config();

async function fixDiningDays() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the active dining month
    const diningMonth = await DiningMonth.findOne({ isActive: true });
    if (!diningMonth) {
      console.log('No active dining month found');
      await mongoose.disconnect();
      return;
    }

    console.log('Found active dining month:', diningMonth._id);

    // Delete all dining days for this month
    await DiningDay.deleteMany({ diningMonth: diningMonth._id });
    console.log('Deleted all dining days');

    // Get the start date from the dining month
    const startDate = new Date(diningMonth.startDate);
    startDate.setUTCHours(0, 0, 0, 0);

    // Get today's date
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));

    // Create fresh 30 dining days
    const newDiningDays = [];
    for (let i = 0; i < 30; i++) {
      const dayDate = new Date(startDate);
      dayDate.setUTCDate(dayDate.getUTCDate() + i);

      const diningDay = new DiningDay({
        diningMonth: diningMonth._id,
        dayNumber: i + 1,
        date: dayDate,
        isPast: dayDate < todayUTC
      });

      await diningDay.save();
      newDiningDays.push(diningDay._id);
    }

    // Update the dining month's endDate
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 29);
    diningMonth.endDate = endDate;
    diningMonth.diningDays = newDiningDays;
    await diningMonth.save();

    console.log('Created 30 fresh dining days');
    console.log('Start date:', startDate.toISOString().split('T')[0]);
    console.log('End date:', endDate.toISOString().split('T')[0]);

    await mongoose.disconnect();
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error.message);
    await mongoose.disconnect();
  }
}

fixDiningDays();
