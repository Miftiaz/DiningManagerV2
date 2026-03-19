const mongoose = require('mongoose');

const diningMonthSchema = new mongoose.Schema({
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Manager', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  dayCount: { type: Number, default: 30 },
  diningDays: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DiningDay' }],
  breakDays: [{
    date: { type: Date, required: true },
    reason: { type: String, default: 'Break day' }
  }],
  feastSubscribers: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DiningMonth', diningMonthSchema);
