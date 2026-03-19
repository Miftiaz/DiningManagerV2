const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Manager', required: true },
  diningMonth: { type: mongoose.Schema.Types.ObjectId, ref: 'DiningMonth', required: true },
  id: { type: String, required: true }, // Student ID
  name: { type: String, required: true },
  phone: { type: String, required: true },
  roomNo: { type: String, required: true },
  selectedDays: [
    {
      day: { type: mongoose.Schema.Types.ObjectId, ref: 'DiningDay' }
    }
  ],
  transactions: [
    {
      date: { type: Date, default: Date.now },
      days: { type: Number, required: true },
      amount: { type: Number, required: true },
      type: { type: String, enum: ['Payment', 'Refund', 'Feast', 'Daily Feast Quota'], required: true },
      paidAmount: { type: Number, default: 0 }
    }
  ],
  feastpaid: { type: Boolean, default: false },
  dailyFeastQuotaPaid: { type: Boolean, default: false },
  returnCount: { type: Number, default: 0 },
  returnedDays: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DiningDay'
    }
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Student', studentSchema);
