const DiningMonth = require('../models/DiningMonth');
const DiningDay = require('../models/DiningDay');
const Student = require('../models/Student');

// Search Student
const searchStudent = async (req, res) => {
  try {
    const { studentId } = req.query;
    const managerId = req.managerId;

    const diningMonth = await DiningMonth.findOne({
      manager: managerId,
      isActive: true
    });

    if (!diningMonth) {
      return res.status(400).json({ message: 'No active dining month' });
    }

    // Get dining days
    const calendarDays = await DiningDay.find({ diningMonth: diningMonth._id }).sort({ date: 1 });

    // Format break days for calendar from diningMonth.breakDays array
    const breakDates = diningMonth.breakDays.map(bd => ({
      date: bd.date,
      reason: bd.reason || 'Break'
    }));

    let student = await Student.findOne({
      manager: managerId,
      diningMonth: diningMonth._id,
      id: studentId
    }).populate('selectedDays.day');

    if (!student) {
      // Student not found, return calendar for new entry
      return res.json({
        exists: false,
        calendarDays,
        breakDates,
        diningMonth
      });
    }

    // Student exists
    const selectedDaysCount = student.selectedDays.length;
    const returnedDaysCount = (student.returnedDays || []).length;
    const totalDaysUsed = selectedDaysCount + returnedDaysCount;
    
    // Check if daily feast quota is paid or student has 30 days
    const dailyFeastQuotaPaid = student.dailyFeastQuotaPaid || totalDaysUsed >= 30;

    res.json({
      exists: true,
      student: {
        id: student.id,
        name: student.name,
        phone: student.phone,
        roomNo: student.roomNo,
        selectedDaysCount,
        returnedDaysCount,
        dailyFeastQuotaPaid,
        transactions: student.transactions,
        feastpaid: student.feastpaid,
        returnCount: student.returnCount || 0
      },
      studentData: student,
      calendarDays,
      breakDates,
      diningMonth
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Calendar for Adjustment
const getCalendarForAdjustment = async (req, res) => {
  try {
    const managerId = req.managerId;

    const diningMonth = await DiningMonth.findOne({
      manager: managerId,
      isActive: true
    });

    if (!diningMonth) {
      return res.status(400).json({ message: 'No active dining month' });
    }

    const calendarDays = await DiningDay.find({ diningMonth: diningMonth._id });

    res.json({
      calendarDays,
      diningMonth
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Adjust Student Dining Days
const adjustStudentDays = async (req, res) => {
  const session = await DiningMonth.startSession();
  session.startTransaction();

  try {
    const managerId = req.managerId;
    const { studentId, name, phone, roomNo, selectedDays, paidAmount } = req.body;

    // Validate required fields
    if (!studentId || !studentId.trim()) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Student ID is required' });
    }

    if (!name || !name.trim()) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Student name is required' });
    }

    if (!phone || !phone.trim()) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Phone number is required' });
    }

    if (!roomNo || !roomNo.trim()) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Room number is required' });
    }

    const diningMonth = await DiningMonth.findOne({
      manager: managerId,
      isActive: true
    }).session(session);

    if (!diningMonth) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'No active dining month' });
    }

    // Validate selectedDays has dayId
    if (!selectedDays || !Array.isArray(selectedDays) || selectedDays.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'At least one dining day must be selected' });
    }

    let student = await Student.findOne({
      manager: managerId,
      diningMonth: diningMonth._id,
      id: studentId
    }).session(session);

    if (!student) {
      // Create new student
      student = new Student({
        manager: managerId,
        diningMonth: diningMonth._id,
        id: studentId,
        name: name.trim(),
        phone: phone.trim(),
        roomNo: roomNo.trim(),
        selectedDays: selectedDays.map(day => ({
          day: day.dayId
        })),
        transactions: []
      });
    } else {
      // Check if any selected days are in returnedDays (cannot re-purchase)
      const returnedDayIds = (student.returnedDays || []).map(id => id.toString());
      const attemptedReturnedDays = selectedDays.filter(day => 
        returnedDayIds.includes(day.dayId.toString())
      );

      if (attemptedReturnedDays.length > 0) {
        await session.abortTransaction();
        return res.status(400).json({
          message: 'Cannot re-purchase days that have been returned.',
          restrictedDays: attemptedReturnedDays.map(d => d.dayId)
        });
      }

      // Update existing student - append new days to existing days
      if (name) student.name = name.trim();
      if (phone) student.phone = phone.trim();
      if (roomNo) student.roomNo = roomNo.trim();
      
      // Get existing day IDs
      const existingDayIds = student.selectedDays.map(d => d.day.toString());
      const newDayIds = selectedDays.map(day => day.dayId);
      
      // Combine existing and new days (remove duplicates)
      const allDayIds = new Set([...existingDayIds, ...newDayIds]);
      student.selectedDays = Array.from(allDayIds).map(dayId => ({
        day: dayId
      }));
    }

    // Add student to DiningDay documents for selected days
    const selectedDayIds = selectedDays.map(day => day.dayId);
    await DiningDay.updateMany(
      { _id: { $in: selectedDayIds } },
      { $addToSet: { students: { student: student._id } } },
      { session }
    );

    // Calculate payable amount (80 TK per day) and add transaction
    const newDaysCount = selectedDays.length;
    const payableAmount = newDaysCount * 80;

    student.transactions.push({
      date: new Date(),
      days: newDaysCount,
      amount: payableAmount,
      type: 'Payment',
      paidAmount: paidAmount || 0
    });

    // Check if student has reached 30 days
    const totalDaysUsed = student.selectedDays.length + (student.returnedDays || []).length;
    if (totalDaysUsed >= 30) {
      student.dailyFeastQuotaPaid = true;
    }

    await student.save({ session });

    await session.commitTransaction();
    res.json({ message: 'Student updated', student });
  } catch (error) {
    console.error('Error adjusting student days:', error);
    await session.endSession();
    res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// Return Token - Remove selected days from student
const returnToken = async (req, res) => {
  try {
    const managerId = req.managerId;
    const { studentId, datesToRemove, refundedAmount } = req.body;

    if (!datesToRemove || !Array.isArray(datesToRemove) || datesToRemove.length === 0) {
      return res.status(400).json({ message: 'datesToRemove must be a non-empty array' });
    }

    const diningMonth = await DiningMonth.findOne({
      manager: managerId,
      isActive: true
    });

    if (!diningMonth) {
      return res.status(400).json({ message: 'No active dining month' });
    }

    const student = await Student.findOne({
      manager: managerId,
      diningMonth: diningMonth._id,
      id: studentId
    }).populate('selectedDays.day');

    if (!student) {
      return res.status(400).json({ message: 'Student not found' });
    }

    // Check if student has reached maximum return count
    const currentReturnCount = student.returnCount || 0;
    const maxReturns = 10;
    const remainingReturns = maxReturns - currentReturnCount;

    if (currentReturnCount >= maxReturns) {
      return res.status(400).json({
        message: `Cannot return tokens. Maximum return limit (${maxReturns}) has been reached.`,
        returnCount: currentReturnCount,
        remainingReturns: 0
      });
    }

    // Check minimum return quota
    const daysRequested = datesToRemove.length;
    const minReturnDays = 3;

    if (daysRequested < minReturnDays) {
      return res.status(400).json({
        message: `Minimum ${minReturnDays} days required to return. You selected ${daysRequested} day(s).`,
        returnCount: currentReturnCount,
        remainingReturns,
        minReturnDays
      });
    }

    // Only allow up to the remaining return limit
    if (daysRequested > remainingReturns) {
      return res.status(400).json({
        message: `Cannot return ${daysRequested} days. Only ${remainingReturns} day(s) remaining in quota.`,
        returnCount: currentReturnCount,
        remainingReturns,
        maxReturns
      });
    }

    // Parse dates to remove
    const datesToRemoveSet = new Set(datesToRemove.map(d => {
      const date = new Date(d);
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    }));

    // Get DiningDay IDs to remove from student
    const diningDayIdsToRemove = [];
    const selectedDaysToKeep = [];

    student.selectedDays.forEach(selectedDay => {
      const dayDate = new Date(selectedDay.day.date);
      const dayDateStr = `${dayDate.getUTCFullYear()}-${String(dayDate.getUTCMonth() + 1).padStart(2, '0')}-${String(dayDate.getUTCDate()).padStart(2, '0')}`;

      if (datesToRemoveSet.has(dayDateStr)) {
        diningDayIdsToRemove.push(selectedDay.day._id);
      } else {
        selectedDaysToKeep.push(selectedDay);
      }
    });

    // Update student - remove selected days
    student.selectedDays = selectedDaysToKeep;

    // Add returned day IDs to returnedDays array to prevent re-purchase
    student.returnedDays = student.returnedDays || [];
    diningDayIdsToRemove.forEach(dayId => {
      if (!student.returnedDays.includes(dayId)) {
        student.returnedDays.push(dayId);
      }
    });

    // Add refund transaction
    const refundDays = diningDayIdsToRemove.length;
    const refundAmount = refundedAmount || (refundDays * 35); // Use provided refundedAmount or default to 35 TK per day

    student.transactions.push({
      date: new Date(),
      days: -refundDays,
      amount: -refundAmount,
      type: 'Refund',
      paidAmount: -refundAmount
    });

    // Increment return count by number of days returned
    student.returnCount = currentReturnCount + refundDays;

    // Check if student has reached 30 days
    const totalDaysUsed = student.selectedDays.length + (student.returnedDays || []).length;
    if (totalDaysUsed >= 30) {
      student.dailyFeastQuotaPaid = true;
    }

    await student.save();

    // Remove student ID from the DiningDay documents
    await DiningDay.updateMany(
      { _id: { $in: diningDayIdsToRemove } },
      { $pull: { students: { student: student._id } } }
    );

    const updatedRemainingReturns = maxReturns - student.returnCount;
    const notice = updatedRemainingReturns === 0 
      ? `Token returned successfully. Student has reached maximum return limit (${maxReturns} returns).`
      : `Token returned successfully. ${updatedRemainingReturns} return(s) remaining out of ${maxReturns}.`;

    res.json({
      message: notice,
      student,
      returnInfo: {
        returnCount: student.returnCount,
        remainingReturns: updatedRemainingReturns,
        maxReturns
      }
    });
  } catch (error) {
    console.error('Error returning token:', error);
    res.status(500).json({ message: error.message });
  }
};

// Pay Feast Due
const payFeastDue = async (req, res) => {
  try {
    const managerId = req.managerId;
    const { studentId } = req.body;

    const diningMonth = await DiningMonth.findOne({
      manager: managerId,
      isActive: true
    });

    if (!diningMonth) {
      return res.status(400).json({ message: 'No active dining month' });
    }

    let student = await Student.findOne({
      manager: managerId,
      diningMonth: diningMonth._id,
      id: studentId
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Add feast transaction
    student.transactions.push({
      date: new Date(),
      days: 0,
      amount: 100,
      type: 'Feast',
      paidAmount: 100
    });

    // Mark feast as paid
    student.feastpaid = true;

    await student.save();

    // Increment feastSubscribers count in DiningMonth
    await DiningMonth.updateOne(
      { _id: diningMonth._id },
      { $inc: { feastSubscribers: 1 } }
    );

    res.json({ message: 'Feast paid successfully', student });
  } catch (error) {
    console.error('Error paying feast due:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get All Students with Summary
const getAllStudents = async (req, res) => {
  try {
    const managerId = req.managerId;

    const diningMonth = await DiningMonth.findOne({
      manager: managerId,
      isActive: true
    });

    if (!diningMonth) {
      return res.status(400).json({ message: 'No active dining month' });
    }

    const students = await Student.find({
      manager: managerId,
      diningMonth: diningMonth._id
    }).populate('selectedDays.day');

    const studentsSummary = students.map(student => {
      // Calculate totals from transactions
      const totalDays = student.transactions.reduce((sum, t) => sum + Math.abs(t.days), 0);
      const totalAmount = student.transactions.reduce((sum, t) => sum + t.amount, 0);
      const totalPaid = student.transactions.reduce((sum, t) => sum + t.paidAmount, 0);
      const dueAmount = totalAmount - totalPaid;
      const returnedDaysCount = (student.returnedDays || []).length;
      const selectedDaysCount = student.selectedDays.length;
      const totalDaysUsed = selectedDaysCount + returnedDaysCount;
      
      // Check if daily feast quota is paid or student has 30 days
      const dailyFeastQuotaPaid = student.dailyFeastQuotaPaid || totalDaysUsed >= 30;

      return {
        id: student.id,
        name: student.name,
        phone: student.phone,
        roomNo: student.roomNo,
        selectedDaysCount,
        returnedDaysCount,
        totalDays,
        totalAmount,
        totalPaid,
        dueAmount,
        transactions: student.transactions,
        feastpaid: student.feastpaid,
        dailyFeastQuotaPaid,
        _id: student._id
      };
    });

    res.json({
      students: studentsSummary,
      diningMonth
    });
  } catch (error) {
    console.error('Error fetching all students:', error);
    res.status(500).json({ message: error.message });
  }
};

// Clear Payment Due / Refund Due
const clearPaymentDue = async (req, res) => {
  try {
    const managerId = req.managerId;
    const { studentId } = req.body;

    const diningMonth = await DiningMonth.findOne({
      manager: managerId,
      isActive: true
    });

    if (!diningMonth) {
      return res.status(400).json({ message: 'No active dining month' });
    }

    const student = await Student.findOne({
      manager: managerId,
      diningMonth: diningMonth._id,
      id: studentId
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Calculate current due amount
    const totalAmount = student.transactions.reduce((sum, t) => sum + t.amount, 0);
    const totalPaid = student.transactions.reduce((sum, t) => sum + t.paidAmount, 0);
    const dueAmount = totalAmount - totalPaid;

    if (dueAmount === 0) {
      return res.status(400).json({ message: 'No payment or refund due to clear' });
    }

    // Add transaction to clear the due
    // If dueAmount is positive (payment due), paidAmount should be positive to clear it
    // If dueAmount is negative (refund due), paidAmount should be negative to clear it
    student.transactions.push({
      date: new Date(),
      days: 0,
      amount: 0,
      type: dueAmount > 0 ? 'Payment' : 'Refund',
      paidAmount: dueAmount
    });

    await student.save();

    res.json({ message: 'Payment due cleared successfully', student });
  } catch (error) {
    console.error('Error clearing payment due:', error);
    res.status(500).json({ message: error.message });
  }
};

// Pay Daily Feast Quota
const payDailyFeastQuota = async (req, res) => {
  try {
    const managerId = req.managerId;
    const { studentId } = req.body;

    const diningMonth = await DiningMonth.findOne({
      manager: managerId,
      isActive: true
    });

    if (!diningMonth) {
      return res.status(400).json({ message: 'No active dining month' });
    }

    const student = await Student.findOne({
      manager: managerId,
      diningMonth: diningMonth._id,
      id: studentId
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Calculate daily feast quota due
    const selectedDaysCount = student.selectedDays.length;
    const returnedDaysCount = (student.returnedDays || []).length;
    const totalDaysUsed = selectedDaysCount + returnedDaysCount;
    const remainingDays = 30 - totalDaysUsed;
    const quotaDue = remainingDays > 0 ? remainingDays * 10 : 0;

    if (quotaDue === 0) {
      return res.status(400).json({ message: 'No daily feast quota due' });
    }

    // Add transaction for daily feast quota
    student.transactions.push({
      date: new Date(),
      days: 0,
      amount: quotaDue,
      type: 'Daily Feast Quota',
      paidAmount: quotaDue
    });

    // Set dailyFeastQuotaPaid to true
    student.dailyFeastQuotaPaid = true;

    await student.save();

    res.json({ message: 'Daily feast quota payment processed successfully', student });
  } catch (error) {
    console.error('Error paying daily feast quota:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get All Transactions
const getAllTransactions = async (req, res) => {
  try {
    const managerId = req.managerId;

    const diningMonth = await DiningMonth.findOne({
      manager: managerId,
      isActive: true
    });

    if (!diningMonth) {
      return res.json({ message: 'No active dining month', data: [] });
    }

    // Get all students for the active dining month
    const students = await Student.find({
      manager: managerId,
      diningMonth: diningMonth._id
    });

    // Flatten all transactions with student ID
    const allTransactions = [];
    students.forEach(student => {
      if (student.transactions && student.transactions.length > 0) {
        student.transactions.forEach(transaction => {
          allTransactions.push({
            studentId: student.id,
            date: transaction.date,
            days: transaction.days,
            amount: transaction.amount,
            type: transaction.type,
            paidAmount: transaction.paidAmount
          });
        });
      }
    });

    // Sort by date descending
    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(allTransactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  searchStudent,
  getCalendarForAdjustment,
  adjustStudentDays,
  returnToken,
  payFeastDue,
  clearPaymentDue,
  payDailyFeastQuota,
  getAllStudents,
  getAllTransactions
};
