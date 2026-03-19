const DiningMonth = require('../models/DiningMonth');
const DiningDay = require('../models/DiningDay');

// Get Dining Month Calendar
const getDiningMonthCalendar = async (req, res) => {
  try {
    const managerId = req.managerId;

    const diningMonth = await DiningMonth.findOne({
      manager: managerId,
      isActive: true
    });

    if (!diningMonth) {
      return res.status(400).json({ message: 'No active dining month' });
    }

    // Get today's date in UTC
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));

    // Query actual dining days from database
    const actualDiningDays = await DiningDay.find({
      diningMonth: diningMonth._id
    }).sort({ date: 1 });

    let pastDaysCount = 0;
    const calendarDays = [];
    const breakDates = []; // Track break dates from diningMonth.breakDays array

    // Process actual dining days from database
    actualDiningDays.forEach((diningDay) => {
      const dateObj = new Date(diningDay.date);
      dateObj.setUTCHours(0, 0, 0, 0);
      
      const isPast = dateObj < today;
      if (isPast) pastDaysCount++;

      calendarDays.push({
        day: diningDay.dayNumber,
        date: dateObj,
        isPast,
        isBreak: false
      });
    });

    // Add break dates from diningMonth.breakDays array
    diningMonth.breakDays.forEach(bd => {
      const bdDate = new Date(bd.date);
      bdDate.setUTCHours(0, 0, 0, 0);
      breakDates.push({
        date: bdDate,
        reason: bd.reason || 'Break'
      });
    });

    const remainingDaysCount = Math.max(0, 30 - pastDaysCount);

    res.json({
      diningMonth,
      calendarDays,
      breakDates,
      stats: {
        pastDaysCount,
        remainingDaysCount,
        totalDays: 30
      }
    });
    
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add Multiple Break Dates
const addBreakDates = async (req, res) => {
  const session = await DiningMonth.startSession();
  session.startTransaction();

  try {
    const managerId = req.managerId;
    const { dates, reason } = req.body;

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ message: 'Dates array is required' });
    }

    const diningMonth = await DiningMonth.findOne({
      manager: managerId,
      isActive: true
    }).session(session);

    if (!diningMonth) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'No active dining month' });
    }

    // VALIDATION PHASE: Check all dates before making any changes
    const datesToProcess = [];
    const breakDatesSet = new Set();

    for (const dateStr of dates) {
      const [year, month, day] = dateStr.split('-').map(Number);
      const breakDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

      // Check if it's already a break
      const existingBreakDay = diningMonth.breakDays.some(bd => {
        const bdDate = new Date(bd.date);
        return bdDate.getUTCFullYear() === breakDate.getUTCFullYear() &&
               bdDate.getUTCMonth() === breakDate.getUTCMonth() &&
               bdDate.getUTCDate() === breakDate.getUTCDate();
      });

      if (existingBreakDay) {
        await session.abortTransaction();
        return res.status(400).json({ message: `Date ${dateStr} is already marked as a break` });
      }

      // Check if dining day exists for this date
      const diningDayExists = await DiningDay.findOne({
        diningMonth: diningMonth._id,
        date: {
          $gte: breakDate,
          $lt: new Date(breakDate.getTime() + 24 * 60 * 60 * 1000)
        }
      }).session(session);

      if (!diningDayExists) {
        await session.abortTransaction();
        return res.status(400).json({ message: `Date ${dateStr} is not a dining day` });
      }

      datesToProcess.push(breakDate);
      breakDatesSet.add(breakDate.toISOString().split('T')[0]);
    }

    // EXECUTION PHASE: All validations passed, now apply changes

    // Step 1: Add breakdays to breakDays array
    const breakReason = reason && reason.trim() ? reason.trim() : 'Break day';
    datesToProcess.forEach(date => {
      diningMonth.breakDays.push({
        date: date,
        reason: breakReason
      });
    });

    // Step 2: Retrieve current dining days separately
    const currentDiningDays = await DiningDay.find({
      diningMonth: diningMonth._id
    }).sort({ date: 1 }).session(session);

    // Step 3: Create list of dates excluding break dates
    const availableDates = [];
    currentDiningDays.forEach(day => {
      const dateStr = new Date(day.date).toISOString().split('T')[0];
      if (!breakDatesSet.has(dateStr)) {
        availableDates.push(new Date(day.date));
      }
    });

    // Step 4: Extend dates until we have 30 days (skipping break dates)
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));

    if (availableDates.length < 30) {
      let lastDate = availableDates.length > 0 
        ? new Date(availableDates[availableDates.length - 1])
        : new Date(diningMonth.startDate);

      while (availableDates.length < 30) {
        lastDate.setUTCDate(lastDate.getUTCDate() + 1);
        const nextDate = new Date(lastDate);

        // Check if this date is a break day
        const isBreakDate = diningMonth.breakDays.some(bd => {
          const bdDate = new Date(bd.date);
          return bdDate.getUTCFullYear() === nextDate.getUTCFullYear() &&
                 bdDate.getUTCMonth() === nextDate.getUTCMonth() &&
                 bdDate.getUTCDate() === nextDate.getUTCDate();
        });

        // Only add if not a break day
        if (!isBreakDate) {
          availableDates.push(new Date(nextDate));
        }
      }
    }

    // Step 5: Assign dates to each day number 1-30
    try {
      for (let i = 0; i < Math.min(30, currentDiningDays.length); i++) {
        await DiningDay.findByIdAndUpdate(
          currentDiningDays[i]._id,
          {
            dayNumber: i + 1,
            date: availableDates[i],
            isPast: availableDates[i] < todayUTC
          },
          { session }
        );
      }
    } catch (error) {
      console.error('Error updating dining days:', error);
      await session.abortTransaction();
      throw error;
    }

    // Update diningMonth's endDate
    diningMonth.endDate = availableDates[Math.min(29, availableDates.length - 1)];

    try {
      await diningMonth.save({ session });
    } catch (error) {
      console.error('Error saving dining month:', error);
      await session.abortTransaction();
      throw error;
    }

    // All operations succeeded, commit transaction
    await session.commitTransaction();
    res.json({ message: 'Break dates added', diningMonth });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// Remove Multiple Break Dates
