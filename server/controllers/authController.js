const jwt = require('jsonwebtoken');
const Manager = require('../models/Manager');
const DiningMonth = require('../models/DiningMonth');
const DiningDay = require('../models/DiningDay');

// Register Manager
const registerManager = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    let manager = await Manager.findOne({ email });
    if (manager) {
      return res.status(400).json({ message: 'Manager already exists' });
    }

    manager = new Manager({ name, email, password, phone });
    await manager.save();

    const token = jwt.sign({ id: manager._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, manager: { id: manager._id, name, email } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login Manager
const loginManager = async (req, res) => {
  try {
    const { email, password } = req.body;

    const manager = await Manager.findOne({ email });
    if (!manager) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await manager.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: manager._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, manager: { id: manager._id, name: manager.name, email: manager.email } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Manager Dashboard
const getDashboard = async (req, res) => {
  try {
    const managerId = req.managerId;
    const manager = await Manager.findById(managerId);

    let activeDiningMonth = await DiningMonth.findOne({
      manager: managerId,
      isActive: true
    });

    if (!activeDiningMonth) {
      return res.json({
        manager,
        activeDiningMonth: null,
        nextDayInfo: null,
        calendarDays: [],
        breakDates: []
      });
    }

    // Get today's date in UTC
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));

    // Query actual dining days from database
    const actualDiningDays = await DiningDay.find({
      diningMonth: activeDiningMonth._id
    }).sort({ date: 1 });

    // Find next dining day from actualDiningDays
    const nextDayData = actualDiningDays.find(day => {
      const dayDate = new Date(day.date);
      dayDate.setUTCHours(0, 0, 0, 0);
      return dayDate > todayUTC;
    });

    console.log(nextDayData);

    // Populate students if nextDayData exists24    
    if (nextDayData) {
      await nextDayData.populate('students.student');
    }

    const nextDayNo = nextDayData.dayNumber;
    const nextDayDate = nextDayData.date;
    const nextDayBorderCount = nextDayData ? nextDayData.students.length : 0;

    // Calculate current day number
    const startDate = new Date(activeDiningMonth.startDate);
    startDate.setUTCHours(0, 0, 0, 0);
    const dayNumber = Math.floor((todayUTC - startDate) / (1000 * 60 * 60 * 24)) + 1;

    // Build calendar from actual database documents
    let pastDaysCount = 0;
    const calendarDays = [];
    const breakDates = [];

    // Process actual dining days from database
    actualDiningDays.forEach((diningDay) => {
      const dateObj = new Date(diningDay.date);
      dateObj.setUTCHours(0, 0, 0, 0);
      
      const isPast = dateObj < todayUTC;
      if (isPast) pastDaysCount++;

      calendarDays.push({
        day: diningDay.dayNumber,
        date: dateObj,
        isPast,
        isBreak: false,
        borderCount: diningDay.students.length
      });
    });

    // Add break dates from diningMonth.breakDays array
    activeDiningMonth.breakDays.forEach(bd => {
      const bdDate = new Date(bd.date);
      bdDate.setUTCHours(0, 0, 0, 0);
      breakDates.push({
        date: bdDate,
        reason: bd.reason || 'Break'
      });
    });

    const remainingDaysCount = Math.max(0, 30 - actualDiningDays.length - pastDaysCount);

    res.json({
      manager,
      activeDiningMonth,
      nextDayInfo: {
        nextDayNo,
        date: nextDayDate,
        borderCount: nextDayBorderCount
      },
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

// Start Dining Month
const startDiningMonth = async (req, res) => {
  try {
    const managerId = req.managerId;
    const { startDate } = req.body;

    // Deactivate previous month
    await DiningMonth.updateMany(
      { manager: managerId, isActive: true },
      { isActive: false }
    );

    // Parse the date string correctly (YYYY-MM-DD format from date input) as UTC
    const [year, month, day] = startDate.split('-').map(Number);
    const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 29);

    const diningMonth = new DiningMonth({
      manager: managerId,
      startDate: start,
      endDate: end,
      dayCount: 30
    });

    await diningMonth.save();

    // Create dining days
    for (let i = 1; i <= 30; i++) {
      const dayDate = new Date(start);
      dayDate.setUTCDate(dayDate.getUTCDate() + i - 1);

      const diningDay = new DiningDay({
        diningMonth: diningMonth._id,
        dayNumber: i,
        date: dayDate,
        isPast: dayDate < new Date()
      });

      await diningDay.save();
      diningMonth.diningDays.push(diningDay._id);
    }

    await diningMonth.save();
    res.status(201).json({ message: 'Dining month started', diningMonth });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerManager,
  loginManager,
  getDashboard,
  startDiningMonth
};