const removeBreakDates = async (req, res) => {
  const session = await DiningMonth.startSession();
  session.startTransaction();

  try {
    const managerId = req.managerId;
    const { dates } = req.body;

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Dates array is required' });
    }

    const diningMonth = await DiningMonth.findOne({
      manager: managerId,
      isActive: true
    }).session(session);

    if (!diningMonth) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'No active dining month' });
    }

    // VALIDATION PHASE: Check all dates before making any changes
    const datesToProcess = [];
    const breakDayIndices = [];

    for (const dateStr of dates) {
      const [year, month, day] = dateStr.split('-').map(Number);
      const breakDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

      // Check if it's a break day in the array
      const breakDayIndex = diningMonth.breakDays.findIndex(bd => {
        const bdDate = new Date(bd.date);
        return bdDate.getUTCFullYear() === breakDate.getUTCFullYear() &&
               bdDate.getUTCMonth() === breakDate.getUTCMonth() &&
               bdDate.getUTCDate() === breakDate.getUTCDate();
      });

      if (breakDayIndex === -1) {
        await session.abortTransaction();
        return res.status(400).json({ message: `Date ${dateStr} is not marked as a break` });
      }

      datesToProcess.push(breakDate);
      breakDayIndices.push(breakDayIndex);
    }

    // EXECUTION PHASE: All validations passed, now apply changes

    // Step 1: Delete the days from breakDays in diningMonth
    breakDayIndices.sort((a, b) => b - a);
    breakDayIndices.forEach(index => {
      diningMonth.breakDays.splice(index, 1);
    });

    // Step 2: Retrieve current dining days
    const currentDiningDays = await DiningDay.find({
      diningMonth: diningMonth._id
    }).sort({ date: 1 }).session(session);

    // Step 3: Merge the to-be-removed-from-break-days with current dining days
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));

    // Create array of all dates (current + to-be-removed breaks)
    const allDates = [];

    // Add current dining day dates
    currentDiningDays.forEach(day => {
      allDates.push(new Date(day.date));
    });

    // Add dates to be removed from breaks
    datesToProcess.forEach(date => {
      allDates.push(new Date(date));
    });

    // Step 4: Sort dates
    allDates.sort((a, b) => a - b);

    // Step 5: Keep only first 30 days
    const finalDates = allDates.slice(0, 30);

    // Step 6: Modify the dining day dates according to the new dates
    try {
      for (let i = 0; i < currentDiningDays.length; i++) {
        if (i < finalDates.length) {
          await DiningDay.findByIdAndUpdate(
            currentDiningDays[i]._id,
            {
              dayNumber: i + 1,
              date: finalDates[i],
              isPast: finalDates[i] < todayUTC
            },
            { session }
          );
        }
      }
    } catch (error) {
      console.error('Error updating dining days:', error);
      await session.abortTransaction();
      throw error;
    }

    // Update diningMonth's references
    diningMonth.diningDays = currentDiningDays.map(d => d._id);

    // Update endDate
    if (finalDates.length > 0) {
      diningMonth.endDate = finalDates[finalDates.length - 1];
    }

    try {
      await diningMonth.save({ session });
    } catch (error) {
      console.error('Error saving dining month:', error);
      await session.abortTransaction();
      throw error;
    }

    // All operations succeeded, commit transaction
    await session.commitTransaction();
    res.json({ message: 'Break dates removed', diningMonth });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

module.exports = {
  getDiningMonthCalendar,
  addBreakDates,
  removeBreakDates
};
